# ONEDAY V3 COMMERCIAL PRODUCT BLUEPRINT

> 冻结日期：2026-08-09（Asia/Shanghai）
> 基线：`PROJECT_STATE/CURRENT_BUILD_SNAPSHOT.md`，只读复核当前源码、迁移和已提交验收。
> 本文是产品/技术/UI 架构冻结，不代表任何未实现能力已经验收，也不授权本轮修改业务代码。

## 1. 结论先行

ONEDAY V3 已经具备可信的多租户业务底座和四类 Web 应用代码仓：租户隔离、会话、RBAC、审计、幂等、Outbox、Worker、消费者行为到员工任务的原子投影均已存在。它还不是可直接规模化销售的多端商业产品。

按“能让普通商家自主开通、装修、获客、入会、运营并在多端一致使用”的口径，本次规划评估的总体商用成熟度为 **45/100**；这是规划指数，非测试通过率。现有代码快照中技术底座约 88%，Consumer/Employee/Management/Platform 产品深度约为 52% / 72% / 63% / 66%。最大缺口不在再建基础设施，而在把现有资产收敛为一个可交付的租户产品：开通编排、Storefront 唯一真源、会员闭环、角色信息架构、统一设计系统与同步协议。

当前不能直接以“可商用 SaaS”售卖给一般商家；可作为受控本地 HUMAN-PILOT 的技术试点。理由不是质量门槛缺失，而是商家无法完成真实自助经营闭环：租户开通后没有 READY 验收，模板没有被 Consumer 使用，核心门店内容不能从 Management 维护，会员仍是咨询入口，且多端变化没有可承诺的同步协议。

## 2. 真实现状与判定

| 问题                              | 冻结判定                                                                                                                                         | 代码事实                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 是否有四套应用                    | 有四个独立 Next 应用和独立登录/部署边界：Consumer、Employee、Management、Platform。                                                              | `apps/*-web` 四个应用存在。                                                                            |
| 是否已是四个独立商用产品端        | 否。它们是四个已实现页面集合，尚未全部拥有按角色收敛的 IA、壳层、入口治理和商用对象 CRUD。                                                       | Consumer 有门店壳；Employee 有底部导航；Management/Platform 没有统一 Admin Shell。                     |
| 是否是一键开通租户                | 否。当前平台向导是一个可回滚、幂等的“基础租户初始化事务”，不是可交付的商业 READY 编排。                                                          | `PlatformOnboardingService` 创建 tenant/user/membership/HQ/merchant/store/role/template/audit/outbox。 |
| Page Template 是否驱动 Storefront | 否。模板可建版本、预览、发布、回滚，但 Consumer 门店读取 `stores`、`store_services`、`store_content_items` 等，不读取已发布模板。                | `page-template.service.ts` 与 `consumer-store.service.ts` 没有绑定读取关系。                           |
| 内容是否一个真源                  | 否。`content_items/content_distributions` 是 Management CMS；`store_content_items` 是 Consumer 门店内容；没有映射、发布投影或统一编辑入口。      | migrations 017、031 与两个服务分离。                                                                   |
| Consumer 行为到经营端             | 部分完成且最可信。公开动作确认/打开在同一事务写行为、审计、Outbox、客户、来源、归属、任务或线索池。                                              | `ConsumerOperatingOrchestrator`。                                                                      |
| 多端实时同步                      | 未完成。当前大部分读端在页面加载或手动刷新时读库；Worker 只完成内部 Outbox 消费账本和提醒/逾期调度，没有向 Web 端推送或更新 Storefront 投影。    | `apps/worker/src/index.ts`、`packages/events/src/index.ts`。                                           |
| Tenant 暂停是否完全阻断           | 公共 Consumer 查询会检查 tenant `active`，但已登录 E/M/P 的会话与授权路径没有在每次请求中检查 tenant 生命周期，也没有批量撤销会话/前端失效通知。 | `consumer-*.service.ts` 有 active 筛选；`TenantContextService` 只验证 token/session。                  |

