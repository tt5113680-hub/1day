# ONEDAY V3 COMMERCIAL ACCEPTANCE MATRIX

> 目的：以可重复的商业验收矩阵代替“产品负责人发现一个修一个”。
> 每个用例必须记录环境、commit、fixture/tenant、角色、请求 correlationId、截图/trace、日志/DB 断言和结论。P0 未通过不得售卖；P1 未通过不得宣布对应能力商用可用。

## 1. 通用执行规则

- 每次发布使用全新 tenant fixture，至少另有一个隔离 tenant；不得依赖 seed 恰好存在的数据。
- 每个写操作同时验证：输入校验、权限、tenant/scope、幂等、version conflict、audit、Outbox、最终读模型。
- Web 用例至少覆盖 Chromium 390px、768px、1024px、1440px；关键移动流再覆盖触控 viewport。
- 所有端都覆盖 loading、empty、error、forbidden、session expired、network retry。
- 包含 API/DB 断言、E2E/视觉证据、Worker 观察；仅截图不算通过。
- P0：安全、钱/权益、租户隔离、发布、禁用、数据丢失、核心闭环。P1：可售体验和关键运营。P2：增强体验。

## 2. 矩阵

| ID    | 范围                           | Pri | 场景与断言                                                                                                                                | 必需证据                                               |
| ----- | ------------------------------ | --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| TP-01 | Tenant Provisioning            | P0  | Platform direct Run 从输入到 READY；创建 Owner、角色包、组织、merchant、首店、industry template、binding/live version、默认运营对象、QR。 | Run step records、API/DB counts、四端登录/访问截图。   |
| TP-02 | Tenant Provisioning            | P0  | 重复 idempotency key 返回同一 Run；并发 slug/email 冲突无半数据。                                                                         | HTTP、DB 零孤儿断言。                                  |
| TP-03 | Tenant Provisioning            | P1  | 模板发布/QR/通知失败后 Run 可从失败步骤重试；READY 不提前出现。                                                                           | failure injection、retry trace、状态截图。             |
| TP-04 | Tenant Provisioning            | P1  | Channel referral 使用同一 Run，归因/交付正确；Circle pending 不影响基础 READY 且不公开。                                                  | channel/circle records、Consumer absence assertion。   |
| C-01  | Consumer                       | P0  | 显式 tenant/store 的公开首页只展示 active tenant/store 的 published Storefront。                                                          | public API、390/1440 screenshot、cross-tenant 404。    |
| C-02  | Consumer                       | P1  | 同一 Consumer app 在 phone/tablet/PC 保持同 URL、上下文、内容语义和可操作导航。                                                           | 4 viewport visual diff、deep-link trace。              |
| C-03  | Consumer                       | P1  | 电话、地图、咨询、外链经安全校验/确认并留痕；拒绝不安全 URL。                                                                             | API audit/outbox、browser action evidence。            |
| C-04  | Consumer                       | P1  | 发现/附近/商圈仅显示已批准可见的 placement，位置缺失有明确态。                                                                            | geo fixture、pending/hidden exclusion assertions。     |
| C-05  | Consumer                       | P1  | 服务/Offer/内容/门店切换由真实后台数据驱动，无 seed-only 依赖。                                                                           | Management write → Consumer read evidence。            |
| E-01  | Employee                       | P0  | Consumer 咨询在提交后形成唯一 customer/source 和 owner task 或 lead-pool，员工仅见自身范围。                                              | correlated DB/API/E2E chain。                          |
| E-02  | Employee                       | P1  | 任务、跟进、下次任务、结果、证据、通知从移动端真实写入并在 Management 可追溯。                                                            | mobile trace、audit/outbox、management screenshot。    |
| E-03  | Employee                       | P1  | Store Manager 仅可经营授权门店；跨店客户/核销/数据拒绝。                                                                                  | two-store fixture、403/404 assertions。                |
| E-04  | Employee                       | P1  | 弱网/重复提交/会话刷新/退出后，任务与证据不重复、不丢失。                                                                                 | network interruption trace、idempotency assertions。   |
| M-01  | Management                     | P0  | Tenant Manager/Owner 的菜单和 API 按 permission/scope 区分；前端隐藏不能替代 API 拒绝。                                                   | role matrix E2E、API 403 cases。                       |
| M-02  | Management                     | P0  | 门店资料、服务/套餐、Offer、权益、内容、外链的 CRUD 形成唯一真源并可在 Consumer 消费。                                                    | command/audit/version + Consumer assertion。           |
| M-03  | Management                     | P0  | Storefront Draft→Preview→Publish→Rollback：预览不公开，发布原子，回滚可追溯。                                                             | template/binding versions、published page screenshot。 |
| M-04  | Management                     | P1  | 经营总览、漏斗、客户、员工绩效对 Consumer→Employee 链路数据一致且能深链。                                                                 | fixture counts、dashboard trace。                      |
| M-05  | Management                     | P1  | Content approval/placement 与外部 distribution intent 明确区分，不将未投放/未授权内容展示给 Consumer。                                    | state matrix、negative public assertion。              |
| P-01  | Platform                       | P0  | Platform Admin 可查看 Run、租户状态、步骤/错误/重试；非 Platform 无访问。                                                                 | role API/E2E、audit evidence。                         |
| P-02  | Platform                       | P0  | suspend/reactivate tenant：公共端、已登录 E/M/P、refresh、订阅、cache 全部按 SLO 收敛。                                                   | live multi-session trace、auth/session DB records。    |
| P-03  | Platform                       | P1  | 套餐/额度/风险影响可解释；配额超限不产生部分资源。                                                                                        | quota fixture、error/rollback evidence。               |
| P-04  | Platform                       | P1  | 连接器只显示已知能力和 delivery 状态，绝不宣称未执行第三方投递。                                                                          | UI/API copy contract。                                 |
| MB-01 | Member                         | P0  | identity bind + consent + enrollment 是唯一状态机；重复入会/撤回授权/身份冲突安全处理。                                                   | API/DB/audit + Consumer flow。                         |
| MB-02 | Member                         | P0  | 权益发放、领取、核销、过期、撤销形成不可抵赖 ledger；并发核销只成功一次。                                                                 | concurrent test、ledger/audit records。                |
| MB-03 | Member                         | P1  | Member“我的”只显示本人 tenant 的资料/权益/历史；匿名 Consumer 无私密数据。                                                                | privacy/cross-tenant E2E。                             |
| CH-01 | Channel                        | P1  | Channel operator 只能看到授权 channel 的 merchant/run，不可读其他渠道或租户 PII。                                                         | scope negative tests。                                 |
| CH-02 | Channel                        | P1  | referral onboarding、delivery、retry、READY 与平台 Run 一致；手工 delivered 不可绕过 READY。                                              | correlated run/channel state.                          |
| CI-01 | Circle                         | P0  | invite→circle approve→platform approve→visible 的双审批顺序严格；拒绝/退出撤回曝光。                                                      | state-machine API/E2E、Consumer absence/presence。     |
| CI-02 | Circle                         | P1  | displayConfig 的 visibility/sort/headline 在 Consumer 投影中按 SLO 生效，不暴露内部备注。                                                 | payload inspection、visual diff。                      |
| XT-01 | Cross-tenant                   | P0  | 每个 Consumer/Employee/Management/Platform/Channel/Circle API 对 tenant A token/ID 请求 tenant B 数据均拒绝。                             | route inventory contract tests。                       |
| XT-02 | Cross-tenant                   | P0  | URL、shareCode、preview token、QR、cache key、SSE topic 不允许 tenant 混淆或数据泄漏。                                                    | fuzz/deep-link/cache tests。                           |
| MS-01 | Multi-store                    | P0  | 同 tenant 多门店的服务、权益、offer、内容、店长、Storefront binding 均按 store 隔离。                                                     | two-store fixture、UI/API evidence。                   |
| MS-02 | Multi-store                    | P1  | 同 merchant 门店切换保留合法 source/scene/shareCode，不越店归属。                                                                         | navigation trace、projection assertion。               |
| SF-01 | Storefront Publish             | P0  | 发布只切换完整 validated live version；Consumer 永不读到半模块或 draft。                                                                  | concurrent publish/read test。                         |
| SF-02 | Storefront Publish             | P1  | 发布/回滚 cache invalidation、SSE/轮询退化在 SLO 内；传播失败可见且可重试。                                                               | lag metrics、failure injection。                       |
| CT-01 | Content Publish                | P0  | `content_items` 与门店 placement 的唯一真源规则；旧 `store_content_items` 兼容迁移不双写漂移。                                            | migration/backfill/rebuild assertions。                |
| CT-02 | Content Publish                | P1  | 审核、定时、下架、媒体失败、空内容均有正确 Consumer/Management 状态。                                                                     | lifecycle E2E。                                        |
| OF-01 | Offer                          | P1  | service+external action 唯一关联，结构化原价/优惠价/更新时间/来源正确。                                                                   | CRUD/API/Consumer evidence。                           |
| OF-02 | Offer                          | P0  | 已停用 action/offer 不可在 Consumer 跳转或比价；第三方价格不宣称实时。                                                                    | negative link test、copy assertion。                   |
| XL-01 | External Links                 | P0  | 仅允许安全 HTTPS/受控 action；open redirect、credential URL、跨 tenant action 均拒绝。                                                    | security tests。                                       |
| XL-02 | External Links                 | P1  | 电话/地图/外链的取消、成功、重复点击、回跳均有清晰 UI 与可追溯事件。                                                                      | browser trace/audit.                                   |
| AI-01 | AI                             | P0  | AI 仅执行白名单 tenant-local command；不完整 payload 为 manual_required，不执行外部投递。                                                 | command/negative tests。                               |
| AI-02 | AI                             | P1  | AI 建议在 Management 中显示来源、权限、确认、审计和错误恢复。                                                                             | UI/API audit chain。                                   |
| WO-01 | Worker/Outbox                  | P0  | 并发 worker、重复 event、handler crash、重启下去重且不丢核心事件。                                                                        | fault injection、event consumption DB checks。         |
| WO-02 | Worker/Outbox                  | P0  | retry/backoff/last_error/dead-letter/单 event replay 可观测且幂等。                                                                       | metrics/logs/replay trace。                            |
| WO-03 | Worker/Outbox                  | P1  | task reminder/overdue 只触发一次，DND/tenant scope 正确。                                                                                 | time-controlled tests。                                |
| SE-01 | Session                        | P0  | login/refresh/logout/multi-device revoke、token 过期、tenant suspended、role downgrade 均安全收敛。                                       | real browser sessions + API DB evidence。              |
| SE-02 | Session                        | P1  | 登录后返回原深链；Consumer public 与 Member private context 不混淆。                                                                      | redirect/authorization E2E。                           |
| RC-01 | Recovery                       | P0  | 数据库恢复克隆后迁移、Run、published binding、member ledger、Outbox 可重建/一致。                                                         | recovery rehearsal report。                            |
| RC-02 | Recovery                       | P1  | 发布传播/Worker/二维码/订阅中断后可安全恢复，无重复权益/任务。                                                                            | disaster scenarios traces。                            |
| UI-01 | UI quality                     | P1  | Design System token/组件一致，文本/状态不泄露 enum、UUID、内部错误。                                                                      | visual audit + DOM assertions。                        |
| UI-02 | Responsive                     | P1  | Consumer/Employee mobile-first；Management/Platform admin desktop-first 且 mobile 可访问；390/768/1024/1440 无重叠/不可点击。             | four viewport screenshots/Playwright.                  |
| UI-03 | Empty/Error/Loading            | P1  | 每个关键入口有 skeleton/loading、empty CTA、retry error、forbidden recovery；不使用空白页。                                               | state injection screenshot/trace。                     |
| SY-01 | Multi-terminal synchronization | P0  | Consumer action、Employee follow-up、Management dashboard 的在线/离线订阅、版本去重、30 秒降级刷新符合 SLO。                              | three-terminal timing trace。                          |
| SY-02 | Multi-terminal synchronization | P0  | Storefront/content publish、tenant suspend、RBAC/scope change、channel/circle visibility 的事件、cache、UI 全链符合同步规格。             | five-terminal trace + event lag metrics。              |

