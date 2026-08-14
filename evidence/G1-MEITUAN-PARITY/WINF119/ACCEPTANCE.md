# G1-W∞-119 ACCEPTANCE — suspend 会话即时失效（W∞-SAAS-LIFE）

- recorded_at: 2026-08-14 Asia/Shanghai
- task: `G1-R-SAAS-LIFE` / W∞-119
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase3（§6 多租户 SaaS 补到最强 — 生命周期 suspend/resume 会话即时失效）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单

## Delivered

把「suspend 会话即时失效」从「依赖批量 revoke + 状态 join」推进到 **会话代数（auth_epoch）唯一真源加固**：租户一旦被暂停，其**所有已签发访问令牌即时永久失效**（fail-closed），无需等待重新认证或 TTL 过期；恢复后旧令牌依旧不可复活。

三层保障（本刀加固为第 3 层）：

1. **既有**：每次请求 `claims()` 里 join `tenants.status='active'`；
2. **既有**：suspend 事务内把该租户全部 `active` 会话置为 `revoked`；
3. **新增（本刀）**：每个 `auth_sessions` 行记录签发那一刻的 `tenants.auth_epoch` 快照；`claims()`/`refresh()` 额外强制 `s.auth_epoch = t.auth_epoch`。suspend bump `auth_epoch` ⇒ 任何旧代数令牌瞬间失效（即使未被 revoke UPDATE 命中）；reactivate 后新会话快照新代数，旧令牌永久死亡。

### 1. 迁移 `072_auth_session_epoch`
- `auth_sessions.auth_epoch int not null default 0`（会话签发时的租户会话代数快照）
- `auth_sessions_tenant_auth_epoch_idx`（tenant_id, auth_epoch）

### 2. `auth.service.ts` 会话代数闭环
- `createSession()`：插入前同池读取 `tenants.auth_epoch`，落库 `auth_sessions.auth_epoch`，并在返回 payload 暴露 `authEpoch`（登录/刷新响应均带）
- `claims()`：校验 SQL 增 `s.auth_epoch = t.auth_epoch` —— 旧代数令牌硬拒
- `refresh()`：会话 SELECT 增两列并校验 `s.auth_epoch = t.auth_epoch`，避免旧代数 refresh 旋转出新会话；旋转后由 `createSession` 重新快照当前代数

### 3. 会话安全观测（只读，禁止假 BI）
- `GET /api/v1/management/session-security`（`tenant.manage` fail-closed + `x-request-id`）：`{status, suspended, authEpoch, activeSessions, sessionsByEpoch[], recentRevocations}` 全部由真实会话/租户档案行现场推导
- `/m/settings` 新增「会话安全 · 即时失效」白卡：会话代数/当前状态/在册会话/近 1 天已关断 + 存量会话代数分布 + 诚实底注（source=local、暂停即吊销全部在册会话并使存量访问令牌永久失效、只控制租户内工具访问授权、不碰钱/销售、非本平台下单、不接美团/抖音实时）

## Evidence commands

- `node --test tests/g1-winf119-suspend-session-invalidation.test.mjs` → **1/1**（真实 DB：开通独立租户 → owner 登录快照当前 `auth_epoch` 断言 `auth_sessions.auth_epoch` → 逐前读 session-security 200 suspended=false → 平台 SUSPEND 断言 `auth_epoch +1` → **已签发 accessToken 立即 401**（dashboard + session-security 两处）→ refresh 401 → active sessions=0 → 平台 ACTIVATE 断言 `auth_epoch 再 +1` → 旧令牌仍旧 401 → 重登录快照新代数且 200）
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **430/430**（原 429 + 本刀 1）
- `pnpm typecheck` → 12/12（database/api/management-web 复核）；`pnpm build` → 11/11（api/management-web --force 复核）；`pnpm test:unit` → 49/49（12 文件）
- `node tests/evidence-contract.test.mjs` → 74/74；变更文件 `eslint`（0 errors）+ `prettier --write`/`--check` clean
- `pnpm db:migrate`（DATABASE_URL=oneday_v3_test）apply **072_auth_session_epoch**
- 回归：`node --test` `g1-winf118` `matrix-mg-f-partial-p0` `batch-4-clean-tenant-rehearsal` `matrix-sync-gateway` → 8/8；全仓 `tests/*.test.mjs` 的集成/e2e 失败为 clean HEAD 既有基线（hardening-001/002、sys-5-storefront-renderer、page-c-002/search、page-m-012、sys-22、sys-24、XT-02、M-01、RC-01、matrix-sync、P1-B-content、platform lifecycle/circles/templates/connectors/agent-ops 等），经 `git stash` 干净基线对照完全一致，与本刀无涉

## Honest boundaries

- 会话加固只控制「租户内工具访问授权是否即时关断/放开」
- 不碰钱/销售/管店、无 GMV、不含支付金额、非本平台下单、不接美团/抖音实时
- `/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders / 本平台下单 / 收单

## Next

- **W∞-120** Outbox 重放 + 告警（Phase3 SaaS，§6 W∞-SAAS-OUTBOX）

- Not owner sign-off — 工程对标断言，不等于 `PRODUCT_OWNER_UI_ACCEPTANCE.md` 已签。