## 3. 产品边界：四端与角色

### Consumer

Consumer 应保持为 **同一个响应式应用**，覆盖手机、平板和 PC；不应再造一个独立“横版 Consumer 应用”。消费者身份、链接、分享码、购物/服务上下文和 SEO/分享入口在一个 URL/同一 Storefront 语义下才能一致。手机优先；平板采用双栏浏览；PC 采用内容容器、详情侧栏与二维码/电话/地图补充，不改变信息对象和操作。

当前 Consumer 已有高保真餐饮门店视觉、显式 tenant、门店/服务/外链/比价/附近/商圈、咨询投影与底部五路由。缺少可装修配置、商品/套餐媒体与后台写路径、真实身份/会员/权益、订单/核销、分享归因和自适应 PC 规范。现有 `ConsumerShell` 应保留，但固定五 tab 必须收敛为“首页 + 最多三个行业经营频道 + 我的”的数据驱动配置；发现、附近、商圈属于能力池而不是永久 tab。

### Employee

Employee 已经是最接近独立工作产品的移动工作台：任务、客户、跟进、证据、分享码、线索池、养客、通知和个人工具均有真实链路。缺少商用深度主要是：按门店/班组/店长的工作范围与任务队列、任务 SLA/升级可视化、真实通知渠道与送达状态、移动离线/弱网策略、扫码工作入口以及与 Member/核销的前台协作。现有移动底部导航应保留并统一为 Mobile Shell；`/e/workbench#today-title` 这类锚点入口不能成为长期 IA。

### Management

Management 已有经营总览、客户/流程/员工/门店/来源/内容/模板/AI/设置。它目前更像“经营能力演示控制台”，未成为商户可日常运营的控制台：没有持久 Admin Shell 和明确角色菜单；门店装修、套餐、权益、内容、Offer、地址、频道均缺少真实编辑闭环；Page Builder 不是 Consumer 手机预览；角色页虽可调用 RBAC 更新，但页面信息架构和受影响范围不足以表达店长、租户管理者、Owner 等产品角色。

### Platform

Platform 已有租户生命周期、套餐/额度/风险、开通表单、渠道/商圈/模板/连接器/安全审计。它还不是运营平台：没有 Provisioning Run、步骤状态、补偿/重试、交付物/二维码、凭据激活、READY 检查、细粒度平台/渠道/商圈权限，也没有停用租户的跨端会话失效协议。Channel 与 Circle 当前是 Platform Web 内的独立路由能力，不等于真正独立的渠道/商圈产品工作台。

完整角色、入口与当前缺口见 `PROJECT_STATE/ROLE_PRODUCT_MATRIX.md`。

## 4. 架构冻结决策

### 4.1 建立统一高端 Design System：是

当前 `@oneday/ui` 只提供业务文案映射，样式散落在各页面 CSS module；四端字体、间距、按钮、空态、反馈与数据密度各自定义。应建立单一 Design System，但不得一次性重写页面。

- 保留：现有 Consumer 餐饮店铺视觉语言、`ConsumerShell` 的上下文保持、Employee 的移动任务卡/底部导航、现有 SessionGuard/SessionApiClient、各端现有错误/无权处理模式。
- 收敛：颜色/字体/间距/圆角/阴影/断点 token；按钮、输入、选择、表格、状态徽标、空态、错误态、加载骨架、确认弹层、抽屉、列表卡、版本状态、权限门禁；可访问性与 390/768/1024/1440 断点。
- 不保留为长期组件：Consumer 的硬编码 `banners`/`shortcuts`/`tabs`，Management 和 Platform 的页面级导航/表单样式复制，Employee 的锚点导航。

### 4.2 建立两个壳：是

**Mobile Shell** 服务 Consumer 与 Employee，但以产品模式区分：Consumer 为公开 Storefront/Member 模式，Employee 为受会话保护的 Work 模式。二者共享响应式、反馈、底部/抽屉导航和深链机制，不能共享权限语义或数据。

