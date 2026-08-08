# ONEDAY V3 Hardening 完成后独立最终复审报告

| 项           | 内容                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| 审计角色     | 独立商业上线审计员（只审查 / 验证 / 给结论）                                                           |
| 审计对象     | `D:\ONEDAY_V3`                                                                                         |
| 审计日期     | 2026-08-08                                                                                             |
| Git 分支     | `hardening/AUDIT-BATCH-7`                                                                              |
| HEAD         | `7bd0752`（`chore(state): close audit remediation stage`）                                             |
| 技术关闭提交 | `d175f64`（`fix(hardening): improve commercial journey usability`）                                    |
| 前序基线     | `PRE_RELEASE_AUDIT_REPORT.md`（HOLD @ `4b96c93`）                                                      |
| 整改关闭声明 | `PROJECT_STATE/AUDIT_REMEDIATION_CLOSEOUT.md`                                                          |
| 本轮约束     | **禁止修改业务代码、禁止重构、禁止为 PASS 调测试、禁止提交业务代码**；仅新建本报告                     |
| 工作区观察   | 存在未提交的 `next-env.d.ts`、部分 evidence PNG、`debug.log`；**不构成产品回归**，亦不纳入本轮业务结论 |

---

## A. 总判

### **PASS FOR HUMAN PILOT**

对照第一次上线前审计的全部 **P0 / P1 技术项**，本轮独立源码核验与真实进程复跑后，**未发现仍阻塞“进入人工配置真实凭据并进行受控试点验收”的技术缺陷**，亦**未发现 hardening 修复链上的回归**。

本总判含义：

- **是**：技术面已达到可进入 `HUMAN-PILOT-HANDOFF` 的门槛。
- **不是**：产品负责人已签字、客户已启用、或 `docs/PILOT_ACCEPTANCE_CHECKLIST.md` 已勾选完成。
- **仍属人类门禁**：试点清单签字、非种子凭据发放、真实授权与环境复核——这些必须由人完成，**本轮不代替产品负责人签字**。

若将“清单未签字”本身当作技术 HOLD，会把受控试点永远卡在自动化循环里；与仓库既定交接边界不一致。因此流程项 `PRE_RELEASE P0-4` 记为 **OPEN（人类门禁）**，不推翻本总判。

---

## B. 原始 P0 / P1 逐项关闭矩阵

状态定义：`CLOSED` / `PARTIAL` / `OPEN` / `REGRESSION`。

### B.1 `PRE_RELEASE_AUDIT_REPORT.md` P0

| ID   | 标题                                        | 状态                 | 独立核验摘要                                                                                                                                                                                                           |
| ---- | ------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 | Access Token 签名密钥可回落硬编码默认值     | **CLOSED**           | `runtime-config.ts` 缺 secret / 退役默认 / 生产短 secret 均 fail-closed；Compose 强制注入；`tests/h-001-auth-secret-startup.test.mjs` 本轮 2/2 PASS                                                                    |
| P0-2 | 四端 Web 无登录/刷新/登出，真人无法自助旅程 | **CLOSED**           | E/M/P 有真实 login UI + `SessionApiClient`；layout 级 `SessionGuard`/`SessionControls`；consumer 保持公开；业务页无直读 `sessionStorage`；`h-002-session-boundary` 2/2 PASS；B7 Playwright 真实登录旅程 PASS           |
| P0-3 | 消费者动作不自动建客户/来源/员工任务        | **CLOSED**           | `ConsumerOperatingOrchestrator` 在公开 action / store / service open 同事务内投影 customer → source → ownership/task 或 lead-pool；advisory lock + 幂等；`audit-batch-2-e2e` 2/2 PASS；B7 公开动作后 DB 出现 `task_id` |
| P0-4 | 人类试点交接未完成；复用种子账号即为事故    | **OPEN（人类门禁）** | `docs/PILOT_ACCEPTANCE_CHECKLIST.md` 仍全未勾选；种子 `admin@system.local` / `ChangeMe123!` 仍存在于本地 seed。文档与部署指南已禁止试点复用。**不构成技术 HOLD，但是进入客户启用前的强制人工项**                       |

