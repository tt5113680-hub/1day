# G1-W∞-47 Management 商品/套餐入口 真实数据深页密度 densify (MPC-03)

- slice: `G1-R-MANAGEMENT-OFFERS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 商品/套餐入口 真实数据深页密度 toward Meituan merchant PC)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-45(订单·评价·营销) 与 W∞-46(顾客·会员) 真实数据深页密度，本刀补上 **MPC-03 商品管理（商品/套餐入口，`/m/offers`）** 的真实数据分布洞察，全部由已抓取的真实 `stores[].services[].offers` 档案行现场推导，禁止假 BI：

- **`/m/offers`(商品/套餐入口，MPC-03)**：新增白卡分布面板 `aria-label="商品套餐分布"`，宽度百分比由真实行 `b.value/total` 推导，空数据「暂无记录」——
  - 套餐可见分布(按 `item.status`：Consumer 可见 active / 已停用 inactive)；
  - 门店分布(按 `stores[].services.length`，每门店套餐数)；
  - 平台入口分布(按 `offer.platform`，映射 美团 `meituan` / 抖音 `douyin` / 扫呗 `saabei` / 直接外链 `external`)；
  - Offer 状态分布(按 `offer.status`：展示中 active / 已停用 inactive)；
  - 价格带分布(按真实 `offerPrice` 分桶 ¥0-100 / ¥100-300 / ¥300+，频次降序)。
- **`page.module.css`**：新增 `.distribution / .panelBlock / .bars / .barRow / .barTrack / .barFill / .barValue / .barLabel / .barEmpty`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 单列堆叠(与 W∞-45 `_commerce.module.css` / W∞-46 共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有 `source=local` 档案行，新增 honest 底注「以上分布全部由商户登记的既有套餐/Offer 档案行实时推导(sourced local)：不接美团/抖音实时价格、不伪造第三方评分或成交、不包含本平台收款、非本平台下单」；工具身份眉标(`推广员工具 · 商品/套餐入口`) + loading/forbidden/error 全状态 + 既有新建套餐/新增 Offer/停用启用交互全继承。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/offers/page.tsx`(新增套餐可见/门店/平台入口/Offer 状态/价格带分布 + 真实数据推导)
- `apps/management-web/app/m/offers/page.module.css`(新增 distribution/panel/bar 样式 + ≤900px 堆叠)
- `tests/g1-winf47-management-offers-deep.test.mjs`(新,4/4) — 验证分布面板/平台映射/真实数据公式/CSS/诚实边界与既有交互
- `tests/g1-winf39-management-offers-visual.test.mjs`(随动) — 订单内 honest 边界断言 `本平台下单` → `非本平台下单`

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf47*.test.mjs      # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs       # 140/140
pnpm --filter @oneday/management-web typecheck                  # PASS
pnpm --filter @oneday/management-web build                     # PASS (routes 含 /m/offers)
pnpm build                                                      # 20/20
npx vitest run                                                  # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                      # clean
npx prettier --check <changed files>                            # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-47 无关(clean 基线复现一致，同 W∞-44/45/46 记录)。

## Gates

- typecheck PASS；build PASS；`pnpm build` 20/20；
- `g1-winf47` 4/4；`g1-winf*.test.mjs` 140/140；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有档案行推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
