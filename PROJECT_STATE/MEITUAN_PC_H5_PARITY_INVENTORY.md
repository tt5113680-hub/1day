# 美团 PC / H5 复刻清单（施工权威）

- created_at: 2026-08-10 23:30 Asia/Shanghai
- updated_at: 2026-08-11 21:47 Asia/Shanghai
- authority: 主人裁决 — **不做美团产品**；学习成熟管理系统/人员/代理/指标/开店链路（客户熟悉→上手快）；底盘仍为 ONEDAY；仅工作流整合页自研差异
- strategy: `PRODUCT_DUAL_TRACK_STRATEGY.md`
- rule: **对成熟场景施工**。禁止自创陌生管理 IA；也禁止宣称「已是美团」。

---

## 0.0 商用前提（主人 2026-08-11 21:47 重申）

> **完整对标是商用前提。** 四端（消费者 H5 / 员工 H5 / 管理 PC / 平台·渠道·商圈 PC）必须达到美团对应成熟场景的完整对标；**唯一例外** `/m/workflows` = ONEDAY 定制。
> 工具身份文案收尾 **不等于** 商用完成。状态列未到 `PARITY` 的页面不得宣称可商用。

## 0. 四套面对齐（学习源 · 2026-08-11 澄清）

> **不做美团产品。** 下列是「成熟场景学习源」：管理系统型、人员、代理、指标、开店链路 — 与 ONEDAY 业务重复、客户（美团/抖音/饿了么合伙经验）上手快。底盘仍是 ONEDAY。

| ONEDAY 终端 | 学习对象（成熟场景） | 形态 |
| ----------- | -------------------- | ---- |
| `consumer-web` | 美团 App 等到店浏览习惯 | H5 |
| `employee-web` | 美团商家端人员作业习惯 | H5 |
| `management-web` | 美团商家端 PC 管理型 | PC |
| `platform-web`（含 `/ch` `/bc`） | 美团平台/代理：层级、开通、归属 | PC |

---

## 0.1 执行原则

1. **源真相 = 上表成熟场景**，用来降低自创管理难度与客户适应成本；不是做成美团本体。
2. 每一页验收：导航分区、主操作、列表/筛/详、指标口径、开通链路是否贴近客户已熟悉习惯。
3. **唯一例外：** Management `/m/workflows`（工作流整合页）→ ONEDAY 定制。
4. 诚实边界：不宣称已接美团实时库存/价格 API；数据可用本地试点。
5. 状态列 `GAP` / `PARTIAL` / `PARITY` / `CUSTOM`。**PARITY = 导航/主操作/列表筛详/指标口径/视觉密度达到商用可试用的完整对标**（仍诚实声明非美团本体、不接实时美团 API）。`PARTIAL` = 未达商用前提。

---

## 1. 美团商家端 PC（管理/老板）— 目标信息架构

> 命名按美团商家常见能力归类；施工时以现网菜单文案为准微调，**不得用 ONEDAY 自创一级菜单替代整棵树**。