## 3. 发布闸门

| 闸门                    | 必须满足                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| G0 Contract             | schema/API/event/module/role contracts 评审并有兼容策略。                                      |
| G1 Unit/API             | P0/P1 相关 unit、HTTP、tenant/scope/negative tests 通过。                                      |
| G2 Integration          | Postgres、Redis/缓存、Worker、Outbox、SSE/轮询退化真实进程通过。                               |
| G3 UI                   | 关键路由及 four viewport 视觉、键盘、loading/empty/error/forbidden 通过。                      |
| G4 Security             | session、RBAC、cross-tenant、external link、PII、suspend/recovery 通过。                       |
| G5 Commercial rehearsal | 新 tenant Provisioning 到 READY，四端商业链和 Member/Publish/Channel/Circle 场景在隔离库通过。 |
| G6 Evidence             | 每项有可复现命令、commit、环境、trace/screenshot/log；失败项有严重度、owner、恢复验证。        |

## 4. 最小商业发布组合

首次对外商用至少全绿：TP-01/02、C-01、E-01、M-01/02/03、P-01/02、MB-01/02、CI-01、XT-01/02、MS-01、SF-01、CT-01、OF-02、XL-01、AI-01、WO-01/02、SE-01、RC-01、SY-01/02，以及 G0–G6。其余 P1 可以按明确产品范围分批开放，但不得以“全部商用”表述。
