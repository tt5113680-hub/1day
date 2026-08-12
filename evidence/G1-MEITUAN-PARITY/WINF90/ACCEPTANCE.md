# G1-W∞-90 Management MPC summaryStrip 视觉标准统一（黄边浅黄底全标对概况条）

- slice: `G1-R-MANAGEMENT-SUMMARYSTRIP-PARITY`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering visual/IA parity densify; 把 Management MPC 全主面 `summaryStrip` 收敛到 W86/87/88 确立的全标对「黄边浅黄底 白卡概况条」单一视觉标准，并落成可回归守卫)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-80~89 Management MPC 深页波共享视觉语言（`topBar` + `heroCard` + 白卡概况条 `summaryStrip` + 白卡分布面板 + honest），本刀收束管理面 `summaryStrip` 的视觉/IA 不一致：同是 Management MPC 主面的「概况条」此前并存**两种观感**——

1. **全标对标准（黄边浅黄底）**：`.summaryStrip` = `linear-gradient(135deg,#fff9db,#fffef5)` 底色 + `border:1px solid rgb(255 209 0 / 35%)` + `border-radius/padding`，内层为内嵌 `<span>` 标签 + `<strong>` 数值（`/m` dashboard W87、`/m/offers` W86、`/m/customers`、`/m/memberships` W88、`/m/stores` W80、`/m/reviews`/`/m/marketing` W42 等已达标）。
2. **退化/白卡变体**：`.summaryStrip` 只有 `display:grid` + `gap`，且每个内层项套 `>.summaryStrip > div` 独立白卡（`border-radius:12px; padding:14px 18px; background:#fff; box-shadow`），并伴随三套不一致的 `span/strong` 字号（#888/12/700 vs #999/13 vs #666/12/600）。

本刀把**全部** Management MPC 携带 `summaryStrip` 的主面收敛到唯一全标对标准（黄线浅黄底 + `repeat(4/6)` 列 + `.summaryStrip span`(#666/12/600) `.summaryStrip strong`(700 22px/1.1) + `@media(max-width:900px)` 两列堆叠），并**移除退化 `.summaryStrip > div` 独立白卡**，使「三层级（topBar+heroCard+概况条）+ 分布 + honest」在管理面完全一致的视觉层级，toward PARITY，禁止假 BI（所有取值仍由已抓取真实档案行现场推导，本刀仅统一呈现式样，不改任何数据/交互/文案）。

收敛文件（16 个 `page.module.css`，纯视觉式样）：
- 单页：`ai-suggestions`、`analytics`(6 列，保留 `.summaryStrip small` 环比小标)、`attribution`、`circles`、`connectors`、`content`、`employee-process-performance`、`entry-funnel`、`external-actions`、`permission-audit`、`settings`、`organization-employees`、`page-builder`、`roles-permissions`、`funnels/[id]`
- 共享：`_commerce.module.css`（`/m/orders` `/m/reviews` `/m/marketing` `/m/notifications` 共享）

`/m/workflows` 保持 CUSTOM（不含 `summaryStrip`，不复刻美团）——已由防线断言「无 parity summaryStrip」。

新增可回归防护护栏 `tests/g1-winf90-management-summarystrip-parity.test.mjs`（2/2）：遍历全部收敛的 Management MPC 概况条 CSS，断言 `linear-gradient(135deg,#fff9db,#fffef5)` 浅黄底 + `rgb(255 209 0 / 35%)` 黄边 + `.summaryStrip span/strong` 存在 + `@media(max-width:900px)` 两列堆叠 + **不存在 `.summaryStrip > div` 独立白卡变体**；并断言 `/m/workflows` 无 parity summaryStrip。防止视觉/IA densify 回退到白卡变体。

诚实边界全保留（源 source=local、分布全部由已抓取档案行现场推导、不接美团/抖音实时、不包含本平台收款、非本平台下单）；本刀仅统一概况条视觉式样，CRUD/分布/全状态/工具身份交互零改动。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。

## Files

- 16× `apps/management-web/app/m/*/page.module.css`（含 `_commerce.module.css`）— `summaryStrip` 收敛到全标对黄线浅黄底，移除 `.summaryStrip > div` 白卡变体
- `tests/g1-winf90-management-summarystrip-parity.test.mjs`（新, 2/2）— 全管理概况条 CSS parity 守卫 + workflows CUSTOM
- `PROJECT_STATE/MEITUAN_PC_H5_PARITY_INVENTORY.md`（§6 下一刀更新为 W∞-90 PASS）
- `PROJECT_STATE/TASK_QUEUE.md`、`PROJECT_STATE/CURRENT_STATE.md`、`PROJECT_STATE/LATEST_HANDOFF.md`、`CHANGELOG.md`（随动更新）

## Verify

```text
node --test tests/g1-winf90-management-summarystrip-parity.test.mjs  # 2/2
node --test --test-concurrency=1 tests/g1-winf*.test.mjs             # 324/324 (322 prior + 2 new)
pnpm typecheck                                                        # 20/20
pnpm build                                                            # 20/20
pnpm test:unit                                                        # 47 passed (2 pre-existing token/storefront-renderer baseline failures 照旧)
npx prettier --check 等变更 CSS                                       # clean（CRLF 警告为 git 换行提示）
npx eslint tests/g1-winf90-management-summarystrip-parity.test.mjs   # clean（0 问题）
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个断言为既有基线失败，与 W∞-90 无关（同 W∞-44~89 记录）。

## Gates

- typecheck PASS（`pnpm typecheck` 20/20）；build PASS（`pnpm build` 20/20，含 management-web 全部路由）；
- `g1-winf90` 2/2；`g1-winf*.test.mjs` 324/324（含 g1-winf42/44/45/82/85/89 关键回归）；
- vitest 47 passed（2 pre-existing baseline 失败照旧）；新 test 文件 + 变更 CSS eslint + prettier clean；
- 纯视觉式样收敛，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
