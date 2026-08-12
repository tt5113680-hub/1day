# G1-W∞-75 消费者「我的」会员资料 + 商圈联盟首页 真实数据深页 densify（MH5-09 / MH5-13 toward PARITY）

- slice: `G1-R-CONSUMER-PROFILE-CIRCLES-DEEP`（商用前提：消费者 H5 完整对标美团 App 到店浏览）
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**（工程 densify；消费者 H5 剩余 PARTIAL 深页补齐真实数据密度；非主人 G1 签）
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner 2026-08-11 21:47：**完整对标是商用前提，工具身份文案收尾 ≠ 商用完成。**
消费者 H5 深页真实数据密度序列 W∞-71（channel 深页）、W∞-72（统一入口 `/c/entry`）、W∞-73
（发现/附近 `/c/discovery`）、W∞-74（商家消费者页 `/c/stores/[id]`）已收。本轮把消费者面剩余
PARTIAL 的 **`/c/profile` 我的会员资料（MH5-09）** 与 **`/c/circles` 商圈联盟首页（MH5-13）** 补上
真实数据深页密度（禁止假 BI），与 W∞-71/72/73/74 共享白卡 + 黄渐变色条视觉语言。

## Delivered

### `/c/profile`（我的会员资料 MH5-09）

| 变更 | 深页密度 |
| ---- | ------- |
| sticky 黄顶栏 `topBar`（我的会员资料 + 推广员工具 mark） | H5 入口栏 |
| 灰底白卡画布（`--od-sf-canvas`）+ 白卡 `heroCard` `aria-label="我的会员概况"`（h2 会员名 + 诚实描述） | 密度 |
| 白卡概况条 `summaryStrip` `aria-label="我的会员数据概况"`（绑定身份 / 在册权益 / 服务记录） | 关键指标 |
| 白卡分布面板 `aria-label="我的会员分布"` + 黄渐变色条（绑定身份/权益/服务历史状态/服务历史时间四组） | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、权益与门店服务痕迹不代表美团/抖音/扫呗等第三方订单、非本平台下单、不在此下单） | 诚实边界 |

### `/c/circles`（商圈联盟首页 MH5-13）

| 变更 | 深页密度 |
| ---- | ------- |
| 灰底白卡画布 + 白卡 `heroCard` `aria-label="商圈概况"`（h2 商圈 + 诚实描述） | 密度 |
| 白卡概况条 `summaryStrip` `aria-label="商圈数据概况"`（可见商圈 / 本店经营 / 覆盖商户） | 关键指标 |
| 白卡分布面板 `aria-label="商圈分布"` + 黄渐变色条（行业/商户规模/覆盖距离/商圈身份四组） | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、商圈互助是入口引流与商家发现、成交在美团/抖音/扫呗等外部平台完成、仅统计入口痕迹、不在此下单、非本平台下单） | 诚实边界 |

## 分布面板（全部由既有真实档案行现场推导，禁止假 BI）

### `/c/profile` —— 由 `ProfileData` 真实行推导

- **绑定身份分布**：按 `profile.identities[].type` 映射 手机号 / 邮箱 / 其它（未分类兜底）
- **权益分布**：按 `benefits[].title`（每项在册权益 1）
- **服务历史状态分布**：按 `history[].status` 映射 已完成 / 待处理 / 已取消（未分类兜底）
- **服务历史时间分布**：按 `history[].occurredAt` 年月 `YYYY-MM`（非法时间兜底 未知时间）

### `/c/circles` —— 由 `CirclesData.items[]` 真实行推导

- **行业分布**：按 `items[].industryTag`（null 兜底 未分类）
- **商户规模分布**：按 `items[].merchantCount` 分桶 未收拢商户 0 / 精简联盟 1-5 / 中型联盟 6-15 / 规模联盟 16+
- **覆盖距离分布**：按 `items[].distanceKm` 分桶 未定位商圈 / 1km 内 / 1-3km / 3-5km / 5km 外
- **商圈身份分布**：按 `items[].ownedByViewer` / `items[].publicVisible` 本店经营 / 附近公开 / 邀请中

宽度百分比 `barWidth(total, b.value)` 由真实行数推导，空数据「暂无绑定身份 / 暂无权益 / 暂无服务记录 /
暂无商圈记录」。

