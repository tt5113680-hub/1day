# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-96 Employee 获客分享 `/e/share` full-parity densify（toward PARITY，禁止假 BI）：本刀发现员工工具身份面最后一块仍残留在旧 `.header` 眉标 + 品牌渐变 `.hero` + `@oneday/ui` `Card`/`StatusBadge` 页面级 chrome 的 `获客分享码` 页（W89 关断守卫主面未覆盖 `/e/share`）。`share-codes.tsx` 移除旧 `.header`/`.hero`/`Card`/`StatusBadge`，把 `qr` 二维码渲染移入选中分享链接面板（消除 eslint unused），改挂与现代员工面 full-parity 完全一致的 **sticky 黄顶栏 `topBar`（`推广员工具 · 获客分享` + 右上 `工作台` 深链）+ 灰底画布 `#f5f5f5` + 白卡 heroCard（h1 `把每次触达变成可追踪的入口` + 诚实描述）+ 白卡概况条 `summaryStrip` `分享数据概况`（分享码/员工码/活动码/渠道码，4 列黄边浅黄底）+ 白卡分布面板 `分享分布`（分享场景分布 + 分享状态分布，`barWidth(total,value)`+`countBy` 由真实 `codes[]` 档案行现场归类）+ honest 底注（source=local、仅统计观看/访问/跳转入口痕迹与打开次数、不含支付金额、不含第三方订单履约、不代履约美团/抖音订单、不代表第三方成交、非本平台下单）**。`share.module.css` 重建 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.panel/.summaryStrip/.distribution/.bars/.barRow/.barFill/.honest` 等灰底白卡 + 黄渐变 `linear-gradient(90deg,#ffd100,#f0a500)`，≤580px 两列 + 条宽压缩，与员工 full-parity 序列共享视觉语言。保留全部既有交互（新建分享码 场景+失效时间+幂等 POST、我的分享码 列表/查看二维码/立即失效 POST /revoke、复制链接）与 loading/forbidden/error 三态 + 重新加载 + 空态；文案/身份约束全保留（`推广员工具 · 获客分享`/`分享配对`/`不含第三方成交结果`/`后续扫码不会进入工具入口。`/`默认进入消费者入口`/`employee/share-codes`）；无 `经营`、无 `ONEDAY /`、无 `styles.header`/`styles.hero`、无页面级 `AdminPageHeader`/`Card`、不复活 consumer_orders / 本平台下单/收单、禁止假 BI。无 schema/DB/API。新增 `tests/g1-winf96-employee-share-parity.test.mjs` 4/4，随动回归 g1-winf8/28/30 通过；`g1-winf*.test.mjs` 349/349；`pnpm typecheck` 20/20、`pnpm build` 20/20（employee-web 含 `/e/share`）、单测 47 passed（2 个 pre-existing token/storefront-renderer 失败照旧）；变更 TS/test/CSS eslint+prettier clean。诚实边界全保留（工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时）。证据 `evidence/G1-MEITUAN-PARITY/WINF96/ACCEPTANCE.md`。
- progress: 员工工具身份面最后一块旧 chrome（`/e/share` 获客分享）已收束到 full-parity 三层级，员工四端主面/深页全部对齐美团商家端；Management MPC W∞-45~91 + Employee ME-02/03 详情 W∞-92/93/94/95 + Employee 分享 W∞-96 + 消费者 MH5 + 平台渠道商圈 + W∞-89/90 关断守卫 Codify 为可回归断言。下一刀可推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE，均由主人签验），或按主人指示继续逐面密度 densify。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