### B.2 `PRE_RELEASE_AUDIT_REPORT.md` P1

| ID   | 标题                                     | 状态                   | 独立核验摘要                                                                                                                                                                  |
| ---- | ---------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1 | Worker 仅为健康检查桩，Outbox 只写不消费 | **CLOSED**             | Worker 周期调用 `OutboxDispatcher`：`FOR UPDATE SKIP LOCKED` + `event_consumptions` 幂等 + retry/`last_error`；`audit-batch-3-worker` PASS                                    |
| P1-2 | 任务提醒/逾期无调度器                    | **CLOSED**             | `TaskDispatchScheduler` 由 Worker 调度；提醒 `SKIP LOCKED`；API `process-due` 复用同一状态机；batch-3 PASS                                                                    |
| P1-3 | API 约 52 个独立 `pg.Pool`               | **CLOSED**             | `apps/api/src` 业务服务一律 `createApiPool()`；进程级单池，`DATABASE_POOL_MAX` 可配；无残留服务级 `new Pool`（除 pool 模块自身）                                              |
| P1-4 | 登录/刷新与公开写无限流                  | **CLOSED**             | `DatabaseRateLimiter` + migration 044；auth / public-write 分桶；生产默认启用；batch-4 验证 429                                                                               |
| P1-5 | 部署未强制 TLS/HTTPS                     | **CLOSED**             | 生产启动要求 `PUBLIC_BASE_URL=https`、`TLS_TERMINATED_BY_PROXY`、`TRUST_PROXY`、`RATE_LIMIT_TRUSTED_EDGE`；不完整配置 fail-closed；batch-4 PASS；`PILOT_DEPLOYMENT.md` 已写明 |
| P1-6 | 连接器仅为意图/不可当真外发              | **CLOSED（边界校准）** | 管理/平台 API `externalDelivery: not_available` / `intent_recorded_only`；UI 明确“尚未调用外部平台”；`PILOT_LIMITATIONS.md` 一致；batch-5 PASS。**不是要求实现真实外发**      |
| P1-7 | CORS 仅可选且 methods 缺 DELETE          | **CLOSED**             | 生产强制精确 CORS；methods 含 DELETE；batch-4 覆盖 DELETE preflight                                                                                                           |
| P1-8 | 浏览器验收非跨端真人业务闭环             | **CLOSED**             | AUDIT-BATCH-6/7 四端真实 Playwright：公开消费者动作 → 员工登录跟进/结果/证据 → 管理可见 → 平台登录 → 跨租户 404；本轮 B7 1/1 PASS                                             |

### B.3 `CURRENT_DEVELOPMENT_REVIEW.md` 同期 P0/P1（交叉对照）

| 审查报告 ID                        | 对应关系                                                                      | 状态                   |
| ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| Dev P0-1 经营闭环断裂              | = PRE P0-3                                                                    | **CLOSED**             |
| Dev P0-2 真人身份 / H-002 方向风险 | H-002 已按正确语义收口（consumer 公开；E/M/P 租户 slug 登录；无 system 默认） | **CLOSED**             |
| Dev P0-3 人类交接 / 种子           | = PRE P0-4                                                                    | **OPEN（人类门禁）**   |
| Dev P0-4 文档承诺与实现不一致      | 实现已闭环 + limitations 已校准 AI/连接器边界                                 | **CLOSED**             |
| Dev P1-1..P1-7                     | 对应 PRE P1-1..P1-7 / Worker·Pool·限流·TLS·CORS·连接器                        | **CLOSED**             |
| Dev P1-8 AI 确认不落地             | BATCH-5：白名单本地命令可执行，否则 `manual_required`                         | **CLOSED（受控落地）** |
| Dev P1-9 缺真人跨端旅程            | = PRE P1-8                                                                    | **CLOSED**             |
| Dev P1-10 直读 sessionStorage 双轨 | E/M/P 业务页已清零；静态合同测试覆盖                                          | **CLOSED**             |

