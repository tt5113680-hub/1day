# ONEDAY V3 当前真实开发状态快照

> 审计时间：2026-08-09（Asia/Shanghai）  
> 审计范围：只读检查代码、Git、已运行本地 HUMAN-PILOT 容器与数据库；本轮未改业务代码、未执行迁移、未运行构建/测试、未提交。  
> 判定口径：`DONE`=已有可用实现；`PARTIAL`=已有一部分真实链路但不能满足完整商业要求；`NOT_IMPLEMENTED`=当前代码没有该能力；`WIP`=已进入当前施工范围但仍等待关键验收。

## 一、当前代码基线

| 项目               | 真实状态                                                                                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch             | `hardening/COMMERCIAL-UI-ALIGNMENT`                                                                                                                                                                                                                                                                                         |
| HEAD               | `1e3e8dcc1535328c6c38bfc8daf5b7ec6ba0ced7` — `feat(consumer): align storefront navigation journeys`                                                                                                                                                                                                                         |
| 最近 15 个 commits | `1e3e8dc`, `553f36c`, `e698b79`, `79c7ff6`, `45e4afa`, `d82f3a5`, `62ab9f4`, `75263d5`, `b4f1534`, `bbe85fa`, `0dcd813`, `268464d`, `7bd0752`, `d175f64`, `e45e085`                                                                                                                                                         |
| Workspace          | **dirty**。已跟踪修改：`apps/consumer-web/next-env.d.ts`（无内容 diff，仅 Git 记录为修改）。未跟踪：`PROJECT_STATE/BLOCKED_REPORT.md`、`PROJECT_STATE/COMMERCIAL_UI_FULL_CHAIN_AUDIT.md`、`PROJECT_STATE/PRODUCT_UI_GAP_AUDIT.md`、对应两个 `evidence/` 目录，以及 `oneday-v3-e698b794.zip`。它们均早于本快照，不归属本轮。 |
| 本地服务           | **仍运行**：HUMAN-PILOT API/Consumer/Employee/Management/Platform/Worker 分别映射 3200–3205；六个 HTTP 探测均为 200。Consumer 容器已运行约 7 小时，其余五项约 21–22 小时。PostgreSQL 与 Redis 也在运行。                                                                                                                    |
| 数据库 migration   | `oneday_human_pilot` 的 Kysely 账本已应用 `001`–`047`；当前版本为 `047_store_service_platform_offers`。`CURRENT_STATE.md`/较早任务队列中“至 045”的文字已过时。                                                                                                                                                              |

当前运行态只等同于 localhost HTTP HUMAN-PILOT sandbox，不是公网 HTTPS 试点，也没有人工签署的 HUMAN PILOT 验收。Compose 状态命令在当前 shell 中因未注入 `AUTH_TOKEN_SECRET` 无法直接加载配置，但 Docker 容器、端口监听和 HTTP 200 已实测确认运行。

## 二、已正式完成并提交的真实能力

下列能力来自已提交任务和当前源码；`CONSUMER-COMMERCIAL-HOME-V1` 的技术实现已提交至 HEAD，但仍处于产品负责人视觉验收等待状态。

### Consumer

- 匿名、显式 tenant 的消费者入口、分享码入口、门店详情、服务详情、外部动作确认/跳转、过程查询与受限个人资料读取已形成 API 和移动页面链路。外部动作、咨询、电话与导航均有租户/门店范围校验；咨询动作会写行为、审计和 Outbox，并可投影员工任务。
- 发现页已有按 tenant 的频道、固定商圈与经纬度附近商户检索；门店详情读取真实 `stores`、`store_services`、`store_benefits`、`store_content_items`、`external_actions` 和平台 offer 数据。
- 最新门店壳为餐饮数字门店，已有首页、团购、菜单、会员、我的五个真实 store-scoped 路由，保留 tenant/source/scene/shareCode。门店可展示单张图片、地址、营业时间、电话、地图跳转、同商户门店切换、服务/套餐、权益、动态和三类外部链接；美团、抖音、通用 HTTPS 链接可走受控确认页。
- 当前证据：`evidence/CONSUMER-COMMERCIAL-HOME-V1/ACCEPTANCE.md`、`tests/e2e/consumer-commercial-home.human-pilot.spec.ts`、`tests/e2e/consumer-service.spec.ts`。

