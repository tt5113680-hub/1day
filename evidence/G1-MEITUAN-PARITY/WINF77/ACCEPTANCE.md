# G1-W∞-77 消费者剩余 PARTIAL 套餐/服务过程/门店「我的服务」真实数据深页 densify（service.tsx + process.tsx + channel.tsx profile，toward PARITY）

- slice: `G1-R-CONSUMER-REMAINING-DEEP`（商用前提：消费者 H5 完整对标美团 App 到店浏览 / 服务过程 / 我的服务）
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**（工程 densify；消费者 H5 剩余三个 PARTIAL 真实数据面补齐深页密度 + 旧暖色/蓝色 hex 白板 token 化；非主人 G1 签）
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner 2026-08-11 21:47：**完整对标是商用前提，工具身份文案收尾 ≠ 商用完成。**
消费者 H5 真实数据密度序列 W∞-71（channel 频道）、W∞-72（统一入口 `/c/entry`）、W∞-73（发现/附近
`/c/discovery`）、W∞-74（商家消费者页 `/c/stores/[id]`）、W∞-75（`/c/profile` + `/c/circles`）、W∞-76
（商圈详情 `/c/circles/[id]` + 搜索 `/c/search` + 外链确认 `/c/actions/[id]`）已收。本轮把消费者面剩余
PARTIAL 的 **`/c/services/[id]` 套餐详情**、**`/c/processes/[id]` 服务过程** 补上真实数据深页密度
（禁止假 BI）；并把 `/c/stores/[id]` 下 **profile（我的服务）** 频道补上「我的服务分布」；同时把套餐页
旧暖色 hex 白板（`#392119`/`#fff9f5`/`#b54935`）与服务过程页旧蓝色 hex 白板（`#312e81`/`#2563eb`）
全面改挂 token 化灰底白卡 + 黄顶栏视觉语言，与 W∞-71~76 共享白卡 + 黄渐变色条视觉语言。

## Delivered

### `/c/services/[id]`（套餐详情 / 服务说明）

| 变更 | 深页密度 |
| ---- | ------- |
| 全页改挂 `od-sf-theme` + sticky 黄顶栏 `topBar`（套餐详情 + 推广员工具 mark） | 消费者 H5 入口栏 |
| 灰底画布 + 白卡 `heroCard` `aria-label="套餐概况"`（h2 套餐名 + 诚实描述） | 密度 |
| 白卡概况条 `summaryStrip` `aria-label="套餐数据概况"`（平台入口 / 覆盖平台 / 服务权益） | 关键指标 |
| 白卡分布面板 `aria-label="套餐比价分布"` + 黄渐变色条（平台入口 / 价格带 / 时长类型 / 服务权益 / 内容类型五组） | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、本页只做套餐说明与比价、成交经确认页跳转美团/抖音/扫呗第三方、仅统计入口痕迹、不含支付金额、不在此下单 · 非本平台下单） | 诚实边界 |
| 旧暖色 `radial-gradient(#fff0e4)`/`#392119`/`#fff9f5`/`#b54935`/`#826c64` 白板全部改挂 `--od-sf-*` / `--od-brand-*` token | token 化（零 warm hex 底） |

### `/c/processes/[id]`（服务过程 / 进度查询）

| 变更 | 深页密度 |
| ---- | ------- |
| 全页改挂 `od-sf-theme` + sticky 黄顶栏 `topBar`（服务过程 + 推广员工具 mark） | 消费者 H5 入口栏 |
| 灰底画布 + 白卡 `heroCard` `aria-label="服务过程概况"`（h2 服务进度查询 + 诚实描述） | 密度 |
| 白卡概况条 `summaryStrip` `aria-label="服务过程数据概况"`（服务编号 / 当前状态 / 结果回执） | 关键指标 |
| 白卡分布面板 `aria-label="服务过程分布"` + 黄渐变色条（进度状态 / 咨询与预约 / 核销与异常 / 结果回执状态四组） | 真实数据深页密度（禁止假 BI） |
| honest 底注（source=local、本页仅展示门店侧服务痕迹与咨询进度、非第三方订单履约、不含支付金额、不在此下单 · 非本平台下单） | 诚实边界 |
| 旧蓝色 `gradient(#312e81,#2563eb)`/`#f5f7fb`/`#0f172a`/`#4f46e5`/`#dbeafe` 白板全部改挂 `--od-sf-*` / `--od-brand-*` token；warning 块 `#fed7aa`/`#fff7ed`/`#9a3412` 改挂 `--od-brand-200` / `--od-warn-bg` / `--od-warn-ink` | token 化（零 raw-hex 底） |