**Admin Shell** 服务 Management 与 Platform，并允许渠道/商圈以受限 Admin Shell mode 接入。它提供桌面侧边栏、移动抽屉、tenant/scope 切换、会话状态、权限导航、全局搜索/通知占位、版本/发布状态和统一空错载。保留四个应用部署边界，不合并为一个前端工程。

### 4.3 Storefront、模板与内容的唯一真源

不要重建 Page Builder，也不要让 Consumer 直接继续各自拼装页面。采用以下三层：

1. **业务真源**：门店、服务、权益、外链、Offer、会员、内容实体仍由各自领域表拥有；禁止复制为“装修 JSON 中的业务数据”。
2. **版式真源**：已有 `page_templates → page_template_versions → page_modules` 是唯一的 Storefront 布局/模块/版本/发布真源。扩展为 Storefront target、受限模块白名单和门店绑定，而不是新增第二套 Banner/导航表。
3. **发布读模型**：Consumer 只读取绑定门店的已发布版本及其模块引用解析结果。该读模型可缓存，但必须带 `bindingVersion`、`templateVersionId`、`publishedAt`，并可由业务真源重建。

内容统一方式：将 `content_items` 定义为内容正文、媒体、审核状态的唯一实体；把 `store_content_items` 迁移/兼容为“门店内容投放位（contentId、storeId、rank、visibility、schedule）”。迁移期间以双读适配器兼容旧行，禁止双写无限期存在。`content_distributions` 仍表示外部平台分发意图，不能被误读为 Consumer 已发布。

### 4.4 管理装修的唯一发布链

唯一链路冻结为：

`Management Draft → 校验/可预览 Storefront Binding → Preview（同一 Consumer 渲染器、指定 draft version） → Publish（原子切换 binding.live_version_id） → Outbox storefront.published.v1 → 缓存失效/订阅通知 → Consumer Published Read Model`

发布成功的定义是绑定版本已原子切换并可由 Consumer API 读取；不是 Worker 已把事件标记为 published。回滚只是把 binding 指回一个历史已发布版本，生成新的发布事件。草稿、预览和已发布内容必须携带版本，写入使用乐观锁，发布需要权限和审计。

### 4.5 同步的硬规则

- 消费者咨询/外链确认到客户、归属、员工任务/线索池：**同一数据库事务，API 返回即已提交**；Employee 和 Management 的读模型可在下一次读取看到。目标体验：订阅刷新 p95 ≤ 5 秒，轮询退化 p95 ≤ 30 秒。
- Storefront/内容发布到 Consumer：发布原子切换，缓存失效与订阅 p95 ≤ 10 秒，硬上限 60 秒；超过即显示可追踪发布降级并可强制刷新。
- 平台停用、会话/角色变更：授权请求必须立即拒绝；会话撤销与各端通知 p95 ≤ 60 秒；高危权限降级不得依赖 access token 的 15 分钟自然过期。
- 商圈/渠道展示变更到 Consumer：已批准且 visible 的状态才可入 Consumer 读模型；p95 ≤ 10 秒，最多 60 秒。邀请、待审批、内部备注绝不下发给 Consumer。

完整契约见 `PROJECT_STATE/MULTI_TERMINAL_SYNC_SPEC.md`。

## 5. 真实 Member 最小闭环

当前“加入会员”只是带来源的咨询动作；`customers`、`identities`、consent、受限 profile access 与 `store_benefits` 是可复用基础，但没有 Member account、入会状态、权益账本、领取/核销或会员端“我的”。因此不能在产品文案中称“已入会”或“会员权益可用”。

最小可售 Member 闭环必须有：