### Employee

- 已提交移动端工作台、任务详情、客户详情、跟进记录/下次任务、证据上传关联、分享码/二维码/有效期/来源追踪、获客池、养客工作台、通知中心、个人资料和工具。
- API 以登录员工的 membership/组织/门店范围裁剪任务与客户；员工可完成跟进、提交结果证据，消费者咨询可进入其待跟进任务。会话刷新、退出和越权拒绝已落地。
- 真实入口文件：`apps/employee-web/app/e/workbench/workbench.tsx`、`apps/employee-web/app/e/tasks/[id]/task-detail.tsx`、`apps/employee-web/app/e/tasks/[id]/follow-up/follow-up.tsx`；服务层位于 `apps/api/src/employee-*.service.ts`。

### Management

- 已提交 PC 管理端经营总览、漏斗、客户资产/详情、流程、AI 建议、门店/店长、组织员工、角色权限、权限审计、员工过程绩效、来源归因、内容中心、固定模块模板预览/发布、连接器意图配置和租户经营设置。
- API 均有 tenant/RBAC、审计、幂等或版本控制等相应边界；能看到消费者至员工跟进、结果/证据的经营链路。门店页可维护电话、营业时间、单图 URL、经纬度及 store external links。
- 真实入口文件：`apps/management-web/app/m/dashboard/page.tsx`、`apps/management-web/app/m/customers/[id]/page.tsx`、`apps/management-web/app/m/stores/page.tsx`、`apps/management-web/app/m/page-builder/page.tsx`；服务层位于 `apps/api/src/management-*.service.ts` 与 `page-template.service.ts`。

### Platform

- 已提交系统级概览、租户生命周期/套餐/额度/风险管理、租户开通向导、一级渠道、固定商圈、模板组件、连接器定义/状态日志与平台安全审计。
- 渠道和商圈还有各自运营端：商户开通、邀请、双向审批、展示控制、退出和只读边界。平台连接器只保存授权意图/状态，未伪称已执行第三方投递。
- 真实入口文件：`apps/platform-web/app/p/dashboard/page.tsx`、`apps/platform-web/app/p/tenants/page.tsx`、`apps/platform-web/app/p/channels/page.tsx`、`apps/platform-web/app/p/business-circles/page.tsx`、`apps/platform-web/app/p/templates/page.tsx`、`apps/platform-web/app/p/connectors/page.tsx`。

## 三、Consumer 当前真实实现（34 项）

