# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-87 为 Management MPC-01 工作台 `/m/dashboard` 补齐全标对概况条：新增 `data-testid="management-dashboard"` + 白卡概况条 `summaryStrip`（`aria-label="工作台数据概况"`，黄边浅黄底，`summaryStripTitle` 承载「今日概况」，6 项今日客户/今日待办/今日完成/逾期/门店/在岗跟进全部由已抓取真实 dashboard metrics 字段现场推导），`page.module.css` 原 `.todayStrip` 改挂 `.summaryStrip` 六列 + ≤900px 两列响应式；承接并保留 W∞-78 全部分布面板（待办指标/客户门店/异常类型/提醒队列）与常用功能格、指标卡、待办异常/作业提醒、全状态；诚实边界全保留（source=local、不含支付金额与第三方订单履约、非本平台下单）；工具身份眉标不变；无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf87 4/4；`g1-winf*` 309/309；g1-winf35/78/29 回归通过；management typecheck+build PASS、`pnpm typecheck` 20/20、`pnpm build` 20/20、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。See WINF87.
- progress: 全标对概况条补齐进行中：Management MPC 主面深页分布+概况条序列 W∞-45~87 已闭合到工作台（`/m/dashboard`，MPC-01）与商品/套餐入口（`/m/offers`，MPC-03）。下一刀可继续补余下 Management 零星面概况条（如 `/m/stores` 等已有概况条的页可复查）或转 inventory `PARITY` 关断复核（`MEITUAN_PC_H5_PARITY_INVENTORY.md` 状态列逐面复审 toward PARITY），或推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE）。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