## 技术实现

- `apps/consumer-web/app/c/profile/profile.tsx`：
  - 新增 `countBy`/`barWidth`/`historyStatusLabel` helper，全部由 `data.profile.identities`、
    `data.benefits`、`data.history` 真实行/字段现场推导（禁止假 BI）
  - 新增 sticky 黄顶栏 `topBar` + heroCard + summaryStrip + distribution 面板（四组分布）+ honest 底注
  - 保留全部原交互：已绑定身份 / 可用权益 / 服务历史 卡、隐私撤回授权（revoke）、loading/forbidden/error
    全状态与工具身份
- `apps/consumer-web/app/c/profile/profile.module.css`：
  - 旧暖色白板（`#f5f7fb`/`#0f172a`/`#3730a3`）全部改挂 token（`--od-sf-*` / `--od-brand-*` /
    `--od-success` / `--od-danger` / `color-mix`），零 raw hex
  - 新增 `.topBar/.heroCard/.heroHead/.summaryStrip/.distribution/.panelHead/.panelBlock/.barLabel/.bars/
    .barRow/.barEmpty/.honest` 灰底白卡 + 黄渐变色条
    `linear-gradient(90deg, var(--od-brand-700), var(--od-brand-600))`，与 W∞-71/72/73/74 共享视觉语言
- `apps/consumer-web/app/c/circles/circles-home.tsx`：
  - 新增 `countBy`/`barWidth`/`sizeBucket`/`distanceBucket` helper，全部由 `data.items[]` 真实行/字段
    现场推导（禁止假 BI）
  - 新增 heroCard + summaryStrip + distribution 面板（四组分布）+ honest 底注
  - 保留全部原交互：定位、行业 chips、排序（距离/商户数/本店优先）、本店经营/附近公开商圈卡列表、
    FunnelPageBeacon、ConsumerStorefrontNav、trackFunnelEvent
- `apps/consumer-web/app/c/circles/circles.module.css`：
  - 页面背景改挂 `--od-sf-canvas` 灰底画布
  - 新增 `.heroCard/.heroHead/.summaryStrip/.distribution/.panelHead/.panelBlock/.barLabel/.bars/.barRow/
    .barEmpty/.honest` 灰底白卡 + 黄渐变色条，共享视觉语言

## 工具身份与诚实边界（全保留）

- `/c/profile`：本页仅展示本店会员证明、权益与门店服务痕迹；不代表美团/抖音/扫呗等第三方订单；
  源 source=local；仅统计入口痕迹；不在此下单 · 非本平台下单；不复活 consumer_orders / 本平台下单/收单
- `/c/circles`：商圈互助 = 入口引流与商家发现；成交在美团/抖音/扫呗等第三方完成；源 source=local；
  仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额；不在此下单 · 非本平台下单
  非本平台下单；不复活 consumer_orders / 本平台下单/收单

## 随动更新

- `tests/g1-winf5-circles-densify.test.mjs`：诚实边界断言由旧的 `doesNotMatch(/本平台下单/)`
  → 随动更新为肯定 `非本平台下单`（新诚实边界更强表述；意图不变），与 W∞-33/39/47/73 同类随动一致。
- 新增 `tests/g1-winf75-consumer-profile-circles-deep.test.mjs` 5/5。

## Verify

```text
node --test tests/g1-winf75-consumer-profile-circles-deep.test.mjs  # 5/5
node --test tests/g1-winf5-circles-densify.test.mjs                 # 随动 1/1
node --test tests/g1-winf*.test.mjs                                 # 254/254
pnpm typecheck                                                      # 20/20
pnpm build                                                          # 20/20 (consumer-web 含 /c/profile /c/circles)
pnpm test:unit                                                      # 47 passed（2 个 pre-existing token 失败照旧）
eslint + prettier clean
```

## Remaining to PARITY

消费者商圈 `MH5-13` / 我的 `MH5-09` 仍需真实封面/更丰富卡格与详情密度 before → inventory `PARITY`。
非主人签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；未宣称全部商用。

## No-Go 复核

- 无 schema/DB/API 变更（仅前端视觉 + 文案 densify）
- 未复活 consumer_orders / 本平台下单/收单
- 未代签主人验收；状态为工程 densify PASS