| #   | 能力                     | 状态            | 真实代码位置与事实                                                                                                                                                                  |
| --- | ------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 商户/门店首页结构        | WIP             | `apps/consumer-web/app/c/stores/[id]/store.tsx` 已有高保真门店首页；任务仍为 `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`。                                                               |
| 2   | Banner 已存在            | DONE            | 同文件的 `banners`、轮播和 `banner` 区域存在。                                                                                                                                      |
| 3   | Banner 动态配置          | NOT_IMPLEMENTED | Banner 是由首个服务、首个权益和首个平台链接在前端派生的固定 3 张，没有 banner 数据/API/后台。                                                                                       |
| 4   | Banner 可点击及留痕      | PARTIAL         | 可进入服务/会员/团购路由并传 `scene`；没有独立 banner click/outbound 事件或可配置动作。                                                                                             |
| 5   | 多眼快捷导航当前实现     | DONE            | 同文件 `shortcuts` 渲染 10 个固定入口。                                                                                                                                             |
| 6   | 一行几个                 | DONE            | `store.module.css` 的 `.shortcutGrid` 为 `repeat(5, 1fr)`，当前一行 5 个。                                                                                                          |
| 7   | 商户配置快捷导航         | NOT_IMPLEMENTED | 没有导航配置表、Consumer API 或 Management 编辑器。                                                                                                                                 |
| 8   | 图标/名称/排序/显示/动作 | NOT_IMPLEMENTED | 五项均硬编码在 `shortcuts` 常量；不能由商户修改。                                                                                                                                   |
| 9   | 电话                     | DONE            | 从 `stores.phone` 读取，`call()` 先 POST `/outbound` 再 `tel:`。                                                                                                                    |
| 10  | 地址                     | DONE            | 从 `stores.address`/`merchant_locations.address_label` 读取展示。                                                                                                                   |
| 11  | 地图导航                 | DONE            | 经纬度优先构建高德 URL；导航前写 `consumer_store_outbound_events`、审计和 Outbox。                                                                                                  |
| 12  | 咨询                     | DONE            | 外部动作确认页和 `ConsumerOperatingOrchestrator` 记录咨询并投影客户/任务。文件：`consumer-action.service.ts`、`consumer-operating-orchestrator.service.ts`。                        |
| 13  | 分享                     | PARTIAL         | 调用 Web Share 或复制链接；不写分享事件，未形成分享归因闭环。                                                                                                                       |
| 14  | 门店切换                 | DONE            | 同商户活跃门店由 `/consumer/stores/:id` 返回，在首页 switcher 弹层切换。                                                                                                            |
| 15  | 门店图片                 | PARTIAL         | `stores.image_url` 支持一张 HTTPS 图片，首页、卡片和套餐卡复用它；没有相册/多图/媒体管理。                                                                                          |
| 16  | 营业时间                 | DONE            | `stores.business_hours` 从 API 读取展示。                                                                                                                                           |
| 17  | 商品/服务                | PARTIAL         | 有 `store_services`、服务详情和菜单，但本质是服务/套餐列表；没有独立商品 SKU、库存或商品媒体。                                                                                      |
| 18  | 套餐                     | PARTIAL         | 服务被当作套餐呈现，可进入详情与团购比价；没有面向商户的套餐 CRUD。                                                                                                                 |
| 19  | 同套餐多平台比价         | PARTIAL         | `store_service_platform_offers` 按 service + action 显示并标最低价；只在 seed/测试写入，后台没有编辑。                                                                              |
| 20  | 美团                     | DONE            | `platform='meituan'` 外部动作与 TEST ONLY offer/确认跳转已运行。                                                                                                                    |
| 21  | 抖音                     | DONE            | `platform='douyin'` 外部动作与 TEST ONLY offer/确认跳转已运行。                                                                                                                     |
| 22  | 通用外链                 | DONE            | `platform='external'`、HTTPS 校验、启停和排序已支持；外链确认页复用动作链路。                                                                                                       |
| 23  | 套餐图片                 | NOT_IMPLEMENTED | `store_services` 没有图片字段；菜单/首页套餐卡只复用 `store.imageUrl`。                                                                                                             |
| 24  | 原价/优惠价              | PARTIAL         | offer 有 `market_price` 和 `offer_price` 并展示；服务仅有自由文本 `price_label`，不是完整的套餐标价模型。                                                                           |
| 25  | 商家动态/内容            | PARTIAL         | 首页读取 `store_content_items` 的标题/摘要；无正文详情、图片或后台商户编辑链路。                                                                                                    |
| 26  | 会员快速加入             | PARTIAL         | 首页/会员页能把“加入”转为咨询动作；没有即时开通、身份绑定或入会状态。                                                                                                               |
| 27  | 会员身份体系             | PARTIAL         | 已有 customers、identities、consent、`consumer_profile_accesses` 和受限 profile API；消费者没有统一登录/会员注册。                                                                  |
| 28  | 权益                     | PARTIAL         | `store_benefits` 已能按门店展示并咨询使用方式；没有领取、核销、余额/状态账本。                                                                                                      |
| 29  | 附近门店                 | DONE            | `consumer-discovery.service.ts` 按经纬度计算 20km 内门店；首页也能在同商户门店间切换。                                                                                              |
| 30  | 商圈                     | DONE            | discovery API 有 tenant-scoped `business_circles` 集合；这是独立发现能力，非门店底栏固定项。                                                                                        |
| 31  | 底部导航当前实际结构     | DONE            | `consumer-shell.tsx` 固定为 `首页 / 团购 / 菜单 / 会员 / 我的`，五个均有对应 store-scoped 路由。                                                                                    |
| 32  | 底部导航可配置           | NOT_IMPLEMENTED | tabs 常量硬编码；没有频道池、启停、排序、最多 3 个规则或后台。                                                                                                                      |
| 33  | “我的”真实能力           | PARTIAL         | `channel.tsx` 的 profile 仅为匿名“我的服务”：跳会员、团购比价和咨询；不展示当前用户身份、订单或个人资料。受令牌保护的旧 `/c/profile` API 是另一条 access-token 链路，未接入此底栏。 |
| 34  | 统一商业组件体系         | PARTIAL         | 有 `ConsumerShell`、共享 action-confirmation 和同一商业 CSS 语言；主要组件仍散落在 `store.tsx`、`channel.tsx`、`service.tsx`，未沉淀为通用商业组件/装修协议。                       |

