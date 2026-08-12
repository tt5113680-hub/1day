# 工作台与全页产品深度优化计划（W∞-99+）

- authority: `COMMERCIAL_EXECUTION_CHARTER.md` §3–§4、`PRODUCT_DUAL_TRACK_STRATEGY.md`
- rule: **真实 DB/API 可查，禁止假 dashboard**；不碰钱、非本平台下单

## 问题

W∞ 视觉 densify 已完成，但各端工作台仍是「导航 + 计数 + 分布条」，未对齐 charter 定义的 **早会/盯店/代理 habit 数据与可操作队列**。

## 波次

| 波次 | 范围 | 状态 |
| ---- | ---- | ---- |
| **W∞-99** | 六端工作台 API 经营深度 + 首页 UI（咨询/线索/会员/完成率/门店对比/队列） | **PASS** (2026-08-12) — typecheck/build 20/20 + g1-winf99 3/3 + g1-winf359/359 + unit 49/49 |
| **W∞-100** | 管理端深页（订单/评价/通知/分析）与工作台互链 KPI 一致 | **PASS** (2026-08-12) — g1-winf100 4/4 + management-web build |
| **W∞-101** | 员工深页（分享/跟进/核销/线索）与工作台互链 | **PASS** (2026-08-12) — g1-winf101 2/2 + employee-web typecheck |
| **W∞-102** | 平台/渠道/商圈工作台开通 Run + 风险 drill-down | **PASS** (2026-08-12) — `PlatformOperationalKpi` + `ChannelOperationalQueues` on `/p/dashboard` `/ch/dashboard` `/bc/dashboard` `/p/outbox` + g1-winf102 2/2 + platform-web build |
| **W∞-103** | 消费者 LBS/店页：去 mock 或诚实标注 + 品类/入口密度 | **PASS** (2026-08-12) — discovery API `store_reviews`+`entry_visits_30d` + discovery/search UI 诚实标签 + g1-winf103 2/2 + typecheck/build 20/20 |

## 各端工作台必答问题（charter）

### 管理 `/m`

- 今日咨询/线索、会员新增/核销、任务完成率
- 门店对比、待办队列（逾期/审批/线索）
- 宫格含：订单痕迹、评价、通知、经营日报

### 员工 `/e`

- 今日任务/逾期、线索、分享打开、核销
- 宫格含：分享、客户跟进队列
- 队列可 deep-link 处置

### 平台 `/p`、渠道 `/ch`、商圈 `/bc`

- 开通 Run、风险、Outbox 可 drill-down
- 代理/商户待办队列

### 消费者 `/c/discovery`

- 真实 LBS + 诚实标注 pilot 字段
