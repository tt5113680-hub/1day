# G1-W∞-40 Management 客户跟进视觉/IA densify toward Meituan merchant PC (MPC-06)

- slice: `G1-R-MANAGEMENT-CUSTOMERS-VISUAL` densify
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; MPC-06 PARTIAL→toward PARITY)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

`/m/customers`（客户跟进列表）与 `/m/customers/[id]`（客户跟进明细，MPC-06 顾客/CRM）改为美团商家端 PC 视觉/IA：

- **黄顶栏** `topBar`：列表 `推广员工具 · 客户跟进` + 右上「申请导出」；明细 `推广员工具 · 客户跟进 · <分层>` + 「刷新客户」。
- **灰底白卡** 画布（`background:#f5f5f5`）+ **heroCard** 白卡（`h1` 标题 + 诚实描述）。
- **白卡面板**：筛选卡、批量归属卡、表格卡、操作/来源/归属/订单/任务面板、可审计时间线。
- 移除页面级 `AdminPageHeader` / `Card` 依赖（视觉 densify，与 W∞-35/38/39 盘统一）。
- 保留全部工具身份与诚实边界（实名授权跟进、来源分层、归属与导出审批、非本平台下单）。

无 schema/DB/API 变更；纯前端视觉/IA densify。

## Files

- `apps/management-web/app/m/customers/page.tsx`
- `apps/management-web/app/m/customers/page.module.css`
- `apps/management-web/app/m/customers/[id]/page.tsx`
- `apps/management-web/app/m/customers/[id]/page.module.css`
- `tests/g1-winf40-management-customers-visual.test.mjs`（新增 6/6）

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf40*.test.mjs tests/g1-winf24*.test.mjs tests/g1-winf28*.test.mjs tests/g1-winf30*.test.mjs   # 28/28
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                                                                              # 107/107
pnpm --filter @oneday/management-web typecheck && build                                                                              # PASS (28 routes)
npx vitest run                                                                                                                       # 47 passed（2 pre-existing token 失败照旧）
npx eslint <changed files>                                                                                                            # clean
npx prettier --check <changed files>                                                                                                  # clean
```

## Gates

- typecheck PASS；build PASS（management-web 28 routes，含 `/m/customers` + `/m/customers/[id]`）。
- `g1-winf40` 6/6；随动更新 W∞-24 / W∞-30 校验到 densify 后 DOM（工具身份、anti-overclaim 全保留）。
- 单测 47 passed（2 个 pre-existing token 失败照旧）；`g1-winf*.test.mjs` 107/107。
- eslint + prettier clean。
- 不碰钱/销售/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
