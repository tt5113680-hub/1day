# CONSUMER-COMMERCIAL-HOME-V1 — 实施验收记录

日期：2026-08-08（Asia/Shanghai）

状态：`AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`

## Navigation and interaction alignment (2026-08-09)

- The current restaurant/store navigation is now `首页 / 团购 / 菜单 / 会员 / 我的`; it is a single Consumer Shell used on the storefront, each channel, service detail and action-confirmation page. Every tab leads to a real store-scoped page and preserves tenant, store, source, scene and share-code context.
- Group-buy pages show persisted store-package platform offers and route to the existing confirmation/audit page. Menu product CTA, membership consultation, benefit consultation and storefront consultation use the same confirmation path before a configured external link is opened. Map, phone and share retain explicit tracked outbound behavior.
- Verification after this change: `pnpm.cmd typecheck` 18/18; `pnpm.cmd build` 18/18; `node --test tests/page-c-004-api.test.mjs` 1/1; `pnpm.cmd exec playwright test --config playwright.consumer-commercial-home.config.ts` 2/2; `pnpm.cmd exec playwright test --config playwright.page-c-004.config.ts` 2/2. The storefront browser suite verifies three stores, five bottom tabs and 375/390/430px screenshots; service/browser verification covers product → confirmation → recorded action.
- Product-owner visual acceptance remains required. This is not a claim that a real third-party price, stock, order or payment has been verified.

## 已实现

- `/c/stores/[id]` 以持久化门店、服务、权益、内容及外部动作渲染为移动商业门店首页；含门店切换、轮播 Banner、十宫格、会员加入意向、套餐、第三方比价、动态、商圈权益、位置和固定五栏导航。
- 公共门店读取接口返回同商户的可用门店列表；咨询动作优先使用已配置的非链接动作，外部平台仍通过既有确认页及来源链路跳转。
- `北京国贸测试店`、`北京望京测试店`、`北京中关村测试店` 具有不同的本地图片、地址、套餐、权益和动态；所有本地内容显式标注 `TEST ONLY`，不使用真实品牌 Logo 或官方图片。
- 新增三张原创通用咖啡店视觉素材：`apps/consumer-web/public/storefront/*.png`。使用内置 image generation 生成，提示词约束为虚构商户、无真实 Logo、无文字和无水印。

## 验证事实

- `pnpm.cmd typecheck`：18/18 packages 通过。
- `pnpm.cmd build`：18/18 packages 通过。
- `pnpm.cmd test:unit`：2/2 通过。
- `pnpm.cmd test`：184/184 通过（先将隔离测试库迁移至已有的 `046_commercial_storefront`）。
- `pnpm.cmd exec playwright test --config playwright.consumer-commercial-home.config.ts`：2/2 通过。
- Playwright 已检查三家门店的不同数据、门店切换、固定五栏导航和 375/390/430px 视口。
- 截图：`storefront-375.png`、`storefront-390.png`、`storefront-430.png`。

## 已知边界 / V3.1

- 本阶段仅施工 Consumer；没有扩展 Employee、Management 或 Platform 页面。
- 管理端完整可视化装修、Banner/宫格排序编辑、会员手机号/验证码授权与高级千店千面属于后续范围。
- 第三方价格、库存和优惠始终以第三方实际页面为准；未实现爬价、支付、核销模拟或伪造回执。
- `pnpm.cmd format:check` 未能全仓通过，因为开始施工前已存在且未修改的 `PROJECT_STATE/COMMERCIAL_UI_FULL_CHAIN_AUDIT.md`、`PROJECT_STATE/PRODUCT_UI_GAP_AUDIT.md` 与 `tests/e2e/commercial-ui-alignment.human-pilot.spec.ts` 格式不符合 Prettier。所有本任务文件已通过 scoped Prettier 检查。

## 人工验收入口

`http://127.0.0.1:3201/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot`

## Storefront header layout follow-up (2026-08-09)

- Updated only the top storefront introduction layout. The upper-left `LBS 定位` action uses the existing tracked navigation behavior and displays the persisted store address; the upper-right `商圈 / OEM 推荐` is an explicitly non-interactive future placeholder.
- The existing warm palette, store title/status/share row, Banner and all lower modules remain unchanged. Visual evidence: `storefront-top-layout-390.png`.
- Consumer typecheck and production build passed. Status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`.

## Store-information card follow-up (2026-08-09)

- Replaced only the prior compact store-title/business-hours row with a card hierarchy derived from the supplied reference: existing store thumbnail, persisted merchant/store name, then four fact cells for open state, business hours, pickup method and TEST ONLY status.
- No rating, monthly sales, delivery time, promotion or recommendation score was added because the local merchant model does not persist those facts. The existing colors, LBS/future-recommendation row, Banner and all lower content remain unchanged.
- 390px visual evidence: `storefront-store-info-390.png`. Consumer typecheck and production build passed; status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`.

## Service product-detail follow-up (2026-08-09)

- The Consumer service page now follows a product-information hierarchy: product card, store-scoped platform group-buy prices, package/material details, purchase notes, applicable-store facts and benefits. The existing warm visual palette remains unchanged.
- The API returns only active store-linked external actions and the persisted `store_service_platform_offers` records for the selected service. Each purchase click preserves the existing tenant-scoped service-intent record before any configured external target is opened.
- Verified: API typecheck/build; Consumer typecheck/build; focused service-detail HTTP acceptance `1/1`; focused mobile Playwright `2/2`. Visual evidence: `service-detail-mobile.png` and `service-detail-forbidden.png`.
- Status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`; the page is not represented as a live third-party offer and platform price, stock and promotions remain authoritative on the destination platform.

## Follow-up — package/platform prices and Consumer visual alignment (2026-08-08)

- Migration `047_store_service_platform_offers` persists the relationship between one recommended package, one active store platform action and its offer/market price; it is not derived from a link label.
- LOCAL HUMAN PILOT Guomao TEST ONLY evidence: Meituan `¥19.90`, Douyin `¥21.90`, partner `¥20.90`; the lowest-price marker is rendered on Meituan. The `2/2` storefront browser test checks the direct price values and the existing three-store/three-viewport path.
- Refreshed screenshots: `storefront-375.png`, `storefront-390.png`, `storefront-430.png`. Consumer service and external-action child pages now share the storefront warm palette and button/card language.
- Status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`; no assertion is made that the product owner has accepted the commercial UI.
