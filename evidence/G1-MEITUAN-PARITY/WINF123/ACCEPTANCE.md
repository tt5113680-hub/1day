# G1-W∞-123 ACCEPTANCE — 渠道/商圈运营队列与 scope 最强化

- recorded_at: 2026-08-14 Asia/Shanghai
- task: `G1-R-CHANNEL-CIRCLE-SCOPE-DEPTH` / W∞-123（Phase3 §6 `W∞-SAAS-SCOPE`，toward PARITY）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §6「数据 scope：管理端门店切换器 + 跨店拒绝可观测」+ §7 `W∞-123 渠道/商圈运营队列与 scope 最强化`（Phase3 NEXT）
- executor: DeepSeek / Plan B
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；不碰钱/销售/管店；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单

## Delivered

把**平台面渠道/商圈的 network data scope 从「部分封装」推进到 fail-closed + 可观测**（打通 `data_scopes` ↔ 渠道/商圈档案），并给渠道/商圈运营队列补上「渠道关注队列」，全部由真实档案行现场推导（禁止假 BI）。

### 1. 商圈列出 scope 最强化（关闭缺口）
- `PlatformBusinessCircleService.list(context, circleIds = null)`：新增 `circleIds: string[] | null` 范围参数，scoped 时 `where ... and c.id = any($2::uuid[])`（镜像 `platform-channel.service.list` 既有写法），使商圈档案严格按调用方网络范围过滤。
- `PlatformBusinessCircleController.list`：从 `requirePlatform` 升级为 `requirePlatformAny(['platform.read','platform.manage','circle.read','circle.manage'])` + `networkListIds(context.tenantId, context.userId, 'circle', permissionCodes)` 解析范围并传入 service —— **此前商圈 GET 未按 scope 过滤（越权可见全部商圈），本刀关闭**。

### 2. 渠道/商圈运营队列 scope 可观测
- `ChannelDashboardController` / `CircleDashboardController`：在 overview 响应 `data` 上挂 `scope` 块 `{ type:'channel'|'circle', restricted:boolean, count:number }`，由已计算的 `networkListIds(...)` 现场推导——**有效数据范围（全域/限定 N 个）显式可观测**，配合 fail-closed 过滤即「跨渠道/跨商圈拒绝可观测」：限定范围的账号看到的就是其 scope 内档案，越权请求在前置过滤即被拒绝。

### 3. 渠道关注队列最强化
- `ChannelDashboardService.overview`：新增合并的**渠道关注队列** `queues.attention`（开通待办 invited/onboarding ∪ 跟进信号 renewalSignal），按高风险优先排序、截 10 条，每条含 `channelName`/`onboardingStatus`/`renewalSignal`/`plan`/`riskLevel`/`deepLink`（开通中→`/ch/merchants/new?tenant=`、已开通+跟进信号→`/p/tenants/:id`），衔接已有 `queues.renewal`/`queues.onboarding`，形成统一可处置 drill-down 队列。

### 4. 前端 scope 指示器 + 关注队列
- `platform-workbench-kpi.tsx` 新增共享 `NetworkScopeChip`（`data-testid="network-scope-chip"`）：`范围 · 渠道数据访问 · N 个渠道`/`平台全域数据访问` + 诚实说明（`本账号按 data_scopes / network scope 限定查看，越权请求将被拒绝（fail-closed）`；或平台级查看全部），新增 `.scopeChip/.scopeMark/.scopeNote` CSS。
- `/ch/dashboard`：heroCard 下渲染 `NetworkScopeChip scope={data?.scope}` + 新增「渠道关注队列」面板（`渠道关注队列` + `开通待办 + 跟进信号合并 · 可 drill-down`，`attentionRow` CSS）。
- `/bc/dashboard`：heroCard 下渲染 `NetworkScopeChip scope={data?.scope}`。

诚实边界全保留（渠道/商圈是工具开通与整合网络；分布/队列全部由已抓取档案行现场推导 source=local；scope 只限定推广员工具内数据访问授权，不碰钱、不含支付/成交、不代表第三方结果；不接美团/抖音实时商户数据、非本平台下单；`/m/workflows` CUSTOM；§5 READY 未触碰）。

## Evidence commands

- `pnpm --filter @oneday/api typecheck` / `pnpm --filter @oneday/platform-web typecheck`；`pnpm typecheck` → 20/20
- `pnpm --filter @oneday/api build`（boot dist）；`pnpm --filter @oneday/platform-web build`（含 `/ch/dashboard` `/bc/dashboard`）；`pnpm build` → 20/20
- `pnpm test:unit` → 49/49；`pnpm evidence:check` → 74/74
- 变更文件 eslint（0 errors）+ prettier clean（CSS 由 eslint config 忽略属正常）
- `node --test tests/g1-winf123-channel-circle-scope-depth.test.mjs` → **3/3**（静态：circle controller `networkListIds('circle')`/service `circleIds` scope 过滤/channel `attention: attentionQueue`/ch·bc `NetworkScopeChip`；真实 DB round-trip：admin 见两圈 → circle-scoped 操作员 `GET /platform/business-circles` 仅见其 scope 圈（无泄漏）→ circle dashboard `scope{restricted:true,count:1}` 且 circles=[scoped] → admin circle dashboard `scope{restricted:false,count:0}` → 未授权 401）
- 回退回归 `g1-winf54/55/60/62/63` + `g1-winf102` + `sys-6-role-matrix-network` → **23/23**（既有渠道/商圈深页与 scope 矩阵不受影响）
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → 串行 **444/444**（含本刀新增 3）

## Honest boundaries

scope 收缩与观测均为推广员工具侧数据访问授权：限定范围的账号仅查看其 `data_scopes`/network scope 内档案，越权请求 fail-closed 拒绝；只影响工具内是否可读渠道/商圈档案，不碰钱、不含支付金额/销售成交、不代表第三方结果、不接美团/抖音实时商户数据、非本平台下单、无 GMV；`/m/workflows` 维持 CUSTOM；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单。

Not owner sign-off（`PRODUCT_OWNER_UI_ACCEPTANCE.md` 由主人签署）。
