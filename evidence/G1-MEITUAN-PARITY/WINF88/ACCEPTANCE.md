# G1-W∞-88 Management 客户跟进 + 会员中心 全标对概况条 densify (MPC-06 + MPC-08)

- slice: `G1-R-MANAGEMENT-CUSTOMER-MEMBER-SUMMARYSTRIP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; `/m/customers` + `/m/memberships` toward Meituan merchant PC full parity — 补齐概况条)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-86（`/m/offers`）与 W∞-87（`/m/dashboard`）确立的「topBar + heroCard + 白卡概况条 summaryStrip + 白卡分布面板 + honest」全标对视觉语言，本刀把 Management MPC 面仍缺「独立白卡概况条」的最后两张零星主面补齐——客户跟进（MPC-06 `/m/customers`）与会员中心（MPC-08 `/m/memberships`），使该两页完整对标「topBar + heroCard + 概况条 + 分布面板 + 列表/明细」层级；概况条指标全部由已抓取真实档案行现场推导，禁止假 BI：

- **`/m/customers`（客户跟进，MPC-06）**：新增 `data-testid="management-customers"` + 白卡概况条 `aria-label="客户数据概况"`（黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)` + `rgb(255 209 0 / 35%)` 边，6 列，≤900px 两列堆叠）——6 项全部由真实 `customers` 档案行现场推导：
  - 客户 `customers.length`；
  - 活跃 `activeCount`（`segment==='active'`）；
  - 复购 `repurchaseCount`（`segment==='repurchase'`）；
  - 沉睡 `dormantCount`（`segment==='dormant'`）；
  - 标签 `byTag.length`（去重标签频次）；
  - 有有效订单 `orderedCount`（`orders>0`）。
- **`/m/memberships`（会员中心，MPC-08）**：把旧两列 `.summary` 概览条升级为全标对白卡概况条 `aria-label="会员数据概况"`（3 列）——3 项全部由真实会员档案行现场推导：
  - 在册会员 `enrolledCount`（`enrollments.length`）；
  - 权益项 `benefitCount`（`data.benefits.length`）；
  - 覆盖门店 `coveredStores.size`（去重 `store_name ?? '未绑定门店'`）。
- **`page.module.css`（两页）**：新增/改挂 `.summaryStrip`（`grid-template-columns: repeat(6/3, minmax(0,1fr))`，浅黄底 + 黄边），`.summaryStrip span/strong` 字号层级一致，`@media (max-width:900px)` 两列堆叠（与 W∞-86/87 一致）。
- **memberships 旧 `.summary` CSS 规则移除**，不残留第二套概览条样式（单一真源视觉语言）。

承接并保留两页全部分布面板（`客户跟进分布` 分层/归属/标签、`会员分布` 门店/入会时间）与既有交互/区块（客户筛选/批量归属审批/导出审批、会员发放/吊销/ledger 时间线）及全状态（loading/forbidden/error）。

诚实边界全保留：客户跟进以来源/标签/归属组织推广授权跟进、导出与归属变更保留审批和审计记录（source=local）；会员中心 `不伪造第三方投放或本平台成交`、会员码核销在推广员工具授权范围内。工具身份眉标 `推广员工具 · 客户跟进` / `推广员工具 · 会员中心` 不变。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/customers/page.tsx`（新增 `data-testid="management-customers"` + 白卡概况条 `客户数据概况`，6 项真实数据实时推导）
- `apps/management-web/app/m/customers/page.module.css`（新增 `.summaryStrip/.summaryStrip span/.summaryStrip strong` + ≤900px 两列堆叠）
- `apps/management-web/app/m/memberships/page.tsx`（旧 `.summary` 概览条升级为白卡概况条 `会员数据概况`，3 项真实数据实时推导）
- `apps/management-web/app/m/memberships/page.module.css`（旧 `.summary` 规则移除，改挂 `.summaryStrip` + ≤900px 两列堆叠）
- `tests/g1-winf88-management-customer-member-summarystrip.test.mjs`（新,7/7）— 验证概况条/data-testid/真实数据公式/CSS 响应式/既有分布+诚实边界
- `tests/g1-winf41-management-memberships-visual.test.mjs`（随动更新）— memberships 概览条断言 `.summary` → `.summaryStrip`

## Verify

```text
node --test tests/g1-winf88-management-customer-member-summarystrip.test.mjs  # 7/7
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                       # 316/316
pnpm typecheck                                                                  # 20/20
pnpm build                                                                      # 20/20 (management-web routes 含 /m/customers /m/memberships)
pnpm test:unit                                                                  # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                                      # clean
npx prettier --check <changed files>                                            # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-88 无关（同 W∞-44~87 记录）。

## Gates

- typecheck PASS（`pnpm typecheck` 20/20）；build PASS（`pnpm build` 20/20，management-web 含 /m/customers /m/memberships）；
- `g1-winf88` 7/7；`g1-winf*.test.mjs` 316/316；
- vitest 47 passed（2 pre-existing token 失败照旧）；eslint + prettier clean；
- 概况条/分布指标全部由既有客户/会员档案行真实推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
