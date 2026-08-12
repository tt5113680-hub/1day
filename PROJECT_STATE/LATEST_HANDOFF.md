# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-90 Management MPC summaryStrip 视觉标准统一（toward PARITY，禁止假 BI）：把管理面所有携带 `summaryStrip` 的主面的「概况条」收敛到 W86/87/88 确立的全标对「黄边浅黄底白卡概况条」单一视觉标准，消除此前并存的白卡变体（`.summaryStrip > div` 独立白卡 + 三套不一致 span/strong 字号）——16 个 `page.module.css` 纯视觉式样统一（ai-suggestions/analytics/attribution/circles/connectors/content/employee-process-performance/entry-funnel/external-actions/permission-audit/settings/organization-employees/page-builder/roles-permissions/funnels[id] + 共享 `_commerce.module.css` 覆盖 orders/reviews/marketing/notifications）：`linear-gradient(135deg,#fff9db,#fffef5)` 浅黄底 + `rgb(255 209 0 / 35%)` 黄边 + `repeat(4/6)` 列 + `.summaryStrip span`(#666/12/600)`.summaryStrip strong`(700 22px/1.1) + `@media(max-width:900px)` 两列堆叠，移除 `.summaryStrip > div` 白卡变体，使管理面三层级（topBar+heroCard+概况条）+分布+honest 视觉层级完全一致。新增可复跑防护护栏 `tests/g1-winf90-management-summarystrip-parity.test.mjs` 2/2：遍历全部收敛概况条 CSS 断言黄线浅黄底/span/strong/≤900px 两列/无白卡变体，并断言 `/m/workflows` 无 parity summaryStrip（保持 CUSTOM 不复刻美团）。纯视觉收敛不改任何数据/交互/真实值推导（禁止假 BI），不碰钱/销/管店。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf90 2/2；`g1-winf*.test.mjs` 324/324；`pnpm typecheck` 20/20、`pnpm build` 20/20、单测 47 passed（2 个 pre-existing token/storefront-renderer 失败照旧）；新文件/变更 CSS eslint+prettier clean。诚实边界全保留（工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时）。See evidence/G1-MEITUAN-PARITY/WINF90/ACCEPTANCE.md.
- progress: 四端 W∞ 波已全部闭合（Management MPC W∞-45~88 全标对概况条/分布 + W∞-89 关断守卫 Codify 为可回归断言）。下一刀可推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE，均由主人签验），或按主人指示继续逐面密度 densify。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