| ID | 美团对标模块（PC） | ONEDAY 现路由（若有） | 状态 | 备注 |
| -- | ----------------- | --------------------- | ---- | ---- |
| MPC-01 | 工作台 / 首页概览 | `/m/dashboard` | PARTIAL | W1 首刀；W∞-18/21 工具身份；**W∞-35** 视觉/IA densify（黄顶栏+icon 功能格+白卡面板+自定义指标）；**W∞-78** 真实数据深页分布（待办指标/客户门店/异常类型/提醒队列，source=local dashboard 行推导，禁止假 BI）；toward PARITY；见 WINF35/WINF78 |
| MPC-02 | 门店管理 | `/m/stores` | PARTIAL | W∞-19/23 工具身份；**W∞-38** 视觉/IA densify（黄顶栏+灰底白卡+概况条+门店卡）；**W∞-80** 真实数据深页 densify（`门店入口分布`：营业状态/负责人指派/启用平台入口/服务覆盖/近30日入口打开/待跟进负载，由真实 stores[].推导，禁止假 BI）；toward PARITY；见 WINF38/WINF80 |
| MPC-03 | 商品管理 | `/m/offers` | PARTIAL | W∞-19/23 工具身份；**W∞-39** 视觉/IA densify（黄顶栏+灰底白卡）；**W∞-47** 真实数据深页分布（套餐可见/门店/平台入口/Offer 状态/价格带，source=local 档案行推导，禁止假 BI）；toward PARITY；见 WINF39/WINF47 |
| MPC-04 | 订单中心 | — | PARTIAL | 只读档案/痕迹（`/m/orders`）+ 导航「订单痕迹」（W∞-21/22）；**W∞-42** 视觉 densify（黄顶栏+灰底白卡+heroCard+概况条+row 列表）；**W∞-45** 真实数据深页分布（状态/门店/来源，source=local 档案行推导，禁止假 BI）；toward PARITY；不做本平台成交；见 WINF42/WINF45 |
| MPC-05 | 评价管理 | `/m/reviews` | PARTIAL | 诚实档案/答复痕迹；W∞-23 导航+页头 `评价管理→评价档案`；**W∞-42** 视觉 densify（黄顶栏+灰底白卡+heroCard+概况条+row 列表）；**W∞-45** 真实数据深页分布（评分 5★~1★/门店，source=local 推导，禁止假 BI）；toward PARITY；不接第三方评价流；见 WINF42/WINF45 |
| MPC-06 | 顾客 / CRM | `/m/customers` | PARTIAL | W∞-24 工具身份收尾：`客户资产/驱动每次经营动作/经营管理权限` → `客户跟进`（eyebrow/title/状态/back-link/aria）；保留实名授权跟进/来源分层/归属与导出审批；**W∞-40** 视觉/IA densify（`/m/customers` + `/m/customers/[id]` 黄顶栏+灰底白卡+heroCard+白卡面板）；**W∞-46** 真实数据深页分布（分层/归属/标签，source=local 档案行推导，禁止假 BI）；toward PARITY；见 WINF40/WINF46 |
| MPC-07 | 营销中心（券/活动） | `/m/marketing` | PARTIAL | 本地营销活动档案；W∞-23 页头 `营销中心→营销活动`（对齐导航）；**W∞-42** 视觉 densify（黄顶栏+灰底白卡+heroCard+概况条+row 列表）；**W∞-45** 真实数据深页分布（状态/类型，source=local 推导，禁止假 BI）；toward PARITY；不接实时投放；见 WINF42/WINF45 |
| MPC-08 | 会员 | `/m/memberships` | PARTIAL | W∞-25 眉标 `会员中心`；会员码核销/ledger 工具身份；**W∞-41** 视觉/IA densify（黄顶栏+灰底白卡+heroCard+概况条+白卡会员卡+ledger）；**W∞-46** 真实数据深页分布（门店/入会时间，source=local 档案行推导，禁止假 BI）；toward PARITY；见 WINF41/WINF46 |
| MPC-09 | 数据 / 经营分析 | `/m/analytics` | PARTIAL | W∞-44 美团经营日报密度（`GET /api/v1/management/entry-funnel/daily-report` + `/m/analytics`：今日指标+环比+逐日明细，真实 L0–L2，禁止假 BI）；**W∞-81** 真实数据深页密度 densify（`经营分析分布`：今日漏斗/今日 L2 动作/逐日流量，由真实 daily 报表 L0–L2 痕迹行推导，禁止假 BI）；`/m/entry-funnel` `/m/attribution` 互链；toward PARITY；见 WINF44/WINF81 |
| MPC-10 | 员工 / 权限 | `/m/organization-employees`, `/m/roles-permissions` | PARTIAL | W∞-25 眉标 `员工管理`/`角色权限`、`员工表现`/`操作审计`；**W∞-43** 视觉/IA densify（`/m/organization-employees` + `/m/roles-permissions` 黄顶栏+灰底白卡+heroCard+概况条+白卡面板）；toward PARITY；见 WINF43 |
| MPC-11 | 店铺装修 / 展示 | `/m/page-builder`, `/m/content` | PARTIAL | **壳跟美团**；内容数据仍走 ONEDAY 发布链；W∞-25 眉标 `入口页装修`/`营销内容`（对齐导航）；**W∞-43** 视觉/IA densify（`/m/page-builder` + `/m/content` 黄顶栏+灰底白卡+heroCard+概况条+白卡面板）；toward PARITY；见 WINF43 |
| MPC-12 | 设置 | `/m/settings` | PARTIAL | W∞-12 densify 工具链 cross-link；W∞-25 眉标 `工具设置`（对齐导航）；W∞-26 状态口径 `经营设置/经营规则`→`工具设置/工具规则`（title/loading/forbidden/error/保存/成功提示）；**W∞-43** 视觉/IA densify（`/m/settings` 黄顶栏+灰底白卡+heroCard+白卡 fieldset 面板）；**W∞-82** 真实数据深页密度 densify（新增白卡概况条 `工具规则概况` + 白卡分布面板 `工具规则分布`：审批开关/提醒时限/免打扰/标签规则/归属分配/全平台可见引流，由当前已加载真实工具规则档字段现场推导，禁止假 BI）；toward PARITY；见 WINF43/WINF82 |
| MPC-13 | 消息 / 通知 | `/m/notifications` | PARTIAL | W∞-31 送「统一工作流」管理通知中心：只读聚合租户范围内待推进（跟进异常/待审批/进行中工作流）deepLink → `/m/customers` `/m/workflows`；**W∞-81** 真实数据深页密度 densify（改挂黄顶栏 topBar + heroCard + 概况条 + `通知分布`：通知类型/推进去向/待办负载，由真实租户待推进文件行推导，禁止假 BI）；见 WINF31/WINF81 |
| MPC-99 | **工作流整合** | `/m/workflows` | **CUSTOM** | **唯一不复刻美团的定制页**；W∞-25 眉标 `工作流整合` |

