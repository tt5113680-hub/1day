# G1-W∞-95 — Employee 客户跟进队列 `/e/nurture` 全标对 Meituan 商家端 PARITY densify

- **status:** PASS (not product-owner sign-off)
- **branch:** `hardening/COMMERCIAL-COMPLETION`
- **date:** 2026-08-12
- **task:** `G1-R-EMPLOYEE-NURTURE-PARITY`（W∞-40+ visual/IA full Meituan parity densify 的下一未闭合切片）

## 背景 / 动机

四端 W∞ 主面波（Management MPC W45~91 + Employee ME-02/03 详情 + 消费者 MH5 + 平台渠道商圈）已全部收束 full-parity 视觉层级（topBar + heroCard + summaryStrip + distribution + honest）。
W89 四端关断守卫通过的员工主面覆盖 workbench/tasks/customers/store/memberships/notifications/profile/leads，但 **`/e/nurture`（客户跟进队列）仍是全仓最后一块残留旧 `.header` + `.Card` chrome 的员工面**——只有「推广员工具 · 客户跟进」文案与旧 Card 列表，没有 modern 的 topBar sticky 黄顶栏 / heroCard / summaryStrip / distribution / honest 三层级，导致员工四端完整对标留最后一面 PARTIAL。

本刀把 `/e/nurture` 收束到与 `/e/workbench`、`/e/tasks`、`/e/memberships` 等一致的员工面 full-parity 视觉语言，补齐员工面最后一块 PARITY 空洞。

## 变更

### `apps/employee-web/app/e/nurture/nurture-workbench.tsx`

- 移除旧 `.header`（顶栏无层级承载）与 `@oneday/ui` 的 `Card`/`StatusBadge` 页面级 chrome，改挂 **sticky 黄顶栏 `topBar`**（`推广员工具 · 客户跟进` 居中标题 + 右上 `刷新` `topBarRefresh` 按钮），页面主 `<main className={styles.page}>` 改灰底画布 `#f5f5f5` + `data-testid="employee-nurture"`。
- 新增白卡 **heroCard** `aria-label="客户跟进队列概览"`（h1 `把下一次触达变成今天的行动` + 诚实描述）。
- 新增白卡概况条 **summaryStrip** `aria-label="客户跟进队列概况"`（黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)` + `rgb(255 209 0 / 35%)`，4 列 `repeat(4)`，≤580px 两列）——4 项全部由真实 `profiles[]` 档案行现场推导：队列客户 `profiles.length` / 持续跟进 `active` / 回访机会 `repurchase` / 沉睡唤醒 `dormant`。
- 新增白卡分布面板 **distribution** `aria-label="客户跟进队列分布"`（灰底白卡 + 黄渐变色条 `linear-gradient(90deg,#ffd100,#f0a500)`，`barWidth(total,value)`）——全部由真实 `profiles[]` 现场推导：
  - 分层分布 `countBy(profiles.map(p => labels[p.segment]))`
  - 待办负载分布 `workloadLabel(p.openTasks)` `无待办/少量待办/多待办`
  - 触达安排分布 `p.nextTouchAt ? '已排程触达' : '待排程'`
  - 触达窗口分布 `windowLabel(p.nextTouchAt)` `尚未排程/已逾期/今日触达/近一周/一周后`
  - 多待办负载 `overloaded`＝`openTasks > 2` 计数
- 保留全部既有交互与状态：`客户分层` 筛选、每条记录 `调整分层` 下拉 / `记录触达`（POST /touchpoints）/ `安排跟进`（POST /touchpoints createTask）/ 刷新、loading/forbidden/error 三态 + 重新加载、empty 空态、`AppStatePanel`/`Button`、幂等发送 `idempotency-key`。
- 新增 honest 底注（source=local、分布全部由已抓取客户分层档案行现场推导、只做跟进作业编排、不代履约美团/抖音订单、非本平台下单、不含第三方订单履约与支付金额）；heroCard 诚实描述含 `不碰销售成交、不含支付金额与第三方订单结果状态断言`。
- 文案/身份约束全保留：`推广员工具 · 客户跟进`、`客户跟进队列未能完成加载。`、`回访机会`；无 `经营`、无 `复购机会/把下一次复购`、无 `ONEDAY /` 眉标前缀、无 `本平台下单请/去支付/完成支付/发起支付`。

### `apps/employee-web/app/e/nurture/nurture-workbench.module.css`

- 移除旧 `.header + h1 ~28px` 视觉与页面级变体，重建 `.topBar`（sticky 黄 `linear-gradient(180deg,#ffe14d,#ffd100)`）/`.topBarRefresh`/`.heroCard`/`.panel`/`.panelHead`/`.panelMeta`/`.summaryStrip`（黄边浅黄底 4 列）/`.distribution`/`.panelBlock`/`.bars`/`.barRow`/`.barTrack`/`.barFill`/`.barValue`/`.barLabel`/`.barEmpty`/`.honest`，`page` 底色 `#f5f5f5`，与员工面 full-parity 序列（workbench/store/memberships/notifications/profile/leads）完全一致。
- 层级标签 `.segmentBadge[data-segment=active/repurchase/dormant]` 用 od token（color-mix）呈现分层 chip（替代旧 `.active/.repurchase/.dormant` 三套独立类，行为/色相不变）。

无 schema/DB/API，不复活 consumer_orders / 本平台下单收单。

## 验证

- 新 `tests/g1-winf95-employee-nurture-parity.test.mjs` **4/4**（W95 topBar/heroCard/灰底、summaryStrip/distribution 真实数据与禁止假 BI、诚实边界 + 原交互 + 三态、工具身份 + 无本平台收单 /ONEDAY 眉标）。
- 随动回归：`g1-winf17-workbench-commerce.test.mjs`（nurture 文案断言）+ `g1-winf28-tool-residual-ops-copy.test.mjs`（nurture `客户跟进队列未能完成加载` + 无 `经营`）通过。
- `g1-winf*.test.mjs`：**345/345**（上刀 341 + 新 4）。
- `pnpm typecheck`：**20/20**（employee-web `tsc --noEmit` PASS）。
- `pnpm build`：**20/20**（employee-web 含 `/e/nurture` 16 路由，`next build` PASS）。
- 单测 `vitest run`：**47 passed + 2 pre-existing 失败照旧**（`tokens.vitest.ts` + `storefront-renderer.vitest.ts`；本刀纯 UI 变更，与 design-token/storefront 无关）。
- `npm run evidence:check`：**74/74**。
- 变更 TS/测试/CSS `eslint` + `prettier` clean。

诚实边界：**工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时。** 四端完整对标仍以 inventory `PARITY` 为商用前提，员工面 `/e/nurture` 已补齐。
