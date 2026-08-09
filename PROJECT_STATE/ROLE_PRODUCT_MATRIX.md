# ONEDAY V3 ROLE PRODUCT MATRIX

> 冻结依据：2026-08-09 当前源码快照。
> 角色是授权与信息架构共同定义；只有表、权限或页面其中之一存在，均不算完整产品角色。

## 1. 角色模型冻结

| 产品角色       | 所属产品端                 | 当前技术映射                                                                                             | 当前是否完整 | 冻结后的权限边界与首页                                                                                              |
| -------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| Consumer       | Consumer                   | 匿名 public route + explicit tenant/store；无 membership。                                               | 部分         | 浏览/咨询/外链/发现；首页是 Storefront。不可读取 Member 私密数据。                                                  |
| Member         | Consumer                   | `customers`、`identities`、consent、`consumer_profile_accesses` 已有；新 Storefront“我的”未接 token。    | 否           | Consumer 身份、入会、权益、历史、隐私；首页是“我的会员”。                                                           |
| Employee       | Employee                   | `memberships` + `employees`，任务/客户接口按当前员工裁剪；常用 `task.read/manage`。                      | 部分         | 工作台、任务、客户、分享、核销（新增）；默认仅本人/被授权门店范围。                                                 |
| Store Manager  | Employee + Management mode | `store_managers` 有任命关系，但不是一个角色模板/菜单模式。                                               | 否           | 一个或多个门店的排班/任务队列、线索、核销、门店经营数据；不能改租户级 RBAC/套餐。                                   |
| Tenant Manager | Management                 | 现有多数 Management controller 统一要求 `tenant.manage`。                                                | 部分         | 经营、门店、内容、员工、流程的受授权范围；不得管理 Owner、套餐或平台资源。                                          |
| Tenant Owner   | Management                 | 开通只创建 `tenant_admin`，Platform 向导仅授 `tenant.manage`；渠道开通再加 `employee.manage`。           | 否           | 全租户经营与组织、角色授权、门店、模板/发布、Member；不可管理平台全局。                                             |
| Channel        | Platform Admin Shell mode  | Channel dashboard/onboarding 使用 system tenant `platform.read/manage`，没有 Channel operator 身份范围。 | 否           | 仅自己 channel 的商户招募、交付、续费线索；不得查看无关联租户的客户经营明细。                                       |
| Circle Manager | Platform Admin Shell mode  | Circle 使用 `circle.manage`，但 `requirePlatform` 强制 system tenant；无 Circle scope。                  | 否           | 仅分配商圈的邀请、审批、展示和退出；不得拥有平台 tenant lifecycle。                                                 |
| Platform Admin | Platform                   | system tenant + `platform.read/manage`；真实平台页存在。                                                 | 部分         | 租户、套餐、风险、模板目录、渠道/商圈、连接器、安全、Provisioning Run；需细分 read/manage/security/provision 权限。 |

## 2. 当前角色—页面—真实链路审计

| 角色           | 已有页面/入口                                                                             | 有真实后台链路                                                  | 页面有但角色不清楚                                 | 角色有但入口不清楚                             | 数据有但 UI 不可操作                                  | UI 存在但非真实商业闭环                                 |
| -------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Consumer       | `/c/stores/:id`、服务、外链确认、发现、流程、旧 `/c/profile`                              | 门店/服务/权益/外链读取；公开动作到客户/员工任务投影。          | 是：固定“团购/菜单/会员/我的”没有按行业/身份区分。 | 是：Consumer 与 Member 混在匿名壳。            | 是：内容、权益、offer 多来自种子，后台不能维护。      | 是：“加入会员”实际是咨询；Banner/快捷入口是硬编码派生。 |
| Member         | 旧 `/c/profile` 受 token 保护；新 `/profile` 是匿名服务导航。                             | consent revoke、受控 profile 读取存在。                         | 是：两个“我的”语义分裂。                           | 是：没有从公开店铺到登录/绑定/入会的连续入口。 | 是：benefits 可展示无领取/核销/账本。                 | 是：页面不能证明已是会员。                              |
| Employee       | workbench、任务、客户、跟进、分享、线索、养客、通知、profile。                            | 是：任务完成、证据、跟进、分享码、线索池等。                    | 部分：同一底部“客户/任务”入口没有显示店/班组范围。 | 是：Store Manager 没有模式/入口。              | 是：Manager assignment 数据没有员工侧店铺运营 UI。    | 部分：通知是日志/站内列表，非实际交付通道。             |
| Store Manager  | Management 门店任命，Employee 默认工作台。                                                | 是：`store_managers`、消费者路由优先归属店长。                  | 是：被任命者没有“店长”识别和导航。                 | 是：没有店长首页。                             | 是：门店基础商业字段、套餐/权益/内容大多不可维护。    | 否页面不应伪称已支持店长经营。                          |
| Tenant Manager | Management dashboard、customers、stores、content、workflow、AI、settings 等。             | 是：大量 Management 读写接口。                                  | 是：`tenant.manage` 被当作所有 Management 能力。   | 是：无角色驱动左导航与用户切换后的菜单。       | 是：地址、套餐、Offer、权益、门店内容、频道、Banner。 | 是：Page Builder 发布并未作用到 Consumer。              |
| Tenant Owner   | 同 Tenant Manager 页面，roles-permissions。                                               | RBAC 写服务存在，管理端可调用。                                 | 是：`tenant_admin` 与 Owner/Manager 语义不一致。   | 是：没有 Owner dashboard/危险操作确认总览。    | 是：成员角色分配/数据范围 UI 未完整呈现。             | 部分：权限 UI 有变更操作，但页面不能定义可售角色包。    |
| Channel        | `/ch/dashboard`、`/ch/merchants/new`。                                                    | 是：创建基础商户、交付状态、审计/Outbox。                       | 是：调用的是平台权限，不是 Channel 身份。          | 是：渠道成员登录后无 scoped 首页。             | 是：渠道归因、二维码、商家成功度、交付物不存在。      | 是：`delivery=delivered` 可手工标记，非 READY 证明。    |
| Circle Manager | `/bc/dashboard`、`/bc/merchants`。                                                        | 是：邀请、双审批、display/exit 事务。                           | 是：Circle scope 没有绑定到用户。                  | 是：无具体商圈上下文切换。                     | 是：Consumer 对 display config 的消费未接线。         | 是：后台状态改变不等于 Consumer 已展示。                |
| Platform Admin | `/p/dashboard`、tenants、onboarding、channels、circles、templates、connectors、security。 | 是：tenant update、基础 onboarding、渠道/商圈、模板目录、审计。 | 部分：platform.read/manage 粒度太粗。              | 部分：Provisioning 结果没有 Run/READY 工作台。 | 是：模板目录不能生成完整行业 Storefront 发布包。      | 是：连接器仅意图/状态，不能宣传外部交付。               |

