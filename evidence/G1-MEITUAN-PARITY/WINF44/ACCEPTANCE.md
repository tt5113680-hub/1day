# G1-W∞-44 Management 数据/经营分析 视觉/IA densify toward Meituan merchant PC daily-report density (MPC-09)

- slice: `G1-R-MANAGEMENT-ANALYTICS-DAILY-REPORT`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; MPC-09 GAP → toward PARITY)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

MPC-09 数据/经营分析（美团 PC «经营日报» 密度，本地试点指标密度，禁止假 BI）：

- **后端 `GET /api/v1/management/entry-funnel/daily-report?days=N`**（`entry-funnel.service.ts` + `entry-funnel.controller.ts`，`tenant.manage` fail-closed）：只读真实 L0–L2 `entry_funnel_events`，返回——
  - `today` 指标卡集：今日观看/访问/跳转/停留/分享 + 模块曝光/咨询点击/跳转确认/分享发出码/进店率/出站率；
  - `vsPrior` 今日对比前一窗口环比（曝光/访问/跳转）；
  - `daily[]` 逐日时间序列（`YYYY-MM-DD` → 观看/访问/跳转/停留/分享 + 进店率/出站率，仅计至当日）。
  - `disclaimer` 诚实口径：仅 L0–L2 入口痕迹，不含支付/成交/第三方订单；不伪造销量或结果。
- **前端 `/m/analytics`**（`apps/management-web/app/m/analytics/page.tsx` + `page.module.css`）：美团商家端 PC 经营日报密度——
  - **黄顶栏** `topBar`（`推广员工具 · 数据/经营分析` + 右侧窗口选择「近 7/30/90 天」+ 「刷新」）；
  - **灰底白卡** 画布（`background:#f5f5f5`）+ **heroCard** 白卡（`h1` 标题 + 诚实描述）；
  - **概况条** `summaryStrip`（今日观看/访问/跳转/停留/分享 + 进店率，含环比）；
  - **白卡面板**：漏斗（今日 观看→访问 / 访问→跳转 / 分享发出码）+ L2 站内动作（模块曝光/咨询点击/跳转确认）；**逐日明细表**（日期/观看/访问/跳转/停留/分享/进店率/出站率）。
  - 保留 loading/forbidden/error/empty 全状态（工具身份口径）；保留 `data-testid="management-analytics"`；底部 honest note + 深链 `/m/entry-funnel` 与 `/m/attribution`。
- **菜单** `packages/contracts/src/menu.ts`：新增 `analytics`（`数据/经营分析`，`group: 'orders'`，`requireAny: ['tenant.manage']`）。

诚实边界全保留：仅 L0–L2 入口痕迹叠加每日密度；不含支付金额、成交、第三方订单成功；不接美团实时数据；不复活 consumer_orders / 本平台下单/收单。可对 `/m/entry-funnel`（模块命名看板）与 `/m/attribution`（来源分析）互链，不另建第二套分析数据库。

## Files

- `apps/api/src/entry-funnel.service.ts`（新增 `dailyReport` 方法）
- `apps/api/src/entry-funnel.controller.ts`（新增 `GET management/entry-funnel/daily-report`）
- `apps/management-web/app/m/analytics/page.tsx`（新增）
- `apps/management-web/app/m/analytics/page.module.css`（新增）
- `packages/contracts/src/menu.ts`（新增 `analytics` 菜单条目）
- `tests/menu-dto.vitest.ts`（随动：tenant.manage 列表加入 `analytics`）
- `tests/g1-winf44-mpc-09-analytics-daily-report.test.mjs`（新增 6/6，验证五块盘：视觉密密度/顶栏眉标/honest 边界/后端只读 L0–L2/菜单/状态）

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf44*.test.mjs tests/sys-29*.test.mjs tests/sys-6-menu-dto.test.mjs  # 11/11
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                                                    # 126/126
pnpm --filter @oneday/api typecheck && pnpm --filter @oneday/management-web typecheck                       # PASS
pnpm --filter @oneday/management-web build / pnpm build                                                     # 20/20（management-web 29 routes 含 /m/analytics）
npx vitest run                                                                                              # 47 passed（2 个 pre-existing token 失败照旧）
npx eslint <changed files>  # clean
npx prettier --check <changed files>  # clean
```

> 注：`tests/*.test.mjs` 中依赖端口 3297 测试 API + 测试 DB 的集成测试（page-c-002/page-c-consumer-search/sys-11/sys-22/hardening-001/002）与 `sys-5-storefront-renderer` 的两个 token 断言，为未开启本地测试 API / 既有 token 基线失败，与 W∞-44 无关（已在 clean 基线复现一致）。

## Gates

- typecheck PASS（api/contracts/management-web）；`pnpm build` 20/20（management-web 29 routes）。
- `g1-winf44` 6/6；`g1-winf*.test.mjs` 126/126；menu 相关 11/11。
- vitest 47 passed（2 个 pre-existing token 失败照旧）；eslint + prettier clean。
- 不碰钱/销售/管店；仅 L0–L2 痕迹；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