计数（按上述 34 项）：`DONE 15`、`PARTIAL 13`、`NOT_IMPLEMENTED 5`、`WIP 1`。

## 四、Management 当前装修能力

只按当前 Management UI/API 判定，不把 seed、测试 SQL 或设计文档当作商户能力。

| 商户后台可配置项 | 状态            | 当前真实边界                                                                                                                              |
| ---------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 基础门店信息     | PARTIAL         | 可看名称、地址、编码；`/m/stores` 只可改电话、营业时间、单图 URL、经纬度和店长，不能在该 UI 改门店名称/地址。                             |
| 门店图片         | DONE            | 单个 `imageUrl`（HTTPS URL）可保存；不是上传、相册或套餐图。                                                                              |
| Banner           | NOT_IMPLEMENTED | 无 schema、API 或编辑器。                                                                                                                 |
| 多眼快捷导航     | NOT_IMPLEMENTED | 无 schema、API 或编辑器。                                                                                                                 |
| 套餐             | NOT_IMPLEMENTED | `store_services` 有表和消费者读取，但无 Management CRUD/API。                                                                             |
| 多平台 offer     | NOT_IMPLEMENTED | `store_service_platform_offers` 有表和消费者读取，但无 Management CRUD/API。                                                              |
| 价格             | NOT_IMPLEMENTED | `offer_price/market_price` 有数据模型，但后台不能维护。                                                                                   |
| 活动             | NOT_IMPLEMENTED | 没有门店活动编辑；页面上的 banner/快捷“活动”只是固定 UI。                                                                                 |
| 推荐内容         | NOT_IMPLEMENTED | `/m/content` 管理的是通用 `content_items`/distribution；Consumer 读的是独立 `store_content_items`，两者未接线。                           |
| 电话             | DONE            | `/m/stores/:id/commercial` 可改 `phone`。                                                                                                 |
| 地址             | NOT_IMPLEMENTED | 数据库 `stores.address` 存在且 Consumer 能读，Management 当前无修改表单/API。                                                             |
| 经纬度           | DONE            | `/m/stores/:id/commercial` 可改成对纬经度。                                                                                               |
| 底部导航         | NOT_IMPLEMENTED | 无频道配置；Consumer `tabs` 固定。                                                                                                        |
| 会员入口         | NOT_IMPLEMENTED | 当前入口由 Consumer 硬编码选择咨询 action；后台不能选择/开关/排序。                                                                       |
| 模块顺序         | NOT_IMPLEMENTED | 通用 `page_modules.position` 有底层排序，但 `/m/page-builder` 当前只列模板、预览、发布/回滚；没有编辑模块，且 Consumer 店铺页未消费模板。 |
| 手机预览         | NOT_IMPLEMENTED | Page Builder 的 preview 是模块数据预览，不是当前 Consumer 门店页面的手机预览。                                                            |

相关真实文件：`apps/management-web/app/m/stores/page.tsx`、`apps/api/src/management-store.service.ts`、`apps/management-web/app/m/page-builder/page.tsx`、`apps/api/src/page-template.service.ts`、`apps/management-web/app/m/content/page.tsx`。

## 五、最新产品决策与代码的对齐

产品方向是“商户自己的高保真数字门店”，而不是固定平台发现页。当前 `CURRENT_STATE.md` 的下一范围也限定 Consumer，不能据此扩展 Employee/Management/Platform。