### PC 现有但须降级/改挂的 ONEDAY 页

下列页保留能力，但 **不得继续以「自创一级产品」名义占主导航**；整改时并入美团对应模块或收入「更多/设置」，避免和美团树打架：

| 现路由 | 处置 |
| ------ | ---- |
| `/m/attribution` | 并入顾客/经营分析美团同构区 |
| `/m/ai-suggestions` | 并入工作台建议或设置；禁止独立「AI 产品首页」感 |
| `/m/connectors` | 设置/对接意图；诚实边界 |
| `/m/external-actions` | 外链动作 → 美团「外链/活动」同类入口 |
| `/m/permission-audit` | 设置/安全审计 |
| `/m/employee-process-performance` | 员工绩效 → 美团人力/门店员工区 |
| `/m/funnels/[id]` | 并入顾客漏斗/经营 |

---

## 2. 美团 H5 — 消费者（§A–§C 语义）

| ID | 成熟型（学习源） | ONEDAY 现路由 | 状态 | 备注 |
| -- | ---------------- | ------------- | ---- | ---- |
| MH5-01 | 美团 App 外卖 LBS 首页 → **附近** | `/c/discovery` | PARTIAL | W2/W∞-11 壳+工具身份；**W∞-32** 视觉/IA densify（sticky 黄顶栏+下划线 Tab+72px 商家卡）；**W∞-73** 真实数据深页 densify（白卡 heroCard+summaryStrip+附近商家分布：评分/距离带/人气带/入口可用性/发现面，真实 Discovery 行推导，禁止假 BI）；toward PARITY；见 WINF32/WINF73 |
| MH5-02 | 搜索 | `/c/search` | PARITY | 检索+诚实试用提示+无下单免责；见 WINF2/WINF10 |
| MH5-03 | 美团商家门店页 → **商家消费者页** | `/c/stores/[id]` | PARTIAL | W2/W∞-13 工具身份；**W∞-33** 视觉/IA densify（黄顶栏+封面+导航电话分享+sticky 分区 Tab）；**W∞-74** 真实数据深页 densify（白卡 heroCard+summaryStrip 门店数据概况+门店入口分布：平台入口/服务类型/行动入口/内容类型/装修模块，真实 StoreDetail 行推导，禁止假 BI）；toward PARITY；见 WINF33/WINF74 |
| MH5-04 | 团购 / 套餐（外链聚合） | `/c/stores/[id]/group-buy` | PARTIAL | 美团/抖音/外链，非自有货架；W∞-12 densify 工具身份+平台图例；**W∞-71** 消费者频道深页 densify（黄顶栏+灰底白卡+summaryStrip+团购比价分布，真实 platformOffers 推导）；toward PARITY；见 WINF71 |
| MH5-05 | 菜单 / 点单 | `/c/stores/[id]/menu` | PARTIAL | W∞-13 densify 工具身份；仍外链成交；**W∞-71** 菜单分布 densify（服务类型/价格说明，真实 services 推导）；toward PARITY；见 WINF71 |
| MH5-06 | 商家详情 | `/c/stores/[id]/profile` | PARTIAL | W∞-14 densify 工具身份+快捷链；非本平台下单；**W∞-71** 消费者深页 densify；toward PARITY；见 WINF71 |
| MH5-07 | 下单 / 提单 | — | GAP (外链 only) | **不做本平台成交**；统一走 `/c/actions` 确认后 hand-off |
| MH5-08 | 订单列表 / 详情 | — | GAP (外链 only) | **不做本平台订单履约**；第三方结果不回传则不写「已成交」 |
| MH5-09 | 我的 | store `/profile` + `/c/profile` | PARITY (首刀) | 会员证明/外链入口；服务痕迹≠第三方订单；见 WINF10 |
| MH5-10 | 会员 | `/c/stores/[id]/membership` | PARTIAL | W∞-12 densify 本店会员工具身份；**W∞-71** 消费者频道深页 densify（权益分布，真实 benefits 推导）；toward PARITY；见 WINF71 |
| MH5-11 | 分享落地 | `/c/share/[code]`, `/c/one-code/[code]` | PARITY (首刀) | share landing densify; 见 WINF7 |
| MH5-12 | 服务 / 咨询 hand-off | `/c/services/[id]`, `/c/actions/[id]` | PARITY (首刀+) | 确认页 WINF3；套餐详情 WINF14「确认前往」 |
| MH5-13 | 美团 App 首页型 → **商圈联盟首页** | `/c/circles`, discovery | PARTIAL | 行业 chips+排序+双身份；见 WINF5；**W∞-72** `/c/entry` 统一入口真实数据深页 densify（黄顶栏+灰底白卡+summaryStrip+统一入口分布，真实 ConsumerAction[] 推导）；toward PARITY；见 WINF72 |

