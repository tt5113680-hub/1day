# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-86 为 Management MPC-03 商品/套餐入口 `/m/offers` 补齐全标对概况条：新增 `data-testid="management-offers"` + 白卡概况条 `summaryStrip`（`aria-label="商品套餐数据概况"`，黄边浅黄底，≤900px 两列堆叠），4 项全部由已抓取真实档案行现场推导（门店 `stores.length`、套餐/服务 `allServices.length`、平台 Offer `allOffers.length`、展示中 active 计数），`page.module.css` 新增 `.summaryStrip/.summaryStrip span/.summaryStrip strong` + ≤900px 响应式，使 `/m/offers` 从 heroCard+分布面板+表格完整对标 heroCard+概况条+分布面板+表格（与 W∞-80~85 summaryStrip 视觉语言一致）；承接并保留 W∞-47 全部分布面板（套餐可见/门店/平台入口/Offer 状态/价格带）与新建套餐/新增 Offer/停用启用交互、全状态（loading/forbidden/error）；诚实边界全保留（source=local、不接美团/抖音实时价格、不伪造第三方评分或成交、不包含本平台收款、非本平台下单）；工具身份眉标不变；无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf86 4/4；`g1-winf*` 305/305；g1-winf47 回归通过；management typecheck+build PASS、`pnpm typecheck` 20/20、`pnpm build` 20/20、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。See WINF86.
- progress: 全标对概况条补齐进行中：Management MPC 主面深页分布+概况条序列 W∞-45~86 已闭合到商品/套餐入口。下一刀可继续补余下 Management 零星面概况条（如 `/m/dashboard` 等）或转 inventory `PARITY` 关断复核（`MEITUAN_PC_H5_PARITY_INVENTORY.md` 状态列逐面复审 toward PARITY），或推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE）。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
