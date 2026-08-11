# G1-W∞-41 Management 会员中心视觉/IA densify toward Meituan merchant PC (MPC-08)

- slice: `G1-R-MANAGEMENT-MEMBERSHIPS-VISUAL` densify
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; MPC-08 会员/PARTIAL→toward PARITY)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

`/m/memberships`（会员与权益，MPC-08 会员）改为美团商家端 PC 视觉/IA：

- **黄顶栏** `topBar`：`推广员工具 · 会员中心` + 右上「刷新」。
- **灰底白卡** 画布（`background:#f5f5f5`）+ **heroCard** 白卡（`h1` 标题 + 诚实描述）。
- **概况条** `summary`（白卡：在册会员 / 权益项）。
- **白卡面板** `panel` 会员卡列表，保留「发放/吊销时间线」内联 ledger。
- 移除页面级 `AdminPageHeader` / `Card` 依赖（视觉 densify，与 W∞-35/38/39/40 盘统一）。
- 保留全部工具身份与诚实边界（会员码核销、member_benefit_ledger 时间线、不伪造第三方投放或本平台成交、推广员工具授权范围）。

无 schema/DB/API 变更；纯前端视觉/IA densify，保留全部 e2e hooks（`management-memberships`、`membership-card-*`、`membership-timeline-*`、`membership-ledger`、`membership-balances`、`membership-entries`、`role="status"`）。

## Files

- `apps/management-web/app/m/memberships/page.tsx`
- `apps/management-web/app/m/memberships/page.module.css`
- `tests/g1-winf41-management-memberships-visual.test.mjs`（新增 4/4）
- `tests/g1-winf25-management-tool-eyebrow-alignment.test.mjs`（随动：memberships 去 `eyebrow` 后移除其 eyebrow 断言，改由顶栏 `推广员工具 · 会员中心` 承载）

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf41*.test.mjs tests/g1-winf25*.test.mjs tests/g1-winf27*.test.mjs tests/g1-winf30*.test.mjs   # 20/20
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                                                                              # 111/111
pnpm --filter @oneday/management-web typecheck && build                                                                               # PASS (28 routes)
npx vitest run                                                                                                                        # 47 passed（2 个 pre-existing token 失败照旧）
npx eslint <changed files>                                                                                                            # clean
npx prettier --check <changed files>                                                                                                  # clean
```

## Gates

- typecheck PASS；build PASS（management-web 28 routes，含 `/m/memberships`）。
- `g1-winf41` 4/4；`g1-winf*.test.mjs` 111/111。
- 单测 47 passed（2 个 pre-existing token 失败照旧）；eslint + prettier clean。
- 不碰钱/销售/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
