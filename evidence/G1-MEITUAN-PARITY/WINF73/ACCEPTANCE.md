# G1-W∞-73 消费者发现/附近真实数据深页 densify（MH5-01 toward PARITY）

- slice: `G1-R-DISCOVERY-DEEP`（商用前提：消费者 H5 完整对标美团 App 到店浏览）
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**（工程 densify；`/c/discovery` 附近/发现页补齐真实数据「附近商家分布」深页密度；非主人 G1 签）
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner 2026-08-11 21:47：**完整对标是商用前提，工具身份文案收尾 ≠ 商用完成。**
Management/Platform/Channel/Circle/Employee 各面已收 W∞-45~70；消费者频道深页已收 W∞-71
（group-buy/menu/membership/profile）、统一入口 `/c/entry` 已收 W∞-72。本轮把消费者 **发现/附近页
`/c/discovery`**（美团 App 外卖 LBS 首页型，`MH5-01` 附近，唯一仍缺真实数据深页密度的消费者一级入口）
补齐「附近商家分布」真实数据深页密度（禁止假 BI），与 W∞-32/33（discovery/store 视觉/IA）及
W∞-71/72 深页序列共享白卡 + 黄渐变条视觉语言。

## Delivered

| 变更 | 美团 App 习惯 / 深页密度 |
| ---- | ------------------------ |
| 白卡 `heroCard` `aria-label="附近概况"`（h1 附近与全网引流商家 + 诚实描述） | 列表密度 |
| 白卡概况条 `summaryStrip` `aria-label="附近数据概况"`（附近商家 / 渠道推荐 / 商圈栏目） | 关键指标可读 |
| 白卡分布面板 `aria-label="附近商家分布"` + 黄渐变色条（评分/距离/人气/入口可用/发现面五组） | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、评分月售为本地试用提示、成交在美团/抖音/扫呗等外部平台完成、仅统计入口痕迹、非本平台下单） | 诚实边界 |

保留既有：sticky 黄顶栏定位 + 搜索框、下划线 Tab（附近/推荐/商圈）、72px 商家卡列表、排序、
工具身份眉标、`/c/circles` 商圈进入、FunnelPageBeacon 行为绑定、底部 ConsumerStorefrontNav。

### 分布面板（全部由既有 `Discovery` 真实档案行现场推导）

- **评分分布**：按 `nearby[].rating` 分桶 暂无评分 / 低分 3.5 及以下 / 中等 3.6-4.2 / 高评 4.3+
- **距离带分布**：按 `nearby[].distanceKm` 分桶 1km 内 / 1-3km / 3-5km / 5km 外
- **人气带分布**：按 `nearby[].salesHint` 分桶 暂无人气 / 低人气 ≤100 / 中人气 101-500 / 高人 501+
- **入口可用性分布**：按 `nearby[].entryUrl` 可直接跳转 / 待商家补充入口
- **发现面分布**：跨 `nearby[]` + `channels[].merchants[]` + `circles[].merchants[]` 附近商家 / 渠道推荐 / 商圈商家

宽度百分比 `barWidth(nearbyTotal, b.value)` 由真实行数推导，空数据「暂无附近记录/暂无发现记录」。

## 技术实现

- `apps/consumer-web/app/c/discovery/discovery.tsx`：
  - 新增 `ratingBucket`/`distanceBucket`/`salesBucket`/`countBy`/`barWidth` helper，全部由 `data.nearby`、
    `data.channels`、`data.circles` 真实行现场推导（禁止假 BI）
  - 新增 heroCard + summaryStrip（附近商家/渠道推荐/商圈栏目）+ distribution 面板（五组分布）+ honest 底注
  - 保留全部原交互：定位、搜索、下划线 Tab、排序、附近/推荐/商圈 section、`trackMerchantOpen` 行为与
    `ConsumerStorefrontNav`（工具身份与诚实边界 copy 全保留）
- `apps/consumer-web/app/c/discovery/discovery.module.css`：
  - 新增 `.heroCard/.heroHead/.summaryStrip/.distribution/.panelHead/.panelBlock/.barLabel/.bars/.barRow/
    .barEmpty/.honest` 灰底白卡 + 黄渐变色条
    `linear-gradient(90deg, var(--od-brand-700), var(--od-brand-600))`，与 W∞-71/72 共享视觉语言
  - 新增组件全部 token 化（`var(--od-*)` / `var(--od-sf-*)`、`color-mix`），零 raw hex
  - 沿用既有灰底画布 `#f5f5f5`（W∞-32 已定，本次新增白卡/分布沿用其画布）

## 工具身份与诚实边界（全保留）

- 源 source=local；评分/月售为本地试用提示，不接美团/抖音实时商户数据
- 成交在美团/抖音/扫呗等外部平台完成；仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额
- 不包含本平台收款 · 非本平台下单 · 不在此下单
- 不复活 `consumer_orders` / 本平台下单/收单

## 随动更新

- `tests/g1-winf11-discovery-nearby.test.mjs`：诚实边界断言由旧的 `doesNotMatch(/本平台下单/)`
  → 随动更新为肯定 `非本平台下单` + `仅统计观看/访问/跳转/停留/分享入口痕迹`（新诚实边界更强表述；意图不变）
- `tests/g1-winf32-discovery-visual-parity.test.mjs`：同理随动更新 `本平台下单` 断言为 `非本平台下单`

## Verify

```text
node --test tests/g1-winf73-consumer-discovery-deep.test.mjs            # 4/4
node --test tests/g1-winf11-discovery-nearby.test.mjs                   # 随动 1/1
node --test tests/g1-winf32-discovery-visual-parity.test.mjs            # 随动 3/3
node --test tests/g1-winf*.test.mjs                                     # 245/245
pnpm --filter @oneday/consumer-web typecheck                            # PASS
pnpm --filter @oneday/consumer-web build                                # PASS (含 /c/discovery)
pnpm build                                                              # 20/20
pnpm typecheck                                                          # 20/20
pnpm test:unit                                                          # 47 passed（2 个 pre-existing token 失败照旧）
eslint + prettier clean
```

## Remaining to PARITY

消费者发现/附近 `MH5-01` 仍需真实门店封面图/更丰富附近卡格 before → inventory `PARITY`。
非主人签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；未宣称全部商用。

## No-Go 复核

- 无 schema/DB/API 变更（仅前端视觉 + 文案 densify）
- 未复活 consumer_orders / 本平台下单/收单
- 未代签主人验收；状态为工程 densify PASS