| 最新方向                                          | 判定     | 依据                                                                                           |
| ------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| 品牌/门店头部                                     | 一致     | 门店/商户名、图片、营业状态、营业时间、地址入口均已在首页。                                    |
| 动态营销 Banner                                   | 部分一致 | 有轮播视觉与点击，但内容/顺序/动作是前端从既有数据派生，不能装修或独立留痕。                   |
| 一行 4–5 个可装修多眼入口                         | 部分一致 | 视觉上一行 5 个、已有 10 项；完全没有商户装修。                                                |
| 会员快速入口                                      | 部分一致 | 有入口和咨询动作，不是实际入会。                                                               |
| 套餐/商品图片                                     | 部分一致 | 有套餐卡、门店图复用；没有套餐自身图片。                                                       |
| 多平台套餐比价                                    | 部分一致 | 047 数据模型/API/UI/美团抖音外链已存在；后台不可维护，第三方价格仅 TEST ONLY 样例。            |
| 商家推荐动态                                      | 部分一致 | 有门店内容标题摘要列表；没有内容详情、媒体或管理接线。                                         |
| 位置/电话/导航强入口                              | 一致     | 真实门店字段、地图/电话跳转和 outbound 留痕均有。                                              |
| 首页基础位 + 最多 3 个可配置经营频道 + 我的基础位 | 冲突     | 当前是硬编码固定五项 `首页/团购/菜单/会员/我的`；没有最多 3 个、频道池、行业配置、排序或开关。 |
| 附近门店/商圈/商圈权益为能力池，不永久占位        | 部分一致 | 现有底栏没有把附近/商圈固定进去，发现能力独立存在；但也没有能力池可被商户选入经营频道。        |

完全缺失的最新设计关键能力：可装修 Banner、可装修多眼导航、可配置经营频道/底栏规则、门店套餐媒体与后台维护、真正的会员入会/权益状态。

## 六、不要重复建设：可复用、缺口与数据模型

### 已有底层数据/API/组件，可直接复用

| 领域                     | 已有资产                                                                                                            | 位置                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| external links / actions | `external_actions`、`store_external_actions`、安全 target 校验、确认页、audit/Outbox、Management 外链增改/启停/排序 | migrations 014/046；`external-action.service.ts`、`consumer-action.service.ts`、`management-store.service.ts` |
| outbound tracking        | 电话/导航 `consumer_store_outbound_events` + audit + Outbox                                                         | migration 046；`consumer-store.service.ts`                                                                    |
| store                    | `stores` 已有地址、电话、营业时间、单图、经纬度；同商户门店查询与切换已完成                                         | migrations 005/046；`consumer-store.service.ts`                                                               |
| CMS                      | 通用 `content_items/content_distributions` 已有草稿、审批、分发意图；门店还有 `store_content_items`                 | migration 031/017；`management-content.service.ts`、`consumer-store.service.ts`                               |
| membership/customer      | customers、identities、consent、profile access、store benefits、消费者动作到员工/客户经营投影                       | migrations 008/017/020/042；`consumer-profile.service.ts`、`consumer-operating-orchestrator.service.ts`       |
| business circle / nearby | tenant discovery channels、固定商圈、merchant locations、按坐标附近计算                                             | migration 016/036/041；`consumer-discovery.service.ts`                                                        |
| offers                   | `store_services`、`store_service_platform_offers`，同套餐 action 绑定、优惠价/市场价、排序和 Consumer 比价 UI       | migrations 017/047；`consumer-store.service.ts`、`store.tsx`、`channel.tsx`                                   |
| 统一 Consumer 外壳       | `ConsumerShell`、context/query 保留、action-confirmation 共享、服务/频道路由                                        | `apps/consumer-web/app/c/consumer-shell.tsx`、`app/c/actions/[id]`                                            |

### 真正缺功能（不是再造现有系统）

- 门店商业内容的 Management CRUD：套餐/服务、权益、门店动态、平台 offer、活动和它们的上下架/排序/版本。
- Banner、快捷导航、底部经营频道的**门店级配置契约**，包括显示、顺序、图标、标题、动作、行业频道池与“最多 3 个”规则。
- 套餐/商品媒体（至少多媒体关联）和结构化原价/优惠价；当前复用门店单图不满足商品商业展示。
- 真实会员入会、身份绑定、权益领取/核销/状态；当前只有咨询意图和受限资料读取。
- 当前 Consumer 门店页对应的手机预览，而非通用模板模块 JSON 预览。