1. 手机号/第三方身份绑定与明确 consent；一个 Consumer identity 关联一个 tenant customer，支持合并/冲突处理。
2. `membership_enrollment`（tenant、可选 store、tier、status、joinedAt、source、version）及状态机：pending/active/suspended/cancelled。
3. `member_benefit_ledger`：发放、领取、核销、撤销、过期、余量；每笔有业务来源、操作者、门店和审计。
4. Consumer 我的：入会状态、可用/已用权益、隐私/授权撤回、历史；Employee 的核销/识别入口；Management 的规则、发放、核销记录和异常处理。
5. 不做支付、储值、积分、等级复杂升级也可以成为 MVP，但不做上述五项只能叫“会员咨询/权益展示”。

## 6. 现有同步完成与未完成协议

已经完成的同步不是实时推送，而是以下一致性事实：公开动作写行为、审计、Outbox 和经营投影在同一事务；员工跟进/结果/证据以及管理端读取有真实共享数据库；外链、电话、导航可留痕；Worker 有 `SKIP LOCKED`、消费去重、失败退避和提醒/逾期调度。

未形成正式协议的包括：页面/内容发布到 Consumer、商圈/渠道状态到 Consumer、平台 tenant 停用到已登录端、RBAC 变化到已签发会话、员工/管理端刷新与通知、缓存版本和失效、事件 schema 兼容、死信/人工恢复、延迟 SLO/监控。不能把 Outbox 表或“Worker health=ok”描述为已完成多端同步。

## 7. 最多四个施工批次（本轮不施工）

| 批次    | 名称                                               | 必须交付                                                                                            | 不做什么                             | 完成门槛                                                   |
| ------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| BATCH 1 | Commercial UI Foundation                           | Design tokens、组件库、Mobile Shell、Admin Shell、角色 IA、全端空错载/响应式基线。                  | 不改变业务真源；不做会员或模板迁移。 | 4 端关键页在 390/768/1024/1440 的视觉、键盘、状态验收。    |
| BATCH 2 | Provisioning + Storefront Template Engine + Member | Provisioning Run/READY、模板绑定与同渲染器预览发布、内容统一适配、四行业模板、Member 最小闭环。     | 不做全量商品/支付/第三方实时价格。   | 新租户从一次命令到 READY；发布/回滚与入会/核销端到端通过。 |
| BATCH 3 | Four-product Commercial Depth                      | Consumer 商用店铺与自适应、Employee 运营协作、Management 商业 CRUD、Platform 运营/渠道/商圈控制面。 | 不新建第二套 Storefront/CMS。        | 每端角色都有明确入口、真实写链和范围拒绝。                 |
| BATCH 4 | Multi-terminal Full Commercial Acceptance          | 同步协议、订阅/缓存失效、禁用/权限收敛、恢复/观测、完整商业验收矩阵。                               | 不以人工逐缺陷修补替代矩阵。         | `COMMERCIAL_ACCEPTANCE_MATRIX` 全部 P0/P1 通过并保留证据。 |

## 8. 本次冻结的决策清单

- Consumer 是一个响应式产品，不新增横版 Consumer 应用。
- 四个 Web 应用继续独立部署；共享 Design System、Shell、会话边界和契约，不强行合并代码仓。
- `page_templates/page_template_versions/page_modules` 升级为唯一 Storefront 版式真源；不能另建平行装修系统。
- `content_items` 升级为内容实体真源；`store_content_items` 转为门店投放兼容层后退出实体真源角色。
- 业务实体不嵌入模板 JSON；模板仅引用实体/集合和视觉配置。
- “发布成功”以原子绑定切换和 Consumer 可读为准；Outbox 消费只是异步传播保证。
- Tenant 状态、角色/权限、渠道/商圈可见性都必须进入正式同步协议和授权即时收敛。
- READY 是可验证状态机终点，不是平台向导的成功 toast。

配套规格：`ROLE_PRODUCT_MATRIX.md`、`TENANT_ONE_CLICK_PROVISIONING_SPEC.md`、`MULTI_TERMINAL_SYNC_SPEC.md`、`COMMERCIAL_ACCEPTANCE_MATRIX.md`、`HIGH_FIDELITY_TEMPLATE_SYSTEM.md`。
