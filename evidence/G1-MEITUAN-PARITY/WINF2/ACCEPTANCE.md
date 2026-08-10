# G1-W∞-2 Consumer H5 搜索（MH5-02，美团 App 同构）

- slice: `G1-R-MEITUAN-H5-SEARCH`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS**（engineering；非 owner G1 签收）

## What changed

对标美团 App「搜索」入口，把 W2 中禁用的搜索壳升级为**可用的商家搜索面**。

1. **API 层**：`ConsumerDiscoveryService.search` + 新增 `GET /api/v1/consumer/search?tenant=:slug&q=:term[&latitude&longitude]`
   - 按 `m.name ILIKE` 检索该租户 `active` 商户，且必须存在 `active` store（发布面）才返回；
   - 返回 `tenant / query / items[]`（id、name、address、entryUrl `/c/stores/:id?tenant=`、local_pilot rating、salesHint、可选 distanceKm）；
   - `tenant` 无效/缺失、`q` 为空、latitude/longitude 只传其一 → `400`；租户不存在 → `404`；
   - **租户 fail-closed**：仅检索传入租户，跨租户商户不泄漏。
2. **UI 层**：Consumer H5 新增 `/c/search`（`page.tsx` 服务端 + `search.tsx` 客户端 + `search.module.css`）
   - 美团 App 同构搜索表单（占位「搜索商家 / 品类」+ 搜索按钮，回车/点击提交）；
   - 结果卡 = 商家缩略图 + 名称 + 地址 + local_pilot 评分/月售 + 距离，点进商家页；
   - 空结果/首访提示、加载失败/禁止状态（`AppStatePanel`）；
   - 全 `--od-*` token，无 raw hex；复用 `MobileShell` + `ConsumerStorefrontNav`。
3. **接线**：W2 中 `/c/discovery` 顶部禁用的搜索 `<input>` 改为可点击的搜索入口，跳转 `/c/search?tenant=:slug`。

## Verification

- `pnpm typecheck` **20/20 PASS**
- `pnpm build` **20/20 PASS**（consumer-web 路由新增 `/c/search` ƒ dynamic）
- `tests/page-c-consumer-search.test.mjs`（node API+DB，L2）**PASS**：
  - `system` 检索「幸福面馆」命中已发布商户，entryUrl 指向 `/c/stores/:id?tenant=system`；
  - 同租户「茶铺」关键词命中对应商户，非同名词不受污染；
  - 隔离租户商户（同一名称）在 `system` 下不返回（fail-closed 隔离）；
  - `q` 为空 → 400；只传 latitude 缺 longitude → 400；不存在租户 → 404。
- 回归 `page-c-002-api.test.mjs`（discovery 租户隔离）**PASS**；`resolve-consumer-tabs.vitest.ts` 3/3 PASS。

## Honest boundary

- 搜索范围为本地试点 DB 中该租户的已发布商户；未接美团实时搜索/商家/评价数据。
- rating 为 `local_pilot` 演示评分，非美团真实评价。
- 未做美团 App 像素级 1:1；本切片仅落 H5 搜索壳 + 结果链路（MH5-02 首刀）。
- Not owner G1 sign-off；不自动签名 `PRODUCT_OWNER_UI_ACCEPTANCE.md`。
- Next: 继续 W∞ 其余 GAP 逐页（Consumer H5 下单/订单、Management PC 深页等），直到 owner 签 G1。