### `/c/stores/[id]/profile`（门店「我的服务」频道）

| 变更 | 深页密度 |
| ---- | ------- |
| profile 频道新增白卡分布面板 `aria-label="我的服务分布"`（入口类型 / 菜单服务类型 / 门店服务覆盖三组） | 真实数据深页密度（禁止假 BI） |
| 对应 `channel.module.css` 复用 W∞-71 已有 `.distribution/.panelHead/.panelBlock/.barLabel/.bars/.barRow/.barEmpty` 灰底白卡 + 黄渐变色条 | 共享视觉语言 |

## 分布面板（全部由既有真实档案行现场推导，禁止假 BI）

### `/c/services/[id]` —— 由 `ServiceDetail.platformOffers[]` + `service` + `benefits[]` + `content[]` 真实行推导

- **平台入口分布**：按 `platformOffers[].platformType` 经 `platformLabel` 中文（美团团购/抖音团购/扫呗平台/其他平台·外链）
- **价格带分布**：按 `platformOffers[].offerPrice` 分桶 ¥0-100 / ¥100-200 / ¥200+
- **时长类型分布**：按 `service.durationMinutes`（定时服务 N 分钟 / 到店自取）
- **服务权益分布**：按 `benefits[].title`（每家权益 1）
- **内容类型分布**：按 `content[].content_type`（未分类兜底）

宽度百分比 `barWidth(total, b.value)` 由真实行数推导，空数据「暂无平台入口记录 / 暂无服务权益 / 暂无套餐资料」。

### `/c/processes/[id]` —— 由 `ProcessData.process` + `order` + `verification` + `connectorResults[]` 真实行推导

- **进度状态分布**：按 `process.status` + `order.status`（处理中/已登记）
- **咨询与预约分布**：按 `process.consultationStatus` + `process.appointmentAt`（咨询已完成/咨询处理中、已预约安排/待预约安排）
- **核销与异常分布**：按 `verification.status`（已核销/待核销/暂未生成）+ `process.exceptionFeedback`（有异常反馈/无异常反馈）
- **结果回执状态分布**：按 `connectorResults[].status`（未回执兜底）

宽度百分比 `barWidth(total, b.value)` 由真实行数推导，空数据「暂无结果回执」。

### `/c/stores/[id]/profile` —— 由 `StoreDetail.externalLinks[]` + `services[]` + `stores[]` 真实行推导

- **入口类型分布**：按 `externalLinks[].platformType` 经 `shortPlatform` 中文（美团/抖音/扫呗平台/外链）
- **菜单服务类型分布**：按 `services[].duration_minutes`（定时服务 / 到店自取）
- **门店服务覆盖分布**：按 `stores[].name` + `store.name` 频次降序

宽度百分比 `barWidth(total, b.value)` 由真实行数推导，空数据「暂无外链入口记录 / 暂无菜单服务记录 / 暂无门店记录」。

## 技术实现

- `apps/consumer-web/app/c/services/[id]/service.tsx`：
  - 新增 `countBy`/`barWidth` helper，全部由 `data.platformOffers[]`/`service`/`benefits[]`/`content[]` 真实字段现场推导（禁止假 BI）
  - 全页改挂 `od-sf-theme` + sticky 黄顶栏 `topBar` + heroCard + summaryStrip + distribution（五组分布）+ honest 底注
  - 保留全部原交互：返回菜单 / 快捷链 / 套餐卡（比价信息）/ 全平台团购价格（确认前往）/ 套餐详情 / 外链须知 / 服务权益 / 底部确认前往栏
