# G1-W∞-96 — Employee 获客分享 `/e/share` 全标对 Meituan 商家端 PARITY densify

- **status:** PASS (not product-owner sign-off)
- **branch:** `hardening/COMMERCIAL-COMPLETION`
- **date:** 2026-08-12
- **task:** `G1-R-EMPLOYEE-SHARE-PARITY`（W∞-40+ visual/IA full Meituan parity densify 的下一未闭合切片）

## 背景 / 动机

四端 W∞ 主面波（Management MPC W45~91 + Employee ME-02/03 详情 W92/93/94/95 + 消费者 MH5 + 平台渠道商圈）已全部收束 full-parity 视觉层级（topBar + heroCard + summaryStrip + distribution + honest）。
W89 四端关断守卫通过的员工主面覆盖 workbench/tasks/customers/store/memberships/notifications/profile/leads，但 **`/e/share`（获客分享码，员工工具身份入口分流·ME 分享工具面）不在守卫主面内且仍停留在旧 `.header` 眉标 + 品牌渐变 `.hero` + `@oneday/ui` `Card` 页面级 chrome**——只有「推广员工具 · 获客分享」文案与旧 Card 列表，没有 modern 的 topBar sticky 黄顶栏 / heroCard / summaryStrip / distribution / honest 三层级，是员工四端完整对标残留的最后一块工具身份面空洞。

本刀把 `/e/share` 收束到与 `/e/workbench`、`/e/tasks`、`/e/nurture` 等一致的员工面 full-parity 视觉语言，并把「分享码场景 / 状态」真实档案行落成可读分布（禁止假 BI），补齐员工分享工具面的 PARITY。

## 变更

### `apps/employee-web/app/e/share/share-codes.tsx`

- 移除旧 `.header`（眉标+无层级承载）与旧的品牌渐变 `.hero` 区 + 页面级 `@oneday/ui` `Card`/`StatusBadge`，改挂 **sticky 黄顶栏 `topBar`**（`推广员工具 · 获客分享` 标题 + 右上 `工作台` `topBarRefresh` 深链到 `/e/workbench`），页面主 `<main className={styles.page}>` 改灰底画布 `#f5f5f5` + `data-testid="employee-share"`。
- 新增白卡 **heroCard** `aria-label="分享工具概述"`（h1 `把每次触达变成可追踪的入口` + 诚实描述：痕迹进入入口漏斗、并对照看板「分享配对」、失效码被服务端拒绝、不含第三方成交结果）。
- 新增白卡概况条 **summaryStrip** `aria-label="分享数据概况"`（黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)` + `rgb(255 209 0 / 35%)`，4 列 `repeat(4)`，≤580px 两列）——4 项全部由真实 `codes[]` 档案行现场推导：分享码 `codes.length` / 员工码 `scenario==='employee'` / 活动码 `'campaign'` / 渠道码 `'channel'`。
- 新增白卡分布面板 **distribution** `aria-label="分享分布"`（灰底白卡 + 黄渐变色条 `linear-gradient(90deg,#ffd100,#f0a500)`，`barWidth(total, value)`）——全部由真实 `codes[]` 现场推导，`countBy` 频次降序：
  - 分享场景分布：员工码 / 活动码 / 渠道码（`countBy(codes, labels[scenario])`）
  - 分享状态分布：进行中 `active` / 已过期 `expired` / 已失效 `revoked`
  - 空数据 `暂无记录`；无 `Math.random`/`mockMetrics`（禁止假 BI）
- 保留全部既有交互与状态：`新建分享码`（场景下拉 + 失效时间 + 幂等 POST `/employee/share-codes`）、`我的分享码` 列表（选码/查看二维码/立即失效 POST `/revoke`）、`复制链接`、loading/forbidden/error 三态 + 重新加载、空态 `还没有分享码`；二维码渲染移入选中分享链接面板（`<img src={qr}>` + 诚实描述）。
- 新增 honest 底注（source=local、分布按已抓取分享码档案行现场归类、仅统计观看/访问/跳转入口痕迹与打开次数、不含支付金额、不含第三方订单履约、不代履约美团/抖音订单、不代表第三方成交、非本平台下单）。
- 文案/身份约束全保留：`推广员工具 · 获客分享`、`后续扫码不会进入工具入口。`、`默认进入消费者入口，可选设置自动失效时间。`、`分享配对`、`不含第三方成交结果`、`employee/share-codes`（W8/W28/W30 断言路径）；无 `经营`、无 `ONEDAY /` 眉标、无 `本平台下单请/去支付/完成支付/发起支付`。

### `apps/employee-web/app/e/share/share.module.css`

- 移除旧 `.header + h1 ~28px` / `.hero` 品牌渐变区，重建 `.topBar`（sticky 黄 `linear-gradient(180deg,#ffe14d,#ffd100)`）/`.topBarTitle`/`.topBarActions`/`.topBarRefresh`/`.heroCard`/`.panel`/`.panelHead`/`.panelMeta`/`.summaryStrip`（黄边浅黄底 4 列）/`.distribution`/`.panelBlock`/`.bars`/`.barRow`/`.barTrack`/`.barFill`/`.barValue`/`.barLabel`/`.barEmpty`/`.honest`/`.controls`/`.card`/`.selected`/`.cardBody`/`.code`/`.cardActions`/`.linkText`/`.qrRow`/`.qr`/`.qrHint`/`.linkActions`/`.feedback`/`.centered`，`page` 底色 `#f5f5f5`，与员工面 full-parity 序列完全一致；≤580px summaryStrip 两列、barRow 条宽压缩、controls/card 纵向堆叠。

无 schema/DB/API，不复活 consumer_orders / 本平台下单收单。

## 验证

- 新 `tests/g1-winf96-employee-share-parity.test.mjs` **4/4**（W96 topBar/heroCard/灰底、summaryStrip/distribution 真实数据与禁止假 BI、诚实边界 + 原交互 + 三态、工具身份 + 无 `经营`/无本平台收单 /ONEDAY 眉标）。
- 随动回归：`g1-winf8-employee-share.test.mjs`（`推广员工具`/`分享配对`/`不含第三方成交结果|不含支付或第三方订单结果`/`employee/share-codes`）+ `g1-winf28-tool-residual-ops-copy.test.mjs`（share `后续扫码不会进入工具入口`/`默认进入消费者入口`/无 `经营`）+ `g1-winf30-oneday-eyebrow-copy.test.mjs`（share `推广员工具 ·` 且无 `ONEDAY /`）通过。
- `g1-winf*.test.mjs`：**349/349**（上刀 345 + 新 4）。
- `pnpm typecheck`：**20/20**（employee-web `tsc --noEmit` PASS）。
- `pnpm build`：**20/20**（employee-web 含 `/e/share` 16 路由，`next build` PASS）。
- 单测 `vitest run`：**47 passed + 2 pre-existing 失败照旧**（`tokens.vitest.ts` + `storefront-renderer.vitest.ts`；本刀纯 UI 变更，与 design-token/storefront 无关）。
- 变更 TS/测试/CSS `eslint` + `prettier` clean。

诚实边界：**工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时。** 四端完整对标仍以 inventory `PARITY` 为商用前提，员工分享工具面 `/e/share` 已补齐。
