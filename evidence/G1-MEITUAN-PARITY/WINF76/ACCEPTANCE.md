# G1-W∞-76 消费者剩余 PARTIAL 深页 densify（商圈详情 /c/circles/[id] + 搜索 /c/search + 外链确认 /c/actions/[id]，toward PARITY）

- slice: `G1-R-CONSUMER-REMAINING-DEEP`（商用前提：消费者 H5 完整对标美团 App 到店浏览 / 外链确认）
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**（工程 densify；消费者 H5 剩余 PARTIAL 深页补齐真实数据密度 + 外链确认页 token 化；非主人 G1 签）
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner 2026-08-11 21:47：**完整对标是商用前提，工具身份文案收尾 ≠ 商用完成。**
消费者 H5 真实数据密度序列 W∞-71（channel）、W∞-72（统一入口 `/c/entry`）、W∞-73（发现/附近
`/c/discovery`）、W∞-74（商家消费者页 `/c/stores/[id]`）、W∞-75（`/c/profile` + `/c/circles`）已收。
本轮把消费者面剩余 PARTIAL 的 **`/c/circles/[id]` 商圈详情**、**`/c/search` 搜索** 补上真实数据深页
密度（禁止假 BI）；并把 **`/c/actions/[id]` 外链确认**页从旧暖色 hex 白板全面改挂 token 化灰底白卡 +
黄顶栏视觉语言，与 W∞-71~75 共享白卡 + 黄渐变色条视觉语言。

## Delivered

### `/c/circles/[id]`（商圈详情 MH5-13 深页）

| 变更 | 深页密度 |
| ---- | ------- |
| 灰底白卡画布 + 白卡 `heroCard` `aria-label="商圈详情概况"`（h2 商圈名 + 诚实描述） | 密度 |
| 白卡概况条 `summaryStrip` `aria-label="商圈详情数据概况"`（入驻商户 / 可进店 / 商圈身份） | 关键指标 |
| 白卡分布面板 `aria-label="商圈详情分布"` + 黄渐变色条（商户可进店 / 商圈身份 / 入驻商户三组） | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、商圈互助是入口引流与商家发现、进店后团购/收银跳转由美团/抖音/扫呗完成、仅统计入口痕迹、不在此下单 · 非本平台下单） | 诚实边界 |

### `/c/search`（搜索 MH5-02）

| 变更 | 深页密度 |
| ---- | ------- |
| 灰底白卡画布 + 白卡 `heroCard` `aria-label="搜索结果概况"`（h2 查询词/搜索商家 + 诚实描述） | 密度 |
| 白卡概况条 `summaryStrip` `aria-label="搜索数据概况"`（匹配商家 / 可直接跳转 / 有评分） | 关键指标 |
| 白卡分布面板 `aria-label="搜索结果分布"` + 黄渐变色条（评分 / 距离带 / 入口可用性 / 人气带四组） | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、评分与月售为本地试用提示、进店与成交以美团/抖音/扫呗等外部平台为准、仅统计入口痕迹、不含支付金额、不在此下单 · 非本平台下单） | 诚实边界 |

### `/c/actions/[id]`（外链确认 W∞-3 续 densify）

| 变更 | 深页密度 |
| ---- | ------- |
| 全页改挂 `od-sf-theme` + sticky 黄顶栏 `topBar`（外链确认 + 推广员工具 mark） | 消费者 H5 入口栏 |
| 旧暖色 `radial-gradient(#fff0e4)`/`#392119`/`#826c64`/`#b54935` 白板全部改挂 `--od-sf-*` / `--od-brand-*` / `--od-success` / `--od-danger` / `color-mix` token | token 化（零 warm hex 底） |
| 白卡（meta / card / actions code）+ 黄渐变色条 honest 底注（source=local、只统计至确认/跳转、价格库存与成交以美团/抖音/扫呗等第三方实际结果、仅统计入口痕迹、不含支付金额、不在此下单 · 非本平台下单） | 诚实边界 |
| 平台品牌徽标（美团/踩音/饿了么/扫呗）品牌色保留（与 W∞-20 平台 mark 一致性） | 品牌 mark |

## 分布面板（全部由既有真实档案行现场推导，禁止假 BI）

### `/c/circles/[id]` —— 由 `CircleDetailData.merchants[]` + `circle` 真实行推导

- **商户可进店分布**：按 `merchants[].entryUrl`（可进店 / 暂无店页）
- **商圈身份分布**：按 `circle.ownedByViewer` / `circle.publicVisible`（本店经营 / 消费者视角、公开引流 / 定向可见）
- **入驻商户分布**：按 `merchants[].name` 频次降序（每家商户 1）

### `/c/search` —— 由 `SearchData.items[]` 真实行推导

- **评分分布**：按 `items[].rating` 分桶 暂无评分 / 低分 3.5 及以下 / 中等 3.6-4.2 / 高评 4.3+
- **距离带分布**：按 `items[].distanceKm` 分桶 未定位距离 / 1km 内 / 1-3km / 3-5km / 5km 外
- **入口可用性分布**：按 `items[].entryUrl`（可直接跳转 / 待商家补充入口）
- **人气带分布**：按 `items[].salesHint` 分桶 暂无人气 / 低 100 及以下 / 中 101-500 / 高 501+

