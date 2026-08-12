# G1-W∞-99 — 六端工作台真实数据经营深度 densify（工作台产品深度，全标对）

- **status:** PASS (not product-owner sign-off)
- **date:** 2026-08-12
- **tests:** `tests/g1-winf99-workbench-product-depth.test.mjs` 3/3

## Summary

承接 `WORKBENCH_PRODUCT_DEPTH_PLAN.md` 波次 W∞-99，把各端工作台从「导航 + 计数 + 分布条」收束到 charter §3/§4 定义的 **早会/盯店/代理 habit 数据** 与 **可操作队列**（真实 DB/API 可查，禁止假 BI；不碰钱、非本平台下单）。

### Management `/m`
- **共享组件** 新增 `apps/management-web/app/m/management-early-meeting-kpi.tsx`（`ManagementDeepPageNav` 工作台/经营日报/订单痕迹/评价/通知 互链 + `ManagementEarlyMeetingKpiStrip` `aria-label="早会经营信号（与工作台同源）"` + `ManagementEarlyMeetingKpi` 深页自治版）；工作台与深页（analytics/orders/reviews/notifications）复用条 A 固定口径（无 GMV），深页另有 pageNote 诚实说明。
- **API** `management-dashboard.service.ts` 新增：`consultsToday`（`consumer_action_events`+`consumer_action_redirect_events` 今日）、`openLeads`/`leadsToday`（`employee_lead_pool_entries`）、`enrollmentsToday`（`membership_enrollments`）、`redemptionsToday`（`member_benefit_ledger` redeem）、`entryVisitsToday`（`entry_funnel_events` visit/view/consult_click）、`activeWorkflows`（`workflow_instances`）、`taskCompletionRateToday`（今日完成/(完成+待办)）、`storeBreakdown`（每门店 30 日入口 + 待办，真实 `stores`/`tasks` 推导）、`queues.consults`（真实 `consumer_action_events` 行，deepLink→/m/entry-funnel）、`queues.leads`（真实 `employee_lead_pool_entries` open/claimed 行，deepLink→/e/leads）。
- **UI** `page.tsx` 工作台 `早会经营信号` 改由共享 `ManagementEarlyMeetingKpiStrip` 承接（含 门店对比 summaryStrip+分面 + 咨询/线索队列白卡队列 deepLink 可处置 + 经营信号分布/门店对比分布）；honest 底注 source=local、不含支付金额与第三方订单履约、近30日服务档案为本地试点、非本平台下单。`/m/orders|reviews|notifications|analytics` 已入常用功能宫格。

### Employee `/e`
- **共享组件** 新增 `apps/employee-web/app/e/employee-workbench-kpi.tsx`（`EmployeeDeepPageNav` 工作台/分享/跟进/线索/核销 互链 + `EmployeeWorkbenchKpiStrip` `aria-label="今日作业 KPI（与工作台同源）"` + `EmployeeWorkbenchKpi` 深页自治版）；工作台全部待办/已逾期/线索池/已认领线索/活跃分享码/分享打开/今日核销 KPI 统一。
- **API** `employee-workbench.service.ts` 新增 `activeShareCodes`、`queues`。
- **UI** `workbench.tsx` 首页改由共享 `EmployeeWorkbenchKpiStrip` 承接 今日作业 KPI（同源工作台）；常用功能宫格新增 分享推广 →`/e/share`、客户跟进 →`/e/nurture`；`lead-queue-title` 线索队列 / `share-queue-title` 分享队列 + 线索分布/分享分布（`stats.shareOpensToday`/`stats.redemptionsToday` 真实，禁止假 BI）；移除未用 `overdueCount` 保持 lint clean。

### Platform `/p` · Channel `/ch` · Circle `/bc`
- `platform-dashboard.service.ts` 新增 `provisioningRuns`（真实 provisioning 行，含 `request_slug`/`state`/`error_code`，deepLink 可 drill-down）+ `Outbox 死信` 队列；`channel-dashboard.service.ts` 新增 `queues.renewal`（`renewalSignal` 跟进信号队列）+ onboarding 队列；`circle-dashboard.service.ts` 新增 `queues.trafficWithoutConversion`（流量未转化队列）。
- `page.tsx` 三端仪表新增 开通 Run 队列 / Outbox 死信 / 流量未转化队列 drill-down 面板。

## Verification

- `tests/g1-winf99-workbench-product-depth.test.mjs` 3/3（强制断言之实现均在真实现，`doesNotMatch` 防假 BI/mockMetrics/Math.random）
- 共享组件收束触发 stale 测试对齐：`g1-winf89` analytics 概况条 label `今日经营概况`→`入口痕迹日报（L0–L2）`；`g1-winf78` 员工工作台 `summaryStrip`→共享 `EmployeeWorkbenchKpiStrip`
- `g1-winf*.test.mjs` 369/369（含 W97/W98/W99）
- `pnpm test:unit` 49/49
- `pnpm typecheck` 20/20、`pnpm build` 20/20
- 变更工作台/深页源码 eslint + prettier clean（`overdueCount` 未用变量已移除）

诚实边界：全部分布/队列由 dashboard 真实 DB 档案行现场推导（source=local），仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额与第三方订单履约，非本平台下单，不代履约美团/抖音订单。工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`，不宣称已接美团实时。