---

## 3. 美团商家移动 / 员工 H5（对标）

| ID | 美团对标 | ONEDAY 现路由 | 状态 |
| -- | -------- | ------------- | ---- |
| ME-01 | 商家 App 工作台 | `/e/workbench` | PARTIAL | W4 首刀；W∞-17 工具身份；**W∞-34** 视觉/IA densify（黄顶栏+头像 hero+icon 功能格+白卡面板）；**W∞-78** 真实数据深页分布（状态/升级/客户关联/到期窗口/来源/行动机会，source=local，禁止假 BI）；toward PARITY；见 WINF34/WINF78 |
| ME-02 | 订单 / 待办 | `/e/tasks` | PARTIAL | W∞-15 工具身份；**W∞-64** 真实数据深页分布（状态/升级/客户关联/到期窗口/来源，source=local，禁止假 BI）；toward PARITY；非第三方订单履约；见 WINF64 |
| ME-03 | 顾客 | `/e/customers` | PARTIAL | W∞-16 工具身份；**W∞-65** 真实数据深页分布（归属/状态/待办负载/建档窗口，source=local，禁止假 BI）；toward PARITY；见 WINF65 |
| ME-04 | 门店 | `/e/store` | PARTIAL | W∞-16 工具身份；**W∞-66** 真实数据深页分布；toward PARITY；见 WINF66 |
| ME-05 | 核销 / 会员 | `/e/memberships` | PARTIAL | W∞-16 工具身份；**W∞-67** 真实数据深页分布 + overview API；toward PARITY；见 WINF67 |
| ME-06 | 消息 | `/e/notifications` | PARTIAL | W∞-16 工具身份；**W∞-68** 真实数据深页分布；toward PARITY；见 WINF68 |
| ME-07 | 我的 | `/e/profile` | PARTIAL | W∞-16 工具身份；**W∞-69** 真实数据深页分布；toward PARITY；见 WINF69 |

