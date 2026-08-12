# G1-W∞-81 Management 经营分析 + 通知中心 真实数据深页 densify 收束（MPC-09 / MPC-13，toward PARITY）

- slice: W∞-80 收束
- recorded_at: 2026-08-12
- status: **PASS** (engineering densify; MPC-09 / MPC-13 剩余 PARTIAL 深页补上「分布洞察」)
- branch: `hardening/COMMERCIAL-COMPLETION`
- product_filter: 统一入口 / 工作流 / 入口痕迹；不碰钱·销售·管店；仅 L0+L1+L2 entry_funnel_events；不复活 consumer_orders

## Delivered

本刀承接 W∞-45~80 Management MPC 真实数据深页密度波，把管理面剩余 PARTIAL 的零星面 `/m/analytics`（MPC-09 数据/经营分析）与 `/m/notifications`（MPC-13 消息/通知）补上「分布洞察」，禁止假 BI：

### `/m/analytics`（MPC-09，承接 W∞-44 经营日报密度）

- 新增白卡分布面板 `aria-label="经营分析分布"`——今日漏斗分布（观看/访问/跳转/停留/分享）、今日 L2 动作分布（模块曝光/咨询点击/跳转确认/分享发出码）、逐日流量分布（近 N 天，`daily[]` 按观看+访问+跳转量取前 10 日），全部由真实 `daily-report` 返回的 L0–L2 痕迹行现场推导，宽度百分比 `barWidth(total, item.value)`，空数据「暂无记录」
- `page.module.css` 新增 `.distributionPanel/.panelHead/.panelMeta/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条，≤900px 单列堆叠（与 Management MPC 深页序列共享视觉语言）
- honest 底注：source=local、分布全部由已抓取入口痕迹行现场推导、仅统计观看/访问/跳转/停留/分享等入口痕迹、不含支付/成交/第三方订单
- 无 schema/DB/API 变更（复用 `GET /api/v1/management/entry-funnel/daily-report`）；loading/forbidden/error/empty + 顶栏 + recap 全继承

### `/m/notifications`（MPC-13，承接 W∞-31 通知中心）

- 移除页面级 `AdminPageHeader`，改挂黄顶栏 `topBar`（`推广员工具 · 通知中心` + 刷新）+ 灰底白卡 heroCard（h1 通知中心 + 诚实描述）+ 概况条 `summaryStrip`（待办总数/跟进异常/待审批/进行中工作流）——对齐 W∞-53 平台/管理深页视觉语言
- 新增白卡分布面板 `aria-label="通知分布"`——通知类型分布（按真实 `items[].category` 异常/审批/工作流）、推进去向分布（按真实 `items[].deepLink` 客户跟进/工作流整合）、待办负载分布（按真实 `counts` 跟进异常/待审批/进行中工作流分桶），全部由真实租户待推进文件行现场推导
- `_commerce.module.css` 新增 `.distributionPanel/.panelHead/.panelMeta/.distribution` 灰底白卡+黄渐变条（复用既有 `.panelBlock/.bars/.barRow/...`），≤900px 单列堆叠
- honest 底注：source=local、仅汇总推广员工具可推进的工作流待办与跟进异常、不包含支付金额/销售成交/第三方订单履约状态
- 无 schema/DB/API 变更（复用 `GET /api/v1/management/notifications`）；loading/forbidden/error/empty + 类型筛选 + 去处理深链全继承

诚实边界全保留：分布全部由已抓取真实档案行现场推导；仅 L0–L2 入口痕迹与租户待推进文件；不接美团/抖音实时；不包含本平台收款；非本平台下单；不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/analytics/page.tsx` / `page.module.css`（新增分布面板 helper + `BarList` + CSS）
- `apps/management-web/app/m/notifications/page.tsx`（改挂 topBar+heroCard+分布面板）
- `apps/management-web/app/m/_commerce.module.css`（新增 `.distributionPanel/.panelHead/.panelMeta/.distribution`）
- `tests/g1-winf81-management-analytics-notifications-deep.test.mjs`（新增 5/5）

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf81-management-analytics-notifications-deep.test.mjs tests/g1-winf44-mpc-09-analytics-daily-report.test.mjs  # 11/11
node --test --test-concurrency=1 tests/g1-winf*.test.mjs        # 282/282
pnpm --filter @oneday/management-web typecheck  / pnpm typecheck # PASS (20/20)
pnpm build                                                        # 20/20 (management-web 29 routes 含 /m/analytics /m/notifications)
npx vitest run                                                    # 47 passed（2 个 pre-existing token 失败照旧）
npx eslint <changed files>  # clean
npx prettier --check <changed files>  # clean
```

> 注：完整 `node --test tests/*.test.mjs` 中依赖本地运行态/既有 token 的断言（hardening-001/002、page-c-*、sys-11/22 等）为 HEAD 既有失败，与本次改动无关（历史各刀均已在 clean 基线复现一致）。本刀无新增此类失败。

## Gates

- `g1-winf81` 5/5；`g1-winf*.test.mjs` 282/282（较 W80 的 277 +5）
- typecheck 20/20；build 20/20（management-web 29 routes 含 `/m/analytics` `/m/notifications`）
- vitest 47 passed（2 个 pre-existing token 失败照旧）；eslint + prettier clean
- 无 schema/DB/API 变更；仅 L0–L2 入口痕迹与租户待推进文件；不碰钱/销售/管店；不复活 consumer_orders / 本平台下单/收单

Not an owner product-owner UI sign-off.
