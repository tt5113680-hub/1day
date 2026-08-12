# G1-W∞-78 员工/管理工作台真实数据深页 densify（ME-01 + MPC-01，toward PARITY）

- slice: `G1-R-WORKBENCH-DEEP`（商用前提：员工 ME-01 工作台 + 管理 MPC-01 工作台补齐真实数据分布）
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**（工程 densify；非主人 G1 签）
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

### `/e/workbench`（员工 ME-01）

- 保留 W∞-34 黄顶栏 + heroCard + 常用功能格 + 任务/机会/提醒列表
- 新增 `summaryStrip` `aria-label="工作台数据概况"`（全部待办/今日任务/客户提醒/行动机会/已逾期）
- 新增白卡分布面板 `aria-label="工作台作业分布"`：状态/升级/客户关联/到期窗口/来源/行动机会分布，由真实 `tasks[]` + `customerReminders[]` + `opportunities[]` 行推导
- honest 底注（source=local、不含第三方订单履约、非本平台下单）

### `/m/dashboard`（管理 MPC-01，page.tsx）

- 保留 W∞-35 黄顶栏 + 今日概况 + 常用功能 + 作业数据 + 待办异常/提醒
- 新增白卡分布面板 `aria-label="管理工作台分布"`：待办指标/客户门店/异常类型/提醒队列分布，由 dashboard `metrics` + `anomalies[]` + `suggestions[]` 推导
- honest 底注（source=local、不含支付金额、近30日服务档案非本平台下单）

## Verification

- tests/g1-winf78-employee-management-workbench-deep.test.mjs 5/5
- `g1-winf*.test.mjs` 269/269
- employee-web + management-web typecheck + build PASS