---

## 4. 平台 / 渠道 PC（对标美团平台端 / 代理后台）

> 主人明确：除商家 PC 外，**PC 平台端也要复刻美团平台/代理**。

| ID | 美团对标 | ONEDAY 现路由 | 状态 |
| -- | -------- | ------------- | ---- |
| MP-00 | 平台总览 | `/p/dashboard` | PARTIAL | W∞-18 工具身份；**W∞-36** 视觉/IA densify（黄顶栏+icon 功能格+白卡面板+自定义指标）；toward PARITY；见 WINF36 |
| MP-01 | 省市区代理树 | `/p/channels`, `/ch/*` | GAP |
| MP-02 | 商户入驻开通 | `/p/tenants`, `/ch/merchants/new` | PARTIAL | **W∞-70** `/ch/merchants/new` 真实数据深页 densify；toward PARITY；见 WINF70 |
| MP-03 | 代理商管理后台 | `/ch/dashboard` | PARTIAL | W∞-6 densify；**W∞-37** 视觉/IA densify（黄顶栏+icon 功能格+白卡指标+商户队列卡）；toward PARITY；见 WINF37 |
| MP-04 | 商圈 / 运营集合 | `/p/business-circles`, `/bc/*` | PARTIAL | **W∞-37** `/bc/dashboard` 视觉/IA densify（黄顶栏+icon 功能格+白卡指标+商圈明细）；toward PARITY；见 WINF37 |

对应切片：`G1-R-CHANNEL-AGENT-GEO`（R5）。

---

## 5. 施工波次（禁止猜，按序复刻）

| Wave | 范围 | 目标 |
| ---- | ---- | ---- |
| **W0** | 本清单 + 主导航改挂规则 | **本文档 PASS** |
| **W1** | MPC-01 工作台 + 主导航美团化（Management PC） | **PASS** `evidence/G1-MEITUAN-PARITY/W1/` |
| **W2** | MH5-01 附近 + MH5-03 商家主页（Consumer H5） | **PASS** `evidence/G1-MEITUAN-PARITY/W2/` |
| **W3** | MPC-02 门店 + MPC-03 商品 | **PASS** (首刀 IA) `evidence/G1-MEITUAN-PARITY/W3/` |
| **W4** | ME-01～05 商家移动工作台 | **PASS** (首刀) `evidence/G1-MEITUAN-PARITY/W4/` |
| **W5** | MPC-04/05/07 订单·评价·营销（可本地数据） | **PASS** (首刀) `evidence/G1-MEITUAN-PARITY/W5/` |
| **W6** | R5 省市区代理（MP-01～03） | **PASS** (首刀) `evidence/G1-MEITUAN-PARITY/W6/` |
| **W∞** | 其余 GAP 逐页 | 直到主人签 G1 |

每波只做一个可验收切片；证据进 `evidence/G1-MEITUAN-PARITY/`。

---

## 6. 当前下一刀

  > **当前：W∞-82 PASS** — W∞-81 收束后补上 Management MPC 面最后缺的 `/m/settings`（MPC-12）真实数据深页分布（`工具规则概况` + `工具规则分布`，由当前已加载真实工具规则档字段现场推导，禁止假 BI）。Management MPC 真实数据深页分布已全部闭合。**下一刀：** inventory `PARITY` 关断复核，或 W∞ 收束其余 PARTIAL/零星 gap 面。

**历史波（自 W24 起）累计——**

