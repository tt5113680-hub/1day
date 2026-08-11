# G1-W∞-46 Management 顾客·会员 真实数据深页密度 densify (MPC-06/08)

- slice: `G1-R-MANAGEMENT-CUSTOMER-MEMBER-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 顾客·会员 真实数据深页密度 toward Meituan merchant PC)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-45(订单·评价·营销 真实数据深页密度)，本刀把其余两个真实数据档案面补上「深页密度」(美团商家端成熟场景的分布洞察)，全部由已抓取的真实行现场推导，禁止假 BI：

- **`/m/customers`(客户跟进，MPC-06)**：新增白卡分布面板 `aria-label="客户跟进分布"`——
  - 分层分布(活跃/复购/沉睡，按 `segment`)；
  - 归属分布(按 `owner.name`，门店负责人/跟进员工/其他)；
  - 标签分布(跨客户 `tags` 频次，降序)。宽度百分比由 `customers` 真实行 `b.value/customers.length` 推导；空数据展示「暂无记录/暂无标签」。分层标签与筛选下拉口径一致(segmentCopy active→活跃/repurchase→复购/dormant→沉睡)。
- **`/m/memberships`(会员中心，MPC-08)**：新增白卡分布面板 `aria-label="会员分布"`——
  - 门店分布(按 `store_name`，`未绑定门店` 兜底)；
  - 入会时间分布(按 `joined_at` 年月，升序)。
  宽度百分比由 `enrollments` 真实行 `b.value/enrollments.length` 推导；空数据展示「暂无记录」。
- **两页各自 `page.module.css`**：新增 `.panel / .panelBlock / .bars / .barRow / .barTrack / .barFill / .barValue / .barLabel / .barEmpty`，灰底白卡布局 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 单列堆叠(与 W∞-45 `_commerce.module.css` 共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有真实行(`source=local`)，不接美团实时、不伪造第三方评分或成交、不包含本平台收款、非本平台下单；工具身份眉标(`推广员工具 · 客户跟进 / 会员中心`) + loading/forbidden/error/empty 全状态 + e2e hooks(客户筛选/批量归属审批/发放·吊销时间线) + 实名授权跟进/member_benefit_ledger 时间线全部继承。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/customers/page.tsx`(新增分层/归属/标签分布 + 数据推导)
- `apps/management-web/app/m/customers/page.module.css`(新增 panel/bar 样式 + ≤900px 堆叠)
- `apps/management-web/app/m/memberships/page.tsx`(新增门店/入会时间分布 + 数据推导)
- `apps/management-web/app/m/memberships/page.module.css`(新增 panel/bar 样式 + ≤900px 堆叠)
- `tests/g1-winf46-management-customer-member-deep.test.mjs`(新,5/5) — 验证两页分布面板/真实数据公式/CSS/诚实边界与 e2e hooks

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf46*.test.mjs      # 5/5
node --test --test-concurrency=1 tests/g1-winf*.test.mjs       # 136/136
pnpm --filter @oneday/management-web typecheck                  # PASS
pnpm --filter @oneday/management-web build                     # PASS (routes 含 /m/customers /m/memberships)
pnpm build                                                      # 20/20
npx vitest run                                                  # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                      # clean
npx prettier --check <changed files>                            # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-46 无关(clean 基线复现一致，同 W∞-44/45 记录)。

## Gates

- typecheck PASS；build PASS；`pnpm build` 20/20；
- `g1-winf46` 5/5；`g1-winf*.test.mjs` 136/136；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有行推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