- `apps/consumer-web/app/c/services/[id]/service.module.css`：
  - 整页改挂 `.page` 背景 `var(--od-sf-canvas)` + 新增 `.topBar/.heroCard/.heroHead/.summaryStrip/.distribution/.panelHead/.panelBlock/.barLabel/.barRow/.barRow>span/.barRow>b/.barRow>i/.barRow>em/.barEmpty/.honest` 灰底白卡 + 黄渐变色条 `linear-gradient(90deg, var(--od-brand-700), var(--od-brand-600))`；`::color` 指令 `text-transform: uppercase` 修正 typo
  - 旧暖色 hex 全部改挂 `--od-sf-*`/`--od-brand-*` token（产品图/主按钮/主色仅留 `#fff` 文字）
- `apps/consumer-web/app/c/processes/[id]/process.tsx`：
  - 新增 `countBy`/`barWidth` helper，全部由 `data.process`/`order`/`verification`/`connectorResults[]` 真实字段现场推导（禁止假 BI）
  - 全页改挂 `od-sf-theme` + sticky 黄顶栏 `topBar` + heroCard + summaryStrip + distribution（四组分布）+ honest 底注；保留处理进度时间线 / 结果回执 / 异常反馈 / 底部提示
- `apps/consumer-web/app/c/processes/[id]/process.module.css`：
  - 整页改挂 token 化灰底白卡 + `.topBar/.heroCard/.heroHead/.summaryStrip/.distribution/.panelHead/.panelBlock/.barLabel/.barRow/.barEmpty/.honest`；旧蓝白板 hex 全改挂 `--od-sf-*`/`--od-brand-*`；warning 块改挂 `var(--od-brand-200)`/`var(--od-warn-bg)`/`var(--od-warn-ink)`
- `apps/consumer-web/app/c/stores/[id]/channel.tsx`：
  - 新增 `profileEntryDist`/`profileServiceDist`/`profileStoreDist`/`profileStoreTotal` memo，全部由 `data.externalLinks[]`/`services[]`/`stores[]`/`store.name` 真实字段现场推导
  - profile 频道新增 `我的服务分布` 面板 + 保留 quickLinks 与 `MemberProfileChannel`

## 工具身份与诚实边界（全保留）

- `/c/services/[id]`：本页只做套餐说明与比价，成交经确认页跳转美团/抖音/扫呗等第三方；源 source=local；仅统计入口痕迹；不含支付金额；不在此下单 · 非本平台下单；不复活 consumer_orders / 本平台下单/收单
- `/c/processes/[id]`：本页仅展示门店侧服务痕迹与咨询进度，非美团/抖音/扫呗等第三方订单履约；源 source=local；不含支付金额；不在此下单 · 非本平台下单；不复活 consumer_orders
- `/c/stores/[id]/profile`：本店档案行现场推导，成交/库存/核销以美团/抖音/扫呗等第三方实际为准；仅统计入口与到店服务痕迹；不包含本平台收款 · 非本平台下单；不复活 consumer_orders

## 随动更新

- 无现有 g1-winf 测试断言被改动（g1-winf14 / g1-winf15 / g1-winf71 全部保持不变且通过）。
- 新增 `tests/g1-winf77-consumer-service-process-profile-deep.test.mjs` 5/5。
- 说明：`one-code/[code]` 与 `share/[code]` 为瞬时重定向页（解析后立即 `router.replace`，无驻留数据），
  无真实行可推导分布，故**不在本轮补假 BI 分布面板**；其加载态保持诚实文案（SYS-22 / W∞-7/8 已覆盖）。

## Verify

```text
node --test tests/g1-winf77-consumer-service-process-profile-deep.test.mjs  # 5/5
node --test tests/g1-winf*.test.mjs                                          # 264/264
pnpm --filter @oneday/consumer-web typecheck                                  # PASS (含 /c/services/[id] /c/processes/[id] /c/stores/[id])
pnpm typecheck                                                                # 20/20
pnpm build                                                                    # 20/20 (consumer-web 含三面)
pnpm test:unit                                                                # 47 passed（2 个 pre-existing token 失败照旧）
eslint + prettier clean（本轮改动文件）
```

## Remaining to PARITY

消费者套餐详情 `MH5-03` 深页、服务过程深页、门店「我的服务」仍需真实封面/更丰富卡格与详情密度 before →
inventory `PARITY`。非主人签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；未宣称全部商用。

## No-Go 复核

- 无 schema/DB/API 变更（仅前端视觉 + 文案 densify）
- 未复活 consumer_orders / 本平台下单/收单
- 未代签主人验收；状态为工程 densify PASS