---

## C. 本轮新发现

### P0

无。

### P1

无新增技术 P1。

> 说明：种子凭据仍可被错误地 `db:seed` 进试点库——已由清单/部署文档禁止。属 **人类操作事故面**，归入 §J 最小人工清单，不单列为新的技术 P1。

### P2（可带入受控试点，须披露并排期）

| ID     | 标题                                      | 证据                                                                                                                           |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --- | ---- |
| N-P2-1 | 平台壳首页仍为占位文案                    | `apps/platform-web/app/page.tsx` 仍写“将在后续页面任务接入”；真实能力在 `/p                                                    | /ch | /bc` |
| N-P2-2 | 平台“30 天活跃租户”SQL 运算符优先级仍可疑 | `platform-dashboard.service.ts`：`active AND … exists(tasks) OR exists(orders)` 可能把非活跃租户计入                           |
| N-P2-3 | Refresh token 哈希 pepper 仍硬编码        | `packages/auth/src/index.ts`：`oneday-refresh-token-v1`                                                                        |
| N-P2-4 | Compose/文档要求 Redis，运行时仍未使用    | 与首次审计一致；非阻断                                                                                                         |
| N-P2-5 | 无 PostgreSQL RLS；租户隔离仍靠应用 SQL   | 应用层隔离本轮复验有效，但缺纵深                                                                                               |
| N-P2-6 | 证据仍以 `bytea` 入库                     | 库体积/恢复成本                                                                                                                |
| N-P2-7 | 错误响应契约仍不统一                      | Nest 默认异常 vs 成功 envelope                                                                                                 |
| N-P2-8 | Outbox 默认 handler 为空（仅内部 ledger） | Worker “published”=内部消费记账；**经营闭环不依赖 Outbox 投影**（同步事务已完成）。对外不得把 pending→published 说成第三方送达 |
| N-P2-9 | 设计系统仍为部分接入                      | `@oneday/ui` 已用于商业文案映射（B7）；跨端视觉壳与 tokens 统一仍属 V3.1                                                       |

### P3（后续迭代）

| ID     | 标题                                                         | 证据                                                                              |
| ------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| N-P3-1 | 大量历史页级 Playwright 仍 `sessionStorage.setItem` 注 token | `tests/e2e/*` 旧 PAGE 规格；**产品路径已走真实登录**（H-002/B6/B7），属测试卫生债 |
| N-P3-2 | `TASK_QUEUE.md` 历史段落互相覆盖                             | 状态可读性下降，不影响运行时                                                      |
| N-P3-3 | Access token 仍存 sessionStorage（XSS 面）                   | 已知；同域 XSS 可窃                                                               |
| N-P3-4 | 软删 + 唯一约束、双商圈模型、分享落地覆盖等                  | 与首次审计 P2/P3 遗留一致                                                         |
| N-P3-5 | V3.1 设计债                                                  | 见 `PROJECT_STATE/V3_1_DESIGN_DEBT.md`（导航壳、内容治理、表单原语）              |

### UI/UX（试点阻塞性）

- **无阻塞当前受控试点的 UI 缺陷**（B7 已验证商业文案、390px 结果表单不遮挡、公开入口话术诚实）。
- 非阻塞视觉/设计系统债务归 V3.1，**不应因此无限扩大 V3 MVP**。

---

## D. 是否存在回归

**未发现 REGRESSION。**

本轮独立复跑全部通过：

