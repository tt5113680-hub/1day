# G1-W∞-83 Management `/m/employee-process-performance` 员工表现真实数据深页 densify（MPC-10 员工/人力区，toward PARITY）

- recorded_at: 2026-08-12
- status: **PASS**
- branch: `hardening/COMMERCIAL-COMPLETION`
- product_filter: 统一入口 / 工作流 / 痕迹；不碰钱·销售·本平台下单；不复活 consumer_orders

## Context

`/m/employee-process-performance`（员工表现）是 Management MPC-10（员工/权限/人力）区最后一处仍停留在「只做了文案/眉标对齐（W∞-25/27）、未做视觉/IA 与真实数据深页 densify」的页面，与相邻密化序列（W∞-40+ / W∞-45~82）视觉语言不一致。本切片按商用对标前提把它补到「黄顶栏+灰底白卡+heroCard+概况条+分布洞察+honest 边界」完整对标。

## Delivered

- 移除页面级 `AdminPageHeader` + `Card` chrome，改挂：
  - 黄顶栏 `topBar`（`推广员工具 · 员工表现` + `刷新数据`）+ 灰底画布（`background:#f5f5f5`）
  - 白卡 `heroCard`（h1 `用任务、跟进、证据与贡献过程支持辅导` + 诚实描述：不代表个人成交额或唯一绩效结论、不接第三方实时人事/绩效）
  - 白卡概况条 `aria-label="员工概况"`（在职员工 / 有逾期信号 / 已有跟进 / 有贡献关联）
  - 白卡分布面板 `aria-label="员工表现分布"`——任务负载分布（`openTasks+overdueTasks` 分桶 无待办/轻负载/重负载）、逾期信号分布、跟进完整度分布、证据链覆盖分布、贡献关联分布，全部由**真实 `employees[]` 档案行**现场推导（`e.openTasks/e.overdueTasks/e.followUps/e.evidenceLinks/e.contributionOrders`），禁止假 BI
  - 宽度百分比 `barWidth(total, item.value)`，空数据「暂无记录」
  - honest 底注：source=local、已抓取在职员工过程档案行现场推导、订单/客户关联仅反映已确认贡献关联、不代表个人成交额或唯一绩效结论、不接第三方实时人事/绩效、不包含本平台收款、非本平台下单
- `page.module.css` 全改挂 `.topBar/.topBarTitle/.topBarRefresh/.heroCard/.panel/.summaryStrip/.panelHead/.panelMeta/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest/.rows/.empty/.centered` 灰底白卡+黄渐变色条（`linear-gradient(90deg,#ffd100,#f0a500)`），≤900px 单列堆叠（与 Management MPC 深页序列共享视觉语言）
- 保留过程视图「白卡行列表」全部真实员工指标（待办/逾期/已完成/跟进/证据/参与客户成交 + coaching 建议）与原交互；保留 loading/forbidden/error 全状态（含 `请使用具备推广员工具权限的账号。`）；新增 `data-testid="management-employee-process-performance"`
- 无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单

## Verification

- 新增 `tests/g1-winf83-management-employee-perf-deep.test.mjs` 5/5
- `g1-winf*.test.mjs` 291/291 全绿（含新增 5；前 286）
- 随动更新 g1-winf25（`employee_perf` eyebrow 断言 → topBarTitle 断言）；g1-winf27（forbidden copy）+ sys-26（menu catalog）回归通过；受影响相关门 22/22
- management-web typecheck + build PASS；`pnpm typecheck` 20/20；`pnpm build` 20/20
- 单测 47 passed（2 个 pre-existing token 失败照旧：`tokens.vitest.ts`、`storefront-renderer.vitest.ts`，与本改动无关）
- eslint + prettier clean

## Honest boundary

- 不复活 consumer_orders / 本平台下单/收单；不含支付金额、销售成交或第三方订单履约状态；不接第三方实时人事/绩效