宽度百分比 `barWidth(total, b.value)` 由真实行数推导，空数据「暂无商圈记录 / 暂无搜索结果」。

## 技术实现

- `apps/consumer-web/app/c/circles/[id]/circle-detail.tsx`：
  - 新增 `countBy`/`barWidth` helper，全部由 `data.merchants[]` + `data.circle` 真实字段现场推导（禁止假 BI）
  - 新增 heroCard + summaryStrip + distribution 面板（三组分布）+ honest 底注
  - 保留全部原交互：返回商圈 + FunnelPageBeacon + 圈内商家卡（进店跳转 / 暂无店页）+ trackFunnelEvent
- `apps/consumer-web/app/c/circles/circles.module.css`：复用已有 `.heroCard/.heroHead/.summaryStrip/
  .distribution/.panelHead/.panelBlock/.barLabel/.bars/.barRow/.barEmpty/.honest` 灰底白卡 + 黄渐变色条
  `linear-gradient(90deg, var(--od-brand-700), var(--od-brand-600))`
- `apps/consumer-web/app/c/search/search.tsx`：
  - 新增 `countBy`/`barWidth`/`ratingBucket`/`distanceBucket`/`salesBucket` helper，全部由
    `data.items[]` 真实字段现场推导（禁止假 BI）
  - 新增 heroCard + summaryStrip + distribution 面板（四组分布）+ honest 底注
  - 保留全部原交互：搜索表单 / 返回发现/商圈/统一入口 / 结果卡（评分/月售/距离/进店跳转）+
    ConsumerStorefrontNav + bindPageFunnel + trackFunnelEvent
- `apps/consumer-web/app/c/search/search.module.css`：整页改挂 token 化灰底白卡（`:root` 的 `--od-sf-*`），
  新增 `.heroCard/.heroHead/.summaryStrip/.distribution/.panelHead/.panelBlock/.barLabel/.bars/.barRow/
  .barEmpty/.honest` 灰底白卡 + 黄渐变色条，≤900px 单列，零 raw hex
- `apps/consumer-web/app/c/actions/[id]/action.tsx`：
  - 全页改挂 `od-sf-theme` + 新增 sticky 黄顶栏 `topBar`（外链确认 + 推广员工具 mark）
  - 新增 honest 底注（source=local、只统计至确认/跳转、第三方实际结果、仅统计入口痕迹、不含支付金额、
    不在此下单 · 非本平台下单）
  - 保留 `jump_confirm` 语义 + 外链确认/记录咨询并获取口令/复制专属口令 + surfaceFromScene/destinationHost
    全交互
- `apps/consumer-web/app/c/actions/[id]/action.module.css`：
  - 旧暖色 `#392119`/`#fff9f5`/`#b54935`/`#826c64`/`#f0e0d8` 白板全部改挂 `--od-sf-*` / `--od-brand-*` /
    `--od-success` / `--od-danger` / `color-mix` token
  - 平台品牌徽标（meituan/douyin/eleme/saabei）品牌色保留
  - 新增 `.topBar/.topTitle/.topMark/.honest` 黄顶栏 + 黄渐变色条视觉语言

## 工具身份与诚实边界（全保留）

- `/c/circles/[id]`：进店后的团购/收银跳转由美团/抖音/扫呗等外部平台完成；源 source=local；仅统计入口
  痕迹；不含支付金额；不在此下单 · 非本平台下单；不复活 consumer_orders / 本平台下单/收单
- `/c/search`：评分与月售为本地试用提示，进店与成交以美团/抖音/扫呗等外部平台为准；源 source=local；
  仅统计入口痕迹；不含支付金额；不在此下单 · 非本平台下单；不复活 consumer_orders
- `/c/actions/[id]`：只统计至「确认/跳转」，价格、库存与是否成交均为美团/抖音/扫呗等第三方实际结果；
  源 source=local；仅统计入口痕迹；不含支付金额；不在此下单 · 非本平台下单；不复活 consumer_orders

## 随动更新

- 无现有 g1-winf 测试断言被改动（g1-winf3/g1-winf10/g1-winf5/g1-winf75 全部保持不变且通过）。
- 新增 `tests/g1-winf76-consumer-circle-detail-search-actions-deep.test.mjs` 5/5。

## Verify

```text
node --test tests/g1-winf76-consumer-circle-detail-search-actions-deep.test.mjs  # 5/5
node --test tests/g1-winf*.test.mjs                                              # 259/259
pnpm --filter @oneday/consumer-web typecheck                                      # PASS (含 /c/circles/[id] /c/search /c/actions/[id])
pnpm typecheck                                                                     # 20/20
pnpm build                                                                         # 20/20 (consumer-web 含三深页)
pnpm test:unit                                                                     # 47 passed（2 个 pre-existing token 失败照旧）
eslint + prettier clean（本轮改动文件）
```

## Remaining to PARITY

消费者商圈详情 `MH5-13` 深页、搜索 `MH5-02`、外链确认仍需真实封面/更丰富卡格与详情密度 before →
inventory `PARITY`。非主人签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；未宣称全部商用。

## No-Go 复核

- 无 schema/DB/API 变更（仅前端视觉 + 文案 densify）
- 未复活 consumer_orders / 本平台下单/收单
- 未代签主人验收；状态为工程 densify PASS