| 验证                                             | 结果               |
| ------------------------------------------------ | ------------------ |
| `tests/h-001-auth-secret-startup.test.mjs`       | 2/2 PASS           |
| `tests/h-002-session-boundary.test.mjs`          | 2/2 PASS           |
| `tests/audit-batch-2-e2e.test.mjs`               | 2/2 PASS           |
| `tests/audit-batch-3-worker.test.mjs`            | 1/1 PASS           |
| `tests/audit-batch-4-security.test.mjs`          | 1/1 PASS           |
| `tests/audit-batch-5-ai-connector.test.mjs`      | 1/1 PASS           |
| `playwright.audit-batch-7.config.ts`             | 1/1 PASS（约 34s） |
| `pnpm typecheck`（18 packages）                  | PASS               |
| `pnpm build`（18 packages）                      | PASS               |
| `pnpm test`（仓库串行 suite + 18 package tasks） | PASS               |
| `pnpm evidence:check`                            | 74/74 PASS         |

对照首次审计与中期审查指出的断裂点（密钥回落、无登录、无经营编排、Worker 空转、多 Pool、无限流、无真人跨端），**均已关闭且本轮可复现通过**。

---

## E. 当前真实商业闭环判断

**成立（受控试点范围内）。**

已在源码与真实进程中核对的链路：

```text
消费者公开动作（显式 tenant + 可选 shareCode）
  → consumer event（幂等）
  → ConsumerOperatingOrchestrator（同事务）
      → customer
      → first source
      → ownership + employee task + reminder
         或 lead-pool（无合格归属时，不伪造指派人）
      → audit + outbox
  → 员工真实登录后跟进 / 任务结果 / 图片证据 / 完成
  → 管理端真实登录可见来源 / 任务 / 证据
  → 第二租户 / 未分配员工 API 级 404
```

关键实现锚点：

- `apps/api/src/consumer-operating-orchestrator.service.ts`
- `consumer-action.service.ts` / `consumer-store.service.ts`（含 service open 复用）
- `employee-task-detail.service.ts#recordResult`
- Playwright：`tests/e2e/audit-batch-7-commercial-ux.spec.ts`（真实浏览器，非管理员 API 串戏、非 token 注入产品路径）

边界（必须对外诚实）：

- 连接器 / 外部平台：**意图登记 ≠ 已外发**。
- AI：仅白名单本地任务命令；其余 `manual_required`。
- Outbox “published”：**内部消费记账**，不是第三方送达证明。

---

## F. 安全与生产运行判断

| 主题           | 判断                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| Auth secret    | 生产 fail-closed；退役默认拒绝                                              |
| Session        | JWT + `auth_sessions` 对账；logout 撤销；过期/吊销 401                      |
| E/M/P 会话边界 | `SessionApiClient` 统一 Bearer / refresh / 401 重试；业务页无直读 token     |
| Consumer       | 公开低摩擦；缺 tenant 拒绝；不默认 `system`；无员工式登录                   |
| Tenant / RBAC  | 跨租户拒绝；低权限 404/403 路径有验收证据                                   |
| Pool           | 每 API 进程共享有界池                                                       |
| Rate limit     | 生产强制边缘声明 + DB 防御限流                                              |
| CORS / TLS     | 生产强制精确源与 HTTPS 代理声明                                             |
| Worker 多实例  | Outbox/提醒使用 `SKIP LOCKED` + 消费去重；逾期 UPDATE 依赖行锁重评，可接受  |
| 默认测试凭据   | **不会自动进入生产**；但若操作员在试点库执行 seed，仍可能引入——必须人工禁止 |
| 迁移 / build   | 本轮 typecheck + build + 全量仓库测试通过                                   |

**结论：** 对**受控试点**的生产运行门槛已满足；不等于互联网无边界暴露或完整运维可观测性就绪（监控告警、RLS、对象存储等仍为 P2/P3）。

---

## G. 四端真人链路判断

| 端                 | 判断                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| Consumer           | 公开入口可用；本轮 B7 真实点击“记录咨询并获取口令”，并在 DB 形成经营投影 |
| Employee           | 真实 login（tenant slug + 账号密码）→ 任务结果/证据；无管理员 API 代替   |
| Management         | 真实 owner login → 客户经营轨迹可见                                      |
| Platform / channel | 真实 platform login；渠道/商圈能力此前已有 HTTP/页证据；连接器话术诚实   |

