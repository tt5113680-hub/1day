# G1-W∞-74 消费者门店页真实数据深页 densify（MH5-03 toward PARITY）

- slice: `G1-R-STORE-DEEP`（商用前提：消费者 H5 完整对标美团 App 到店浏览）
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**（工程 densify；`/c/stores/[id]` 商家消费者页补齐真实数据「门店入口分布」深页密度；非主人 G1 签）
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner 2026-08-11 21:47：**完整对标是商用前提，工具身份文案收尾 ≠ 商用完成。**
消费者 H5 深页真实数据密度序列 W∞-71（channel 深页 group-buy/menu/profile/membership）、W∞-72
（统一入口 `/c/entry`）、W∞-73（发现/附近 `/c/discovery`）已收。本轮把消费者 **商家消费者页
`/c/stores/[id]`**（美团 App 到店浏览 `MH5-03`，inventory 仍 `PARTIAL`）补齐「门店入口分布」真实数据
深页密度（禁止假 BI），与 W∞-71/72/73 共享白卡 + 黄渐变色条视觉语言；W∞-33 已保证该页视觉/IA，
本轮承接其实数据密度。

## Delivered

| 变更 | 美团 App 习惯 / 深页密度 |
| ---- | ------------------------ |
| 白卡 `heroCard` `aria-label="门店概况"`（h2 门店名 + 诚实描述） | 列表密度 |
| 白卡概况条 `summaryStrip` `aria-label="门店数据概况"`（平台入口 / 服务项 / 在册权益） | 关键指标可读 |
| 白卡分布面板 `aria-label="门店入口分布"` + 黄渐变色条（平台入口/服务类型/行动入口/内容类型/装修模块五组） | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、评分为本地试运营提示、成交在美团/抖音/扫呗等外部平台完成、仅统计入口痕迹、非本平台下单） | 诚实边界 |

保留既有：sticky 黄顶栏（返回 + 门店名 + 搜索 pill）、封面 hero + 营业中 + 导航/电话/分享、
sticky 分区 sub-tab 锚点、门店切换器、storefront modules 渲染、`StorefrontFloatingConsult`、
FunnelPageBeacon 行为绑定、ConsumerShell 底部导航与工具身份眉标（推广员工具 · 商家入口页）。

### 分布面板（全部由既有 `StoreDetail` 真实档案行现场推导）

- **平台入口分布**：按 `platformOffers[].platformType` 映射 美团 / 抖音 / 扫呗 / 直接外链（频次降序）
- **服务类型分布**：按 `services[].duration_minutes` 分桶 未标时长 / 短时段 ≤30 分钟 / 中时段 31-90 分钟 / 长时段 90 分钟+
- **行动入口分布**：按 `actions[].actionType` 咨询 / 平台入口 / 其它行动
- **内容类型分布**：按 `content[].content_type`（未配置兜底 未分类）
- **装修模块分布**：按 `effectiveStorefrontModules(storefront.modules)` 各 `module_type` 归并 服务/套餐 / 比价 / 权益 / 门店信息 / 其它模块

宽度百分比 `barWidth(total, b.value)` 由真实行数推导，空数据「暂无平台入口记录 / 暂无服务记录 /
暂无行动入口 / 暂无内容记录 / 暂无装修模块」。

## 技术实现

- `apps/consumer-web/app/c/stores/[id]/store.tsx`：
  - 新增 `countBy`/`barWidth`/`platformLabel`/`serviceBucket`/`moduleBucket` helper，全部由
    `data.platformOffers`、`data.services`、`data.actions`、`data.content`、
    `effectiveStorefrontModules(data.storefront?.modules)` 真实行/字段现场推导（禁止假 BI）
  - 新增 heroCard + summaryStrip（平台入口/服务项/在册权益）+ distribution 面板（五组分布）+ honest 底注
  - 保留全部原交互：门店概览/操作/分区 tab、门店切换器、storefront modules、浮窗咨询、行为绑定、
    ConsumerShell 与工具身份与诚实边界 copy 全保留
- `apps/consumer-web/app/c/stores/[id]/store.module.css`：
  - 新增 `.heroCard/.heroHead/.summaryStrip/.distribution/.panelHead/.panelBlock/.barLabel/.bars/.barRow/
    .barEmpty/.honest` 灰底白卡 + 黄渐变色条
    `linear-gradient(90deg, var(--od-brand-700), var(--od-brand-600))`，与 W∞-71/72/73 共享视觉语言
  - 新增组件全部 token 化（`var(--od-*)` / `var(--od-sf-*)`、`color-mix`），零 raw hex
  - 沿用既有 `--od-sf-canvas` 灰底画布与白卡 (`--od-sf-white`) / 卡片阴影 (`--od-sf-shadow-card`)

## 工具身份与诚实边界（全保留）

- 源 source=local；评分/价格/月售为本地试运营提示，不接美团/抖音实时商户数据
- 成交在美团/抖音/扫呗等外部平台完成；仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额
- 不包含本平台收款 · 非本平台下单 · 不在此下单
- 不复活 `consumer_orders` / 本平台下单/收单

## 随动更新

- `tests/g1-winf33-store-visual-parity.test.mjs`：诚实边界断言由旧的 `doesNotMatch(/本平台下单/)`
  → 随动更新为肯定 `非本平台下单`（新诚实边界更强表述；意图不变），与 W∞-11/32/42/45 同类随动一致。

## Verify

```text
node --test tests/g1-winf74-consumer-store-deep.test.mjs            # 4/4
node --test tests/g1-winf33-store-visual-parity.test.mjs            # 随动 4/4
node --test tests/g1-winf*.test.mjs                                 # 249/249
pnpm --filter @oneday/consumer-web typecheck                        # PASS
pnpm --filter @oneday/consumer-web build                            # PASS (含 /c/stores/[id])
pnpm build                                                          # 20/20
pnpm typecheck                                                      # 20/20
pnpm test:unit                                                      # 47 passed（2 个 pre-existing token 失败照旧）
eslint + prettier clean
```

## Remaining to PARITY

消费者门店页 `MH5-03` 仍需门店真实封面图/更丰富卡格与详情密度 before → inventory `PARITY`。
非主人签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；未宣称全部商用。

## No-Go 复核

- 无 schema/DB/API 变更（仅前端视觉 + 文案 densify）
- 未复活 consumer_orders / 本平台下单/收单
- 未代签主人验收；状态为工程 densify PASS
