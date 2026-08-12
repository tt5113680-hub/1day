# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-88 为 Management 客户跟进 `/m/customers`（MPC-06）+ 会员中心 `/m/memberships`（MPC-08）补齐全标对概况条：新增 `data-testid="management-customers"` + 白卡概况条 `aria-label="客户数据概况"`（黄边浅黄底，6 列 6 项今日指标全部由已抓取真实 customers 档案行现场推导：客户/活跃/复购/沉睡/标签/有有效订单）；`/m/memberships` 把旧两列 `.summary` 概览条升级为全标对白卡概况条 `aria-label="会员数据概况"`（3 列 3 项由真实会员档案行推导：在册会员/权益项/覆盖门店）；两页 `page.module.css` 挂 `.summaryStrip`，memberships 移除旧 `.summary` 规则不残留第二套概览条，≤900px 两列堆叠（与 W∞-86/87 一致）。承接保留两页分布面板（客户跟进分布/会员分布）与交互及全状态；诚实边界全保留（source=local、导出与归属变更保留审批审计、memberships 不伪造第三方投放或本平台成交）；工具身份眉标不变。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf88 7/7；`g1-winf*` 316/316；随动更新 g1-winf41（`.summary` → `.summaryStrip`）；management typecheck+build PASS、`pnpm typecheck` 20/20、`pnpm build` 20/20、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。See WINF88.
- progress: 全标对概况条补齐进行中：Management MPC 主面深页分布+概况条序列 W∞-45~88 已闭合（工作台/商品/客户/会员等全部 MPC 主面均具备 topBar+heroCard+概况条+分布面板层级）。下一刀可转 inventory `PARITY` 关断复核（`MEITUAN_PC_H5_PARITY_INVENTORY.md` 状态列逐面复审 toward PARITY），或推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE）。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
