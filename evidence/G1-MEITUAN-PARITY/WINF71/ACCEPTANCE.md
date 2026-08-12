# G1-W∞-71 消费者深页 / 平台剩余 densify（MH5-04/05/06/10 完整对标）

- slice: `G1-R-CONSUMER-DEEP-DENSIFY`（商用前提：消费者 H5 完整对标美团 App 到店浏览）
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**（工程 densify；MH5-04/05/06/10 由 PARTIAL→toward PARITY；非主人 G1 签）
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner 2026-08-11 21:47：**完整对标是商用前提，工具身份文案收尾 ≠ 商用完成。**
Mgmt/Platform/Channel/Circle/Employee 各面已收 W∞-45~70；本轮把 **消费者 H5 频道深页**
（`/c/stores/[id]/group-buy` · `menu` · `membership` · `profile`，即 MH5-04/05/06/10）
从旧暖色白板视觉 densify 到美团 App 到店浏览视觉/IA，并补齐真实数据分布（禁止假 BI），
与 W∞-32/33（discovery/store）及 W∞-45+ 深页波共享视觉语言。

## Delivered

| 变更 | 美团 App 习惯 / 深页密度 |
| ---- | ------------------------ |
| sticky 黄顶栏 `topBar`（返回 + 居中频道名 + 推广员工具 mark） | 美团 App 顶部导航 |
| 灰底画布 `--od-sf-canvas` + 白卡 `heroCard`（h1 + 诚实描述） | 列表密度 |
| 白卡概况条 `summaryStrip`（频道数据概况） | 关键指标可读 |
| 白卡分布面板 `aria-label=团购比价分布/菜单分布/权益分布` + 黄渐变色条 | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、成交/核销以第三方为准、不包含本平台收款、非本平台下单） | 诚实边界 |

### 分布面板（全部由既有 `StoreDetail` 真实档案行现场推导）

- **group-buy** `团购比价分布`：
  - 平台入口分布（`data.platformOffers[].platformType` → 美团/抖音/扫呗平台/外链，`shortPlatform`）
  - 价格带分布（`offerPrice` 分桶 ¥0-100 / ¥100-200 / ¥200+，真实数值）
  - 每套餐比价深度（`groups` 内按 offers 长度 单平台/双平台比价/三平台以上）
- **menu** `菜单分布`：
  - 服务类型分布（`service.duration_minutes` → 定时服务 / 到店自取）
  - 价格说明分布（`service.price_label` → 已标价 / 到店询价）
- **membership** `权益分布`：在册权益（`data.benefits[]`）
- **profile**：会员身份/外链入口（member-state 驱动，无假分布）

宽度百分比 `barWidth(total, value)` 由真实行数推导，空数据「暂无记录」。

## 技术实现

- `apps/consumer-web/app/c/stores/[id]/channel.tsx`：
  - 取消旧 `.header` 暖色结构；`<main className={`${styles.page} od-sf-theme`}>` 挂 storefront token 作用域
  - 黄顶栏 `topBar/backLink/topTitle/topMark`；heroCard+summaryStrip+distribution 面板
  - `countBy`/`barWidth` helper + `platformDist/priceBandDist/compareDepthDist/menuTypeDist/servicePriceDist/benefitDist`
  - 保留全部原交互：入会/跨设备恢复/消费会话/平台行比价/菜单卡/快捷链/反馈
  - 保留工具身份 + 诚实边界 copy（比价聚合、本店会员、门店套餐说明、会员证明与外链入口；不在此下单、非本平台下单、不替代美团/抖音/扫呗会员）
- `apps/consumer-web/app/c/stores/[id]/channel.module.css`：
  - 灰底白卡画布 + 黄渐变条（`linear-gradient(90deg, var(--od-brand-700), var(--od-brand-600))`），≤900px 单列；全部 token 化、**零 raw hex**（W∞-32/33/45+ 共享视觉语言）

## 工具身份与诚实边界（全保留）

- 源 source=local；成交/库存/核销以美团/抖音/扫呗等第三方实际为准
- 不包含本平台收款 · 非本平台下单；不含支付金额
- 不替代美团/抖音/扫呗会员；团购仅比价后确认跳转
- 不复活 `consumer_orders` / 本平台下单/收单

## 随动更新

- `tests/g1-winf20-platform-naming.test.mjs`：platformLegend saabei 字形断言由单行 → 与 densify 后 multiline badge 对齐（意图保留）

## Verify

```text
node --test tests/g1-winf71-consumer-deep-densify.test.mjs            # 4/4
node --test tests/g1-winf12/13/10/14/20/21 ...                          # 9/9 回归
node --test tests/g1-winf*.test.mjs                                     # 237/237
pnpm --filter @oneday/consumer-web typecheck                            # PASS
pnpm --filter @oneday/consumer-web build                                # PASS
pnpm build                                                              # 20/20
pnpm test:unit                                                          # 47 passed（2 个 pre-existing token 失败照旧）
eslint + prettier clean
```

## Remaining to PARITY

MH5-04/05/06/10 仍需真实门店图/更丰富套餐卡格 before → inventory `PARITY`。
非主人签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；未宣称全部商用。