### 只是 UI 未呈现或没有接线的既有能力

- `stores.address`、`store_services`、`store_benefits`、`store_content_items`、offer 均已有数据库并已被 Consumer 读取，但 Management 没有相应编辑链路。
- `page_templates/page_modules` 已支持固定模块、版本、发布、回滚和 position；当前 Consumer storefront 完全不读取它，因此不能把它称作门店装修已完成。
- 通用内容中心已有草稿/审批/分发，但它与 Consumer 的门店内容表没有映射。
- `consumer_profile_accesses` 可以读取受控用户资料/订单/权益，但新“我的”底栏未接入该 token 模式。

### 需要新增或先决策的数据模型

- **需要明确新契约**：门店 Banner、快捷入口、经营频道/底栏配置及其 action 引用、可见性、排序、发布版本。可评估复用 `page_templates/page_modules`，但必须先补“storefront 绑定”和 Consumer 消费协议，不能只加 UI。
- **需要新增/扩展**：服务/套餐媒体与结构化价格字段；现有 `store_services.price_label` 不足以承载原价/优惠价/图片。
- **需要新增业务状态**：会员 enrollment、权益发放/领取/核销/有效期。如只做展示可复用 `store_benefits`，如宣称会员体系则不能省略该模型。
- **不需要新模型即可完成**：地址编辑、电话/时间/单图、现有外链类型与其 tracking；只需补合规的 Management 写接口/UI 或接线。

## 七、当前施工完成度（规划参考，非 PASS）

| 范围                | 当前估计 |
| ------------------- | -------: |
| 技术底座            |      88% |
| Consumer 商业产品   |      52% |
| Employee 商业产品   |      72% |
| Management 商业产品 |      63% |
| Platform 商业产品   |      66% |

口径说明：技术底座已覆盖多租户、RBAC、审计、Outbox、Worker、测试/恢复/试点设施；Consumer 得分因门店展示和动作闭环已具备，但“商户可装修数字门店”的内容运营、会员与频道配置仍缺；后 3 端分数不表示本轮产品方向已验收。

## 八、下一批施工前的真实风险

1. **装修架构冲突**：现有 Page Builder 有模板版本/模块位置，却未绑定 Consumer storefront；直接另建 Banner/导航系统会与它并存并造成两套装修真相。
2. **内容模型分裂**：Management 使用 `content_items`，门店首页使用 `store_content_items`；不先定义映射/归属，推荐内容会重复建库或后台保存后前台不显示。
3. **底部规则与现有代码冲突**：固定五 tab 已写死在 `consumer-shell.tsx`，与“首页 + 最多 3 个配置频道 + 我的”不兼容；需要先冻结频道数据合同和迁移策略。
4. **套餐/offer 已有数据但无运营写路径**：047 已应用并有 seed 数据；新增后台前必须保护现有 `service + external action` 唯一关系和外部价格“第三方为准”边界，避免重做 offers 表或错误宣称实时价格。
5. **会员承诺风险**：现有“加入会员”实际是咨询；若下一阶段文案或 UI 称为已入会，必须先有身份、权益状态与核销模型。
6. **迁移/试点风险**：HUMAN-PILOT 已到 047，状态文件仍有“045”旧描述；下一次迁移必须以实际 Kysely 账本为准，并在现有 sandbox 数据上验证回填与回滚。
7. **工作区风险**：当前已有未跟踪审计报告、证据和 zip，以及 `next-env.d.ts` 状态漂移；下一施工/提交前必须明确归属，避免把前一轮产物混入业务提交。

## 九、结论与停止点

- 当前阶段：`CONSUMER-COMMERCIAL-HOME-V1` 已提交技术实现，等待产品负责人 UI 验收；本地 HUMAN-PILOT sandbox 运行中。
- 本轮仅生成状态快照和精简交接，未开始下一批施工。
- 下一建议动作：先确认“门店装修配置协议（Banner/快捷入口/频道/底栏）是否复用 Page Template，并冻结会员最小闭环”，再创建唯一下一 TASK；在此之前不要扩展代码。