**W24 工作台/顾客跟进收尾 PASS.** **W∞-28（体验对标细部·工具身份收尾·残留 `经营` store-ops 语裁定档：管理/员工工具身份面 `经营` 店务话术统一推广员工具——`/m` 404 `工具页面/推广员工具功能`、attribution `入口证据/入口分流与承接`、ai-suggestions `入口异常`、page-builder `入口频道`、offers `商户后台登记`、roles-permissions/employee-profile `查看/管理租户工具`、customers `跟进异常`、员工 loading `推广员工具工作台`、nurture `客户跟进队列`、notification `工具提醒`、share `工具入口/消费者入口`、`/e/store` `门店入口首页`；商圈/渠道网络身份 `经营` 保留）PASS** `evidence/G1-MEITUAN-PARITY/WINF28/ACCEPTANCE.md`. **W∞-27（管理/员工「经营管理」状态口径对齐）PASS** `evidence/G1-MEITUAN-PARITY/WINF27/ACCEPTANCE.md`. **W∞-29（残留 顾客→客户/客户跟进 nav+工作台）PASS** evidence/G1-MEITUAN-PARITY/WINF29/ACCEPTANCE.md. **W∞-30（管理/员工 ONEDAY / 眉标前缀去除，对齐 W∞-25 推广员工具 · 模式）PASS** evidence/G1-MEITUAN-PARITY/WINF30/ACCEPTANCE.md. **W∞-31（MPC-13 消息/通知→管理通知中心，`/m/notifications` 只读聚合 + `GET /api/v1/management/notifications`）PASS** `evidence/G1-MEITUAN-PARITY/WINF31/ACCEPTANCE.md`. **W∞-32（Consumer 发现页视觉/IA densify toward PARITY）PASS** `evidence/G1-MEITUAN-PARITY/WINF32/ACCEPTANCE.md`. **W∞-33（Consumer 门店页视觉/IA densify toward PARITY）PASS** `evidence/G1-MEITUAN-PARITY/WINF33/ACCEPTANCE.md`. **W∞-34（Employee 工作台视觉/IA densify toward PARITY）PASS** `evidence/G1-MEITUAN-PARITY/WINF34/ACCEPTANCE.md`. **W∞-35（Management PC 工作台视觉/IA densify toward PARITY）PASS** `evidence/G1-MEITUAN-PARITY/WINF35/ACCEPTANCE.md`. **W∞-36（Platform PC 总览视觉/IA densify toward PARITY）PASS** `evidence/G1-MEITUAN-PARITY/WINF36/ACCEPTANCE.md`. **W∞-37（Channel/Circle dashboard 视觉/IA densify toward PARITY）PASS** `evidence/G1-MEITUAN-PARITY/WINF37/ACCEPTANCE.md`. **W∞-38（Management 门店入口视觉/IA densify toward PARITY）PASS** `evidence/G1-MEITUAN-PARITY/WINF38/ACCEPTANCE.md`. **W∞-39（Management 商品/套餐入口视觉 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF39/ACCEPTANCE.md`. **W∞-40（Management 客户跟进视觉/IA densify，MPC-06：`/m/customers` + `/m/customers/[id]` 黄顶栏+灰底白卡+heroCard+白卡面板）PASS** `evidence/G1-MEITUAN-PARITY/WINF40/ACCEPTANCE.md`. **W∞-41（Management 会员中心视觉/IA densify，MPC-08：`/m/memberships` 黄顶栏+灰底白卡+heroCard+概况条+白卡会员卡+ledger）PASS** `evidence/G1-MEITUAN-PARITY/WINF41/ACCEPTANCE.md`. **W∞-82（Management 工具设置真实数据深页 densify，MPC-12 `/m/settings`：`工具规则概况` + `工具规则分布` 审批开关/提醒时限/免打扰/标签规则/归属分配/全平台可见引流，由当前已加载真实工具规则档字段现场推导，禁止假 BI）PASS** `evidence/G1-MEITUAN-PARITY/WINF82/ACCEPTANCE.md`. **下一刀 W∞-42：剩余 MPC 页 densify（订单痕迹 / 评价档案 / 营销活动 / 员工·权限 / 入口页装修·营销内容·工具设置 等 PARTIAL 页）。**

**W6 省市区代理（MP-01~03）PASS. W∞-1（省市区代理深层运营：结算/配额/审批, MP-03 深层）PASS** `evidence/G1-MEITUAN-PARITY/WINF/ACCEPTANCE.md`. **W∞-2（Consumer H5 搜索, MH5-02）PASS** `evidence/G1-MEITUAN-PARITY/WINF2/ACCEPTANCE.md`.**W∞-3（外链 hand-off 确认 densify, MH5-12）PASS** `evidence/G1-MEITUAN-PARITY/WINF3/ACCEPTANCE.md`。**W∞-4（Management attribution 深页）PASS** `evidence/G1-MEITUAN-PARITY/WINF4/ACCEPTANCE.md`。**W∞-5（商圈 C 端 densify, MH5-13）PASS** `evidence/G1-MEITUAN-PARITY/WINF5/ACCEPTANCE.md`。**W∞-6（渠道/代理后台 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF6/ACCEPTANCE.md`。**W∞-7（分享落地 densify, MH5-11）PASS** `evidence/G1-MEITUAN-PARITY/WINF7/ACCEPTANCE.md`。**W∞-8（员工分享工具 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF8/ACCEPTANCE.md`。**W∞-9（消费者统一入口 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF9/ACCEPTANCE.md`。**W∞-10（我的+搜索 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF10/ACCEPTANCE.md`。**W∞-11（附近 densify, MH5-01）PASS** `evidence/G1-MEITUAN-PARITY/WINF11/ACCEPTANCE.md`。**W∞-12（团购+会员 densify, MH5-04/10 + settings）PASS** `evidence/G1-MEITUAN-PARITY/WINF12/ACCEPTANCE.md`。**W∞-13（菜单+商家入口 densify, MH5-05/03）PASS** `evidence/G1-MEITUAN-PARITY/WINF13/ACCEPTANCE.md`。**W∞-14（套餐详情+门店我的 densify, MH5-12/06）PASS** `evidence/G1-MEITUAN-PARITY/WINF14/ACCEPTANCE.md`。**W∞-15（服务过程+任务路径 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF15/ACCEPTANCE.md`。**W∞-16（员工面 ME-03..07 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF16/ACCEPTANCE.md`。**W∞-17（工作台/获客跟进/管理档案 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF17/ACCEPTANCE.md`。**W∞-18（管理/平台工作台 + C 端资料 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF18/ACCEPTANCE.md`。**W∞-19（工具路径细部：`/m/offers` + `/m/stores` 改挂推广员工具身份、去美团商家眉标；全仓无残留）PASS** `evidence/G1-MEITUAN-PARITY/WINF19/ACCEPTANCE.md`。**W∞-20（体验对标细部·第三方平台命名一致性：扫呗/外链显式——shared renderer 扫呗 glyph/mark/name + group-buy/menu/service 命名）PASS** `evidence/G1-MEITUAN-PARITY/WINF20/ACCEPTANCE.md`。**W∞-21（体验对标细部·tool-path 工具身份收尾——管理端去「商家中心」侧边/工作台/快捷入口 + 菜单六项改挂入口/痕迹/工作流 + 消费者 扫呗 命名一致性补漏 + 商圈「入口转化」）PASS** `evidence/G1-MEITUAN-PARITY/WINF21/ACCEPTANCE.md`。**W∞-22（体验对标细部·订单痕迹语裁定档：`/m/orders` 订单中心→订单痕迹，汇总条原生收单/履约度量改诚实档案口径）PASS** `evidence/G1-MEITUAN-PARITY/WINF22/ACCEPTANCE.md`。**W∞-23（体验对标细部·入口/档案页标题与状态口径对齐：/m/offers+/m/stores+/m/marketing+/m/reviews 标题/状态对齐导航）PASS** evidence/G1-MEITUAN-PARITY/WINF23/ACCEPTANCE.md. **W∞-24（体验对标细部·工具身份收尾·顾客跟进：/m/customers 客户资产/驱动每次经营动作/经营管理权限 → 客户跟进）PASS** evidence/G1-MEITUAN-PARITY/WINF24/ACCEPTANCE.md. **下一刀 W∞-25：** 体验对标细部·工具身份收尾（仍不做本平台下单）。MH5-07/08 保持外链 hand-off GAP。
