# CONSUMER-COMMERCIAL-HOME-V1 — 实施验收记录

日期：2026-08-08（Asia/Shanghai）

状态：`AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`

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

## Follow-up — package/platform prices and Consumer visual alignment (2026-08-08)

- Migration `047_store_service_platform_offers` persists the relationship between one recommended package, one active store platform action and its offer/market price; it is not derived from a link label.
- LOCAL HUMAN PILOT Guomao TEST ONLY evidence: Meituan `¥19.90`, Douyin `¥21.90`, partner `¥20.90`; the lowest-price marker is rendered on Meituan. The `2/2` storefront browser test checks the direct price values and the existing three-store/three-viewport path.
- Refreshed screenshots: `storefront-375.png`, `storefront-390.png`, `storefront-430.png`. Consumer service and external-action child pages now share the storefront warm palette and button/card language.
- Status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`; no assertion is made that the product owner has accepted the commercial UI.