## 3. RBAC 当前能力与不足

### 已有且应保留

- 数据模型：`memberships`、`roles`、`membership_roles`、`permissions`、`role_permissions`、`data_scopes`、`permission_change_confirmations`、audit log。
- 服务端授权：`AuthorizationService.require` 按 tenant membership、role permission、active status 校验；`requirePlatform` 限定 system tenant。
- 权限变更：`RbacService.change` 有版本锁、原因、确认、前后权限记录与审计。
- 员工业务范围：员工任务/客户服务已有当前员工与 tenant 的裁剪，不能推翻。

### 商用不足

1. 权限代码是能力集合，不是上述九种可交付角色包；当前所有 Management 入口基本收敛在 `tenant.manage`。
2. `data_scopes` 有表但没有形成跨所有 controller 的统一范围决策器；Store/Organization/Circle/Channel scope 未成为授权事实。
3. Store Manager、Channel、Circle Manager 没有 membership-to-scope-to-navigation 的闭环。
4. Platform 向导创建的 Owner 仅有 `tenant.manage`；渠道向导额外有 `employee.manage`，两个入口初始化角色不一致。
5. Tenant suspended 后，已签发 E/M/P token 仍可通过 session + membership + permission 校验直到另行撤销；高危权限变化也无会话版本收敛。
6. Role UI 允许编辑通用权限，但缺少角色模板、职责说明、不可删除的系统角色、范围预览、批量影响确认和菜单即时刷新。

## 4. 冻结后的角色包与权限域

不删除现有 permission code；新增/归类为下列域，并将页面导航也由此驱动。

| 角色包           | 必须具备域                                                                                            | 关键 scope                                      | 不可具备                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| Employee         | task.read/manage、customer.read（本人）、evidence.manage（本人）                                      | employee:self、assigned task、assigned customer | tenant settings、role、publish、platform。          |
| Store Manager    | Employee + store.read/manage、member.verify、storefront.content.draft                                 | store:{ids}                                     | tenant role、plan、跨店客户导出。                   |
| Tenant Manager   | customer/employee/workflow/content/store read/manage、storefront.draft                                | org/store assigned 或 tenant                    | role.manage、tenant.owner action、platform。        |
| Tenant Owner     | Tenant Manager + organization.manage、role.manage、storefront.publish、member.manage、tenant settings | tenant                                          | platform system resources。                         |
| Channel Operator | channel.read/manage、provision.request/read                                                           | channel:{ids}                                   | tenant customer raw data、platform tenant suspend。 |
| Circle Manager   | circle.read/manage、circle.display                                                                    | circle:{ids}                                    | platform approval（除非另授）、tenant lifecycle。   |
| Platform Admin   | platform.read/manage、provision.execute、template.catalog.manage                                      | system / assigned platform org                  | 无限制查看 tenant PII；敏感读取须单独审计。         |

Consumer 与 Member 不是内部 RBAC membership：Consumer 是 public capability；Member 是 customer identity + consent + membership enrollment。二者不能复用员工/租户 membership 表的语义。

## 5. 入口与 IA 冻结

| 产品端     | Shell                       | 顶层入口                                                       | 角色过滤规则                                                  |
| ---------- | --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Consumer   | Mobile Shell（也响应式 PC） | 首页、0–3 行业频道、我的；发现/附近/商圈为能力入口。           | anonymous/member 状态切换“我的”；Storefront config 决定频道。 |
| Employee   | Mobile Work Shell           | 今日、任务、客户、线索/养客、提醒、我的；店长增加“门店”。      | employee scope；Store Manager 才出现门店/核销。               |
| Management | Admin Shell                 | 总览、客户、运营、门店、内容与装修、成员与角色、设置。         | Tenant Manager/Owner 不同菜单；scope 进入所有查询。           |
| Platform   | Admin Shell                 | 总览、Provisioning、租户、模板目录、渠道、商圈、连接器、安全。 | Platform/Channel/Circle mode 只显示有 scope 的项。            |

## 6. 验收判定

一个角色只有同时满足下列条件才可在发布说明中称“已支持”：

1. 有明确的登录/深链/导航入口；
2. 菜单由服务端可验证的 permission + scope 驱动，非前端隐藏；
3. 所见数据和写动作有真实 API、审计、版本/幂等边界；
4. 390px 或 1440px 的关键状态（loading/empty/error/forbidden）可操作；
5. 低权限、跨 tenant、越 scope、权限变更后会话收敛均有自动验收。
