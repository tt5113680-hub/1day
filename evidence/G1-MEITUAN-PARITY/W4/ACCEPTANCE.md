# G1-W4 Employee H5 → 美团商家 App 工作台

- slice: `G1-R-MEITUAN-EMPLOYEE-WORKBENCH`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner G1 sign-off)

## What changed

`/e/workbench` 员工工作台对齐美团商家 App 工作台 IA（ME-01，首刀）：

1. **今日经营概览条**（`今日经营概览`）— 品牌带 + 三宫格实时指标：
   - 今日任务 / 客户提醒 / 行动机会（全部来自 `/api/v1/employee/workbench` 真实数据，无假「订单/营业额」）。
2. **常用功能宫格**（金刚区，对标美团商家 App 常用功能入口）：
   - 订单待办 → `/e/tasks`（ME-02 订单/待办）
   - 顾客 → `/e/customers`（ME-03 顾客）
   - 会员核销 → `/e/memberships`（ME-05 核销/会员）
   - 获客线索 → `/e/leads`
   - 门店 → `/e/store`（ME-04 门店，店长）
   - 消息 → `/e/notifications`（ME-06 消息）
   - 全部为既有员工路由深链，无新增 API surface。
3. 保留其下「今天要做 / 行动机会 / 客户提醒」任务区与完成动作。

## Verification

- `pnpm --filter @oneday/employee-web typecheck` PASS
- `pnpm --filter @oneday/employee-web build` PASS（15 路由含 `/e/workbench`）

## Honest boundary

- 对齐美团商家 App 工作台的信息架构与密度；ME-02~05 深页详情/筛续接 W5/W∞ 逐页。
- 未伪造今日订单/营业额等无数据源的假 BI。
- Not full 美团商家 App pixel parity; W4 = Employee workbench first-cut densify.
- Do not auto-sign `PRODUCT_OWNER_UI_ACCEPTANCE.md`.
- Next: W5 Management 订单·评价·营销（MPC-04/05/07）per inventory.