**不可接受路径检查：**

- 产品业务页：无 token 注入依赖（静态边界测试 PASS）。
- 商业闭环验收：非管理员 API 手工拼客。
- 未发现为过测而绕过正式入口的后门逻辑进入产品路径。
- 残留：旧 PAGE 级 e2e 仍注 token（测试债，N-P3-1），**不否定** H-002/B6/B7 真人路径。

---

## H. 是否建议进入 HUMAN-PILOT-HANDOFF

**建议进入。**

依据：

1. A–G 技术整改已关闭，且本轮独立复验通过。
2. `CURRENT_STATE` / `AUDIT_REMEDIATION_CLOSEOUT` 将下一动作定义为人类受控试点交接，与本审计一致。
3. `docs/PILOT_*` 包齐备；局限性文档与实现边界对齐。

**不建议：** 在清单未签字、仍使用种子凭据的情况下，对客宣称“已可生产启用”。

---

## I. 若 HOLD

不适用（本轮总判为 PASS FOR HUMAN PILOT）。

---

## J. 人工试点前必须由人完成的最小操作清单

以下为进入客户可用受控试点前的**最小人工动作**（不改代码即可执行）：

1. **选定试点环境与修订号**：记录部署 revision、迁移 revision、环境负责人、批准域名。
2. **配置真实密钥**：在密钥库设置唯一 `AUTH_TOKEN_SECRET`（≥32，非退役默认）、`DATABASE_URL`、精确 `CORS_ORIGINS`、`PUBLIC_BASE_URL=https://…`、`TLS_TERMINATED_BY_PROXY=true`、`TRUST_PROXY=true`、`RATE_LIMIT_TRUSTED_EDGE=true`、非 `development` 的 `RATE_LIMIT_NAMESPACE`、合适的 `DATABASE_POOL_MAX`。
3. **禁止种子凭据**：试点库**不要**启用 `admin@system.local` / `ChangeMe123!` / `oneday_local_only`；发放唯一管理员与员工账号。
4. **启动 Worker**：确保 Worker 与 API 同库运行，健康检查含调度摘要。
5. **按 `docs/PILOT_ACCEPTANCE_CHECKLIST.md` 逐项实操并留证**：健康检查、401/403、跨租户拒绝、消费者→任务→证据→管理可见、渠道/商圈（如在范围）、恢复克隆演练。
6. **与客户共读 `docs/PILOT_LIMITATIONS.md`**：明确 AI/连接器/外发边界，记录外部账号前置条件。
7. **产品 / 试点负责人签字**：勾选清单 PASS 或 HOLD；**本审计不代替签字**。

---

## 独立核验方法说明

- 读取：`PRE_RELEASE_AUDIT_REPORT.md`、`CURRENT_DEVELOPMENT_REVIEW.md`、`AUDIT_REMEDIATION_CLOSEOUT.md`、`V3_1_DESIGN_DEBT.md`、状态文件、`docs/PILOT_*`、H-001/H-002 与 AUDIT-BATCH-2～7 evidence。
- 源码抽查：auth fail-closed、session-client、经营编排、Worker/Outbox、pool、http-security、AI/连接器、consumer tenant 门禁、四端 login。
- 真实复跑：见 §D。
- **未修改任何业务代码**；未为通过而改测试；未提交。
- Playwright 复跑可能刷新 `evidence/AUDIT-BATCH-7/*.png` 等截图文件，属验证副作用，**不作为业务变更**。

---

## 签署栏（供人工使用）

| 角色           | 姓名             | 日期       | 结论                     |
| -------------- | ---------------- | ---------- | ------------------------ |
| 独立终审执行   | Auto（只读复审） | 2026-08-08 | **PASS FOR HUMAN PILOT** |
| 产品负责人     |                  |            |                          |
| 技术负责人     |                  |            |                          |
| 试点运营负责人 |                  |            |                          |

---

_报告结束。_
