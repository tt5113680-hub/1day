# G1-W∞-72 统一消费者入口真实数据深页 densify（MH5-01/13 toward PARITY）

- slice: `G1-R-CONSUMER-ENTRY-DEEP`（商用前提：消费者 H5 完整对标美团 App 到店浏览）
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**（工程 densify；`/c/entry` 消费者统一入口由旧暖色白板视觉 → 美团 App 到店浏览视觉/IA + 真实数据分布；非主人 G1 签）
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner 2026-08-11 21:47：**完整对标是商用前提，工具身份文案收尾 ≠ 商用完成。**
Management/Platform/Channel/Circle/Employee 各面已收 W∞-45~70；消费者频道深页已收 W∞-71
（`/c/stores/[id]` group-buy/menu/membership/profile）。本轮把 **消费者统一入口 `/c/entry`**
（美团 App 首页型/统一入口，MH5-01/13 语境）从旧暖色白板视觉 densify 到美团 App 到店浏览
视觉/IA，并补齐真实入口档案分布（禁止假 BI），与 W∞-32/33（discovery/store）与 W∞-71 频道深页
序列共享视觉语言。

## Delivered

| 变更 | 美团 App 习惯 / 深页密度 |
| ---- | ------------------------ |
| sticky 黄顶栏 `topBar`（返回 + 居中「统一入口」+ 推广员工具 mark） | 美团 App 顶部导航 |
| 灰底画布 `--od-sf-canvas` + 白卡 `heroCard`（h1 + 诚实描述） | 列表密度 |
| 白卡概况条 `summaryStrip`（快捷入口 / 覆盖平台 / 入口分流） | 关键指标可读 |
| 白卡分布面板 `aria-label="统一入口分布"` + 黄渐变色条 | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、成交在美团/抖音/扫呗等外部平台完成、仅统计入口痕迹、非本平台下单） | 诚实边界 |

### 分布面板（全部由既有 `ConsumerAction[]` 真实入口档案行现场推导）

- **平台入口分布**：`platformLabel(action.platform)` → 美团/抖音/扫呗平台/外链，频次降序
- **入口类型分布**：`entryTypeLabel(action.actionType)` → 咨询跟进/平台入口/外链服务
- **落地方案分布**：`landingLabel(action.platform)` → 美团团购/抖音团购/扫呗入口/直接外链

宽度百分比 `barWidth(actionCount, b.value)` 由真实行数推导，空数据「暂无记录」。

## 技术实现

- `apps/consumer-web/app/c/entry/consumer-entry.tsx`：
  - `import '@oneday/storefront-renderer/storefront.css'` 引入共享 storefront token 作用域
  - `<main className={`${styles.page} od-sf-theme`}>` 挂 storefront token 作用域
  - 黄顶栏 `topBar/backLink/topTitle/topMark`（返回发现）+ heroCard + summaryStrip + distribution 面板
  - `countBy`/`barWidth`/`platformLabel`/`entryTypeLabel`/`landingLabel` helper + 三组分布
  - 保留全部原交互：快捷入口（发现门店/商圈联盟/第三方入口）、服务与权益卡、立即行动、FunnelPageBeacon、底部导航
  - 保留工具身份 + 诚实边界 copy（成交在美团/抖音/扫呗等外部平台完成、经确认页跳转、仅统计观看/访问/跳转/停留/分享入口痕迹）
- `apps/consumer-web/app/c/entry/consumer-entry.module.css`：
  - 旧暖色（`#f6f8fb`/`#1649bd`/青色渐变 hero）全部替换为灰底白卡画布 `od-sf-theme`
  - 黄渐变条（`linear-gradient(90deg, var(--od-brand-700), var(--od-brand-600))`），≤900px 单列
  - 全部 token 化（`var(--od-*)` / `var(--od-sf-*)`），**零 raw hex**（与 W∞-32/33/45+/71 共享视觉语言）
  - 平台字形 `platformmeituan/douyin/saabei/external`（`--od-sf-platform-*`）

## 工具身份与诚实边界（全保留）

- 源 source=local；成交以美团/抖音/扫呗等第三方平台实际为准
- 仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额
- 不包含本平台收款 · 非本平台下单 · 不在此下单
- 不复活 `consumer_orders` / 本平台下单/收单

## 随动更新

- `tests/g1-winf9-consumer-entry.test.mjs`：断言由旧视觉 markers（`推广员入口`/`只统计至出站`）
  → 新 densify markers（`推广员工具` / `仅统计观看/访问/跳转/停留/分享入口痕迹`），意图保留（工具身份 + 诚实边界）

## Verify

```text
node --test tests/g1-winf72-consumer-entry-deep.test.mjs            # 4/4
node --test tests/g1-winf9-consumer-entry.test.mjs                  # 随动 1/1
node --test tests/g1-winf*.test.mjs                                 # 241/241
pnpm --filter @oneday/consumer-web typecheck                        # PASS
pnpm --filter @oneday/consumer-web build                            # PASS (含 /c/entry)
pnpm build                                                          # 20/20
pnpm test:unit                                                      # 47 passed（2 个 pre-existing token 失败照旧）
eslint + prettier clean
```

## Remaining to PARITY

消费者统一入口 `/c/entry` 仍需真实门店封面图/更丰富入口卡格 before → inventory `PARITY`。
非主人签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；未宣称全部商用。

## No-Go 复核

- 无 schema/DB/API 变更（仅前端视觉 + 文案 densify）
- 未复活 consumer_orders / 本平台下单/收单
- 未代签主人验收；状态为工程 densify PASS
