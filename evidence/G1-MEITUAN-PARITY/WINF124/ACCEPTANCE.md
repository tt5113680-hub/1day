# G1-W∞-124 ACCEPTANCE — 多端同步 SLO 可测护栏（发布/权限变更 ≤60s 收敛可测）

- recorded_at: 2026-08-14 Asia/Shanghai
- task: `G1-W∞-124` / `W∞-SAAS-SYNC`（Phase3 §6 / §7，toward PARITY）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §6「同步：发布/权限变更 ≤60s 收敛可测」+ §7 `W∞-124 多端 sync SLO 可测护栏`（Phase3 NEXT）
- spec: `MULTI_TERMINAL_SYNC_SPEC.md` §8 可观测性（projection/subscription lag、outbox pending age、五端 trace）与 §10 验收 SLO（Storefront/content publish ≤10s p95 / 60s max；Tenant suspension / permission UI convergence ≤60s）
- matrix: SY-02「五端 trace + event lag metrics」
- executor: DeepSeek / Plan B（OpenCode）
- claim_boundary: 工程 PASS；非主人 UI 签验；禁止假 BI；无 GMV；无储值/支付；不碰钱/销售/管店；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单

## Delivered

把多端同步从「有同步基建但不可观测」推进到「**可测 SLO 护栏**」，让 60 秒发布/权限收敛成为可复核的工程事实，全部由真实 DB 档案行现场推导（禁止假 BI）。

### 1. 后端 SLO 观测服务（只读、真实数据）
- 新增 `apps/api/src/sync-slo.service.ts`（`SyncSloService`）：
  - `topics[]`：对 8 类同步主题（operating/storefront/content/membership/lifecycle/rbac/channel/circle）从 `sync_notifications` 取**最新一条投影的订阅滞后**（`now() - max(occurred_at)` 秒），每主题给 `label`/`projectedAt`/`lagSeconds`/`withinSlo`，并回填最近投影事件类型（`eventType`/`aggregateType`/`aggregateId`）作五端 trace。
  - `pendingOutbox`：租户内未投递 `outbox_events`（pending/needs_attention）条数与最旧一条等待秒数（`oldestAgeSeconds`）。
  - `events24h`：近 24h 已投影到 `sync_notifications` 的事件数（跨端可观测 trace 规模）。
  - `guardrail`：`{ maxSloSeconds: 60, within60s }` —— 当任一主题投影滞后或待投递等待超过 60s 时判定违约；无相关变更时无传播滞后可测、视为健康（诚实口径：没有事件就不编造滞后）。
  - 只读、`tenant.manage` fail-closed、仅查询既有表（零 schema/migration）。
- 新增 `apps/api/src/management-sync-slo.controller.ts`（`ManagementSyncSloController`）：`GET /api/v1/management/sync-slo`（`auth.require(..., 'tenant.manage')` + `x-request-id` 校验）。

### 2. 注册
- `apps/api/src/app.module.ts`：注册 `ManagementSyncSloController` + `SyncSloService`。

### 3. 前端观测卡片
- `apps/management-web/app/m/settings/page.tsx`：新增「多端同步 SLO · 60 秒收敛护栏」面板（`data-testid="sync-slo-panel"`，镜像既有会话安全卡片骨架）：概况条（护栏判定 ≤60s/>60s、已测主题、待投递、待投递最旧秒）+ 各端主题投影滞后 bar 列表（`data-testid="sync-slo-topics"`，按 `maxSloSeconds` 归一 barWidth，`达标/超时/暂无投影` 徽标）+ 诚实底注（`source=local`、`不接美团/抖音实时`、`不含支付金额/销售成交`、`非本平台下单`）。复用既有 `.panel/.summaryStrip/.bars/.barFill/.honest` CSS，零新 CSS。

诚实边界全保留（护栏只观测推广员工具租户内同步投递状态；不接美团/抖音实时、不含支付金额/销售成交、非本平台下单；无 GMV）。

## Evidence commands

- `pnpm --filter @oneday/api typecheck` / `pnpm --filter @oneday/management-web typecheck`；`pnpm typecheck` → **20/20**
- `pnpm --filter @oneday/api build`（boot dist 含新 controller/service）；`pnpm --filter @oneday/management-web build`（含 `/m/settings`）；`pnpm build` → **20/20**
- `pnpm test:unit` → **49/49**；`pnpm evidence:check` → **74/74**
- 变更文件 eslint（0 errors）+ prettier clean
- `node --test tests/g1-winf124-sync-slo-guardrail.test.mjs` → **2/2**
  - 静态：service（`SYNC_SLO_MAX_SECONDS`/`guardrail`/`within60s`/`lagSeconds`/`pendingOutbox`）+ controller（`@Get()`/`auth.require`/`tenant.manage`）+ app.module（两件注册）+ settings 卡片（`多端同步 SLO`/`60 秒收敛护栏`/`sync-slo`/`source=local`/`不接美团/抖音实时`/`非本平台下单`）
  - 真实 DB round-trip：provision 租户 → 将 onboarding `storefront.published.v1` 经 `createSyncNotificationHandler` dispatcher 投影 → `GET /management/sync-slo` 200，`guardrail.maxSloSeconds==60`，`storefront` topic `withinSlo==true` 且 `lagSeconds<=60`；再插入一条 120s 前 `membership` 主题投影行 → 该主题 `withinSlo==false`/`lagSeconds>60`、全局 `guardrail.within60s==false`（>60s 违约被真实观测到）；未授权请求 `401` fail-closed
- 回退回归：`node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → 串行 **446/446**（原 444 + 本刀新增 2，无回归）

## Honest boundaries

多端同步 SLO 只衡量推广员工具租户内「事件→投影→各端读取」的收敛滞后，60s 护栏由真实 `sync_notifications`/`outbox_events` 档案行现场推导；仅观测同步投递状态，不接美团/抖音实时、不含支付金额/销售成交、不代表第三方履约、非本平台下单、无 GMV；`/m/workflows` 维持 CUSTOM；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单。

Not owner sign-off（`PRODUCT_OWNER_UI_ACCEPTANCE.md` 由主人签署）。
