# CONSUMER-COMMERCIAL-HOME-V1

## 2026-08-08 follow-up: persisted platform package prices and visual alignment

- Added migration `047_store_service_platform_offers`: every displayed comparison price is bound to one tenant, store, recommended service package and active external platform action.
- The local HUMAN-PILOT seed now renders, for the Guomao TEST ONLY package, Meituan `¥19.90`, Douyin `¥21.90` and partner `¥20.90`, including the current-lowest marker. Prices remain TEST ONLY and the third-party destination remains the source of final price, stock and promotion truth.
- Consumer service-detail and external-action pages now use the storefront's warm commercial palette, cards and primary-button treatment. Tenant-specific theme/plugin editing is intentionally not expanded into Management during this Consumer-only acceptance task.
- Follow-up verification: 18-package typecheck/build through the HUMAN-PILOT image build, repository tests `184/184`, focused Playwright `2/2`, evidence contract `74/74`, and refreshed `375/390/430px` screenshots.

状态：`AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`

Consumer 商业首页已在本地 HUMAN-PILOT 环境完成实现和自动化验证；最终商业 UI 是否合格必须由产品负责人本人打开页面确认。实现与测试明细见 `evidence/CONSUMER-COMMERCIAL-HOME-V1/ACCEPTANCE.md`。

本地真人验收地址：

`http://127.0.0.1:3201/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot`
