# Changelog

## 2026-08-11

- **TOOL-PHASE-1** Consumer funnel client emit (visit/dwell/jump/share) + Management /m/entry-funnel module-named board + settings「全平台可见引流」. Evidence: evidence/TOOL-PHASE-1/ACCEPTANCE.md.


- **G1-W∞-2** Consumer H5 搜索 (`G1-R-MEITUAN-H5-SEARCH`, MH5-02). `GET /api/v1/consumer/search`（租户 fail-closed 按名检索已发布商户）+ Consumer H5 `/c/search` 美团 App 搜索面（结果卡含 local_pilot 评分/月售/距离，进店深链）；`/c/discovery` 搜索壳接为可点击入口。Typecheck 20/20 + build 20/20（consumer 路由新增 `/c/search`）+ `page-c-consumer-search` L2 + `page-c-002` 回归 PASS. Evidence: `evidence/G1-MEITUAN-PARITY/WINF2/ACCEPTANCE.md`. Not owner sign-off.
- **G1-W4** Employee H5 -> 美团商家 App 工作台 (`G1-R-MEITUAN-EMPLOYEE-WORKBENCH`). Workbench 今日经营概览条 + 常用功能宫格（订单待办/顾客/会员核销/获客线索/门店/消息），全部真实 workbench 数据 + 既有路由深链。Evidence: `evidence/G1-MEITUAN-PARITY/W4/ACCEPTANCE.md`.
- **G1-W2** Consumer H5 -> 美团 App nearby + merchant header (`G1-R-MEITUAN-H5-NEARBY-STORE`). Evidence: `evidence/G1-MEITUAN-PARITY/W2/ACCEPTANCE.md`.
- **G1-W1** Meituan merchant PC nav + 商家中心 workbench (`G1-R-MEITUAN-PC-NAV-HOME`). Evidence: `evidence/G1-MEITUAN-PARITY/W1/ACCEPTANCE.md`.
- Product bar locked: Consumer H5->美团 App; Employee H5->美团商家 App; Management PC->美团商家 PC; Platform PC->美团平台/代理 PC.
- Consumer discovery: nearby/好评/人气 sort chips + local_pilot rating/salesHint.
- Pilot logins prefilled (management/employee/platform).

- **G1-W3** Management PC store/goods Meituan IA densify. Evidence: evidence/G1-MEITUAN-PARITY/W3/

- **TOOL-PHASE-0** Entry funnel L0+L1+L2 (entry_funnel_events) + platform_visible_traffic + nearby visibility + saabei platform type. Abandoned consumer_orders WIP (no-sales identity). Evidence: evidence/TOOL-PHASE-0/ACCEPTANCE.md.
