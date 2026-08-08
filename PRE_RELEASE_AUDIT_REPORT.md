# ONEDAY V3 商业 MVP 上线前独立质量审计报告

| 项           | 内容                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| 审计类型     | 只读独立质量审计（**未修改任何业务代码**）                                |
| 审计对象     | `D:\ONEDAY_V3`，分支 `hardening/HARDENING-005`，工作区 clean              |
| 审计基准提交 | `4b96c93`（`chore(state): record final MVP acceptance`）                  |
| 仓库自评状态 | `PASS_PENDING_HUMAN_PILOT_HANDOFF`（69/69 任务自动化 PASS）               |
| 审计日期     | 2026-08-08                                                                |
| 分级定义     | **P0** 阻塞上线 · **P1** 上线前必须修复 · **P2** 优化项 · **P3** 后续迭代 |

---

## 总判

仓库自动化验收与试点交付文档已齐备，**适合作为「受控试点准备」基线**；但对照 `01_PRODUCT/MVP_SCOPE.md` 成功判断与 `docs/PILOT_ACCEPTANCE_CHECKLIST.md`，**尚不能对客宣称「四端商业闭环已可真人上线」**。

主要阻塞来自：

1. 访问令牌密钥可静默回落开发默认值；
2. 四端无登录/刷新/登出 UI，真人无法自助完成旅程；
3. 「消费者未完成动作 → 自动形成员工任务」未实现，验收链依赖管理员 API 手工串接；
4. 人类试点交接清单未签字，种子账号仍可能被误用。

**建议决策：** `HOLD` — 先处理全部 P0 与关键 P1，完成清单签字后再启用真实客户；在此之前仅允许隔离网络内的受控演示，并严格按 `docs/PILOT_LIMITATIONS.md` 对外表述边界。

---

## 发现汇总

| 级别 | 数量 | 处理门槛                          |
| ---- | ---- | --------------------------------- |
| P0   | 4    | 未关闭前不得对客启用              |
| P1   | 8    | 上线/试点开放前必须关闭或书面降级 |
| P2   | 10   | 可进试点但须披露并排期            |
| P3   | 6    | 后续迭代                          |

### P0 — 阻塞上线

| ID   | 标题                                                               | 证据                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0-1 | Access Token 签名密钥可回落硬编码默认值                            | `apps/api/src/auth.service.ts`：`AUTH_TOKEN_SECRET ?? 'development-only-change-me'`；`docs/PILOT_DEPLOYMENT.md` 前置项未强制点名该变量                                                                                                                       |
| P0-2 | 四端 Web 无登录/刷新/登出页，真人无法用账号完成旅程                | 全仓 `apps/*-web` 无 login UI；E2E 依赖 `sessionStorage.setItem('oneday.accessToken', …)`（如 `tests/e2e/hardening-002.spec.ts`）；access TTL 15 分钟且前端无 refresh                                                                                        |
| P0-3 | 消费者动作确认不自动建客户/来源/员工任务，违背 MVP 成功判断第 3 条 | `apps/api/src/consumer-action.service.ts` / `consumer-store.service.ts` 仅写事件+审计+Outbox；`tests/hardening-002-e2e.test.mjs` 用管理员 API 手工创建 customer→source→task；对照 `01_PRODUCT/MVP_SCOPE.md` L36–39、`docs/PILOT_ACCEPTANCE_CHECKLIST.md` L16 |
| P0-4 | 人类试点交接未完成；复用种子账号即为事故                           | `docs/PILOT_ACCEPTANCE_CHECKLIST.md` 全未勾选；种子 `admin@system.local` / `ChangeMe123!`（`packages/database/src/seeds/foundation.ts`）；`CURRENT_STATE` 为待人工交接                                                                                       |

### P1 — 上线前必须修复

| ID   | 标题                                                                     | 证据                                                                                            |
| ---- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| P1-1 | Worker 仅为健康检查桩，Outbox 只写不消费                                 | `apps/worker/src/index.ts`；API 大量 `insert into outbox_events`；平台看板统计 `pending_events` |
| P1-2 | 任务提醒/逾期升级无调度器，依赖手动 `POST .../tasks/actions/process-due` | `apps/api/src/task.controller.ts`；Worker 无 cron                                               |
| P1-3 | API 约 52 个独立 `pg.Pool`，并发下易打满连接                             | `apps/api/src/*.service.ts` 普遍 `new Pool({ connectionString: process.env.DATABASE_URL })`     |
| P1-4 | 登录/刷新与公开写接口无 HTTP 限流                                        | `apps/api/src/main.ts` 无 throttle；公开写含 consumer confirm/open、share open                  |
| P1-5 | 部署指南未强制 TLS/HTTPS                                                 | `docs/PILOT_DEPLOYMENT.md`；Bearer 与 connector 授权材料经 API 提交                             |
| P1-6 | 连接器仅为授权意图/健康观测，不可当真外发                                | `management-connector.service.ts`；`docs/PILOT_LIMITATIONS.md`；「prepared ≠ 外部已完成」       |
| P1-7 | CORS 仅在配置 `CORS_ORIGINS` 时启用；四端分离源易踩跨域                  | `apps/api/src/main.ts`；`docs/PILOT_DEPLOYMENT.md`                                              |
| P1-8 | 四端浏览器验收为冒烟截图，非跨端真人业务闭环                             | `tests/e2e/hardening-002.spec.ts` vs `tests/hardening-002-e2e.test.mjs`（HTTP 编排）            |

### P2 — 优化项

| ID    | 标题                                                          | 证据                                                                            |
| ----- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| P2-1  | 部署要求 Redis，运行时未使用                                  | Compose/`PILOT_DEPLOYMENT` vs API/Worker 无 Redis 客户端                        |
| P2-2  | 无 PostgreSQL RLS，租户隔离仅靠应用 SQL                       | migrations 无 `ROW LEVEL SECURITY`                                              |
| P2-3  | 软删除与唯一约束并存，软删后难重建同 code                     | 多处 unique(tenant_id, code, …)                                                 |
| P2-4  | 证据文件以 `bytea` 入库，库体积与恢复成本高                   | `012_result_evidence.ts`                                                        |
| P2-5  | 平台「30 天活跃租户」SQL 运算符优先级可疑                     | `platform-dashboard.service.ts`：`active … and exists(tasks) or exists(orders)` |
| P2-6  | Refresh token 哈希 pepper 硬编码                              | `packages/auth/src/index.ts`：`oneday-refresh-token-v1`                         |
| P2-7  | 错误响应契约不统一（成功 envelope vs Nest 默认异常）          | 各 controller / 无统一 exception filter                                         |
| P2-8  | CORS methods 未含 DELETE，浏览器跨域撤销指定 session 可能失败 | `main.ts` methods 列表；`DELETE auth/sessions/:id`                              |
| P2-9  | 设计系统包未被任何 app 引用，色值/字体手写漂移                | `@oneday/ui` / `@oneday/design-tokens` 零引用；各 `*.module.css`                |
| P2-10 | 平台壳首页仍为占位文案                                        | `apps/platform-web/app/page.tsx`                                                |

### P3 — 后续迭代

| ID   | 标题                                                                   | 证据                                                        |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| P3-1 | 共享包（events/workflows/ai-core/contracts/observability）与运行时脱节 | API 多用 raw `pg`，包多为占位                               |
| P3-2 | 消费者发现商圈与平台固定商圈双模型，运营易混淆                         | `016_consumer_discovery` vs `036_platform_business_circles` |
| P3-3 | Access token 存 `sessionStorage`，同域 XSS 可窃取                      | 各 web app 读取 `oneday.accessToken`                        |
| P3-4 | Vitest 几乎空（1 用例）；默认 `test:e2e` 不全端                        | `tests/tokens.vitest.ts`；`playwright.config.ts`            |
| P3-5 | 分享落地 `/c/share/[code]` 缺 Playwright 覆盖                          | 有页面；e2e 仅员工分享侧                                    |
| P3-6 | Next.js Playwright 开发服跨源资源告警（已知非阻断）                    | `FINAL_ACCEPTANCE_REPORT.md` / `CURRENT_STATE.md`           |

---

## 1. 项目架构

### 现状（已验证）

- **Monorepo：** pnpm 10 + Turbo；Node ≥ 24。
- **四端 Web：** `consumer-web`（`/c`）、`employee-web`（`/e`）、`management-web`（`/m`）、`platform-web`（`/p` + 渠道 `/ch` + 商圈 `/bc`）。
- **后端：** `apps/api` NestJS 11 + Fastify，前缀 `api/v1`；`apps/worker` 名义 Worker。
- **共享包：** `database`（Kysely 迁移/种子/恢复）、`auth`、`events`、`ui`、`design-tokens` 等；部分包为占位。
- **本地基建：** `infra/docker/compose.yaml`（Postgres 18 + Redis 8 + api/worker），文档标明非生产。
- **试点文档：** `PILOT_DEPLOYMENT` / `ADMIN_GUIDE` / `LIMITATIONS` / `ACCEPTANCE_CHECKLIST` / `RELEASE_AND_RECOVERY`。

### 架构评价

| 维度       | 评价                                                        |
| ---------- | ----------------------------------------------------------- |
| 角色拆分   | 清晰；渠道/商圈挂在 platform-web 合理                       |
| API 域拆分 | controller/service 按端与 CORE 域划分，可读                 |
| 异步架构   | **名存实亡**（P1-1）：Outbox 写入完整，消费端缺失           |
| 数据访问   | 迁移用 Kysely，运行时大量 raw SQL + 每服务独立 Pool（P1-3） |
| 可观测性   | `logger: false`，observability 包占位（弱）                 |
| 交付形态   | Compose/Dockerfile 偏本地；四端 Web 需手工启动              |

### 相关发现

P1-1、P1-2、P1-3、P2-1、P3-1。

---

## 2. 数据模型

### 现状（已验证）

- **41** 条 Kysely 迁移（`packages/database/src/migrations/001`…`041`）。
- 业务表普遍具备 `tenant_id`、`deleted_at`、`version`、审计字段。
- 关键域覆盖：租户/组织/商户/门店、用户/成员/RBAC/会话、客户身份与来源归属、任务提醒、订单与证据、页面模板、外部动作、工作流、渠道开通、固定商圈、连接器配置、Outbox/审计。
- 平台资源挂在 `slug='system'` 租户。
- 恢复演练：`db:recovery:clone` 仅允许 `oneday_v3_test*`，校验 4 张表计数。

### 风险与缺口

| 项              | 说明                            | 级别     |
| --------------- | ------------------------------- | -------- |
| 无 RLS          | 直连库或漏 `tenant_id` 即越权面 | P2-2     |
| 软删 + 唯一约束 | 运营重建同 code 困难            | P2-3     |
| 证据 bytea      | 备份/克隆成本                   | P2-4     |
| 双商圈模型      | 产品可区分，支持成本高          | P3-2     |
| 蓝图含 payments | MVP 明确不做支付，避免对外误读  | 边界披露 |

数据模型对商业 MVP **足够支撑演示与受控试点**；生产级纵深隔离与对象存储未到位。

---

## 3. 权限安全

### 已验证强项

- Login → 写 `auth_sessions` → HMAC access（含 `sub`/`tenantId`/`sessionId`/`exp`）+ refresh。
- 受保护路径：验签 **且** DB 对账会话（active、未撤销、未过期、user/tenant 匹配）— 与 HARDENING-001 证据一致。
- 缺权限 → 403；失效会话 → 401。
- `requirePlatform` 要求 system 租户 + `platform.*`。
- JWT `tenantId` 与可选 `x-tenant-context` 不一致时拒绝。
- Connector 仅存 `secret_fingerprint`，不回读明文。
- CORS 默认关闭，需显式白名单（好）；无通配默认。

### 关键缺口

见 **P0-1、P0-2、P1-4、P1-5、P2-6、P2-8、P3-3**。

公开消费端（slug + actionId / share code）为产品有意公开面，但缺少限流时存在刷写审计/Outbox/DB 的滥用面（P1-4）。

---

## 4. API 完整性

### 覆盖情况

| 表面                                                | 路径族                                                                       | 鉴权                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------- |
| Health                                              | `GET /api/v1/health`                                                         | DB ready，失败 503      |
| Auth                                                | `login` / `refresh` / `logout` / sessions                                    | 公开登录 + 受保护撤销   |
| Consumer                                            | `/api/v1/consumer/*`、`/public/share-codes/*`                                | slug / secret / code    |
| Employee / Management / Platform / Channel / Circle | 对应投影与写接口                                                             | Bearer + session + RBAC |
| CORE                                                | customers / tasks / workflows / external-actions / evidence / attribution 等 | 受保护                  |

### 完整性评价

- **页面对应的专用投影 API** 大体齐全（PAGE-\* 任务均有 HTTP 证据）。
- **CORE 写能力** 后端完整，但管理端工作流等多为只读投影；部分编排依赖 HTTP/脚本（培训与误用风险，P2）。
- **缺口不在「缺路由」而在「业务自动编排」**（P0-3）与 **异步落地**（P1-1/P1-2）。
- 错误契约不统一（P2-7），增加前端与运维排障成本。

---

## 5. 前后端流程

### 典型链路

```text
消费者页 --fetch--> /api/v1/consumer/...（公开）
员工/管理/平台页 --Bearer sessionStorage--> /api/v1/{employee|management|platform|...}
```

- 无共享 API client；各页直接 `fetch` + `NEXT_PUBLIC_API_BASE_URL`。
- 无会话时展示「请登录」类文案，**无跳转登录**（P0-2）。
- Access 15 分钟过期后无自动 refresh → 页面集体 401。
- 幂等键、乐观 `version`、审计/Outbox 在写路径上普遍存在（质量好）。

### 流程断裂点

1. **身份注入断裂：** UI 不调用 login/refresh。
2. **经营闭环断裂：** 消费者 confirm/consult → 事件，不自动 → 客户/任务。
3. **异步断裂：** Outbox pending 无消费；提醒需手工触发。
4. **外发断裂：** 连接器/外部动作停在 prepared/配置层。

---

## 6. 四端用户链路

| 端             | 路由盘点                                                                        | 闭环状态                                          |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| 消费者         | `/c/entry\|discovery\|stores\|services\|actions\|processes\|profile\|share`     | 浏览/动作/过程查询可用；**不自动进员工任务**      |
| 员工           | `/e/workbench\|tasks\|customers\|leads\|nurture\|share\|notifications\|profile` | HTTP+页可用；**依赖注入 token**                   |
| 管理           | `/m/dashboard\|funnels\|customers\|workflows\|ai\|stores\|org\|roles\|…`        | 看板/客户/归因等可用；Visit 推断；AI 仅确认不执行 |
| 平台/渠道/商圈 | `/p/*`、`/ch/*`、`/bc/*`                                                        | 开户/审批/展示 HTTP 闭环；壳首页占位（P2-10）     |

HARDENING-002 证明的是 **API 编排四链**，不是 **真人四端连续点击闭环**（P1-8）。

对照 MVP 成功判断 1–7：

| #   | 要求                         | 审计结论                               |
| --- | ---------------------------- | -------------------------------------- |
| 1   | 场景码进商户并执行动作       | 可达（公开 API + 页）                  |
| 2   | 记录来源/场景/员工/商户/行为 | **部分**：动作事件有；客户来源常需另写 |
| 3   | 未完成动作自动形成员工任务   | **未实现（P0-3）**                     |
| 4   | 员工跟进并上传证据           | API/页可达（需登录）                   |
| 5   | 管理者看过程/异常/归因/结果  | 可达（需登录）                         |
| 6   | AI 建议经权限确认后落地      | **仅状态 accepted，不执行业务动作**    |
| 7   | 渠道/商圈开通与运营查看      | HTTP 可达（需登录）                    |

---

## 7. UI 一致性

### 现状

- 各端以 CSS Module + 硬编码蓝灰为主；加载/空/错/无权限状态文案较统一。
- 消费者偏移动经营入口；员工偏 390 工作台；管理/平台偏桌面后台 — 角色分工合理。
- **`@oneday/design-tokens` / `@oneday/ui` 未被任何 app 依赖**（P2-9）。
- 字体多为 Arial 默认栈；品牌主色在 token 与页面间存在漂移。
- 平台根页仍写「将在后续页面任务接入」（P2-10），与已交付 `/p|/ch|/bc` 不一致，易误导试点操作员。

### 评价

对受控试点 **可接受的「能用」一致性**；未达到可复用设计系统或品牌级交付。不构成单独 P0，但加剧培训与改版成本。

---

## 8. 商业流程完整性

### 已交付（受控范围内）

- 租户/组织/门店/员工/RBAC。
- 消费者入口、发现（渠道推荐 / 固定商圈 / LBS 分离模型）、门店/服务、外部动作中转、过程查询、身份最小化。
- 员工工作台、任务、客户、获客池、养客、分享码、通知、资料。
- 管理看板、漏斗、客户资产与导出审批、工作流只读、AI 建议确认、门店/组织/角色、权限审计、过程绩效、归因、内容、装修、连接器意图、经营设置。
- 平台租户开通、渠道、商圈、模板、连接器定义、安全审计；渠道开户；商圈双审批与展示。
- 审计日志 + Outbox **写入**；证据文件；会话加固；DB readiness；测试库恢复克隆。

### 明确未交付 / 不得对外承诺

来自 `docs/PILOT_LIMITATIONS.md` 与代码事实：

- 自研商城 / **支付** / 收银 / 外呼 / 完整 OA·ERP·替代 CRM；
- 多级分润、提现、开票、复杂结算；
- OEM/私有化产品化、插件市场、任意低代码；
- **未授权的自动私聊 / 发朋友圈 / 第三方平台真实调用**；
- 微信：身份类型与连接器枚举存在，**无微信支付、无企微、无真实消息 SDK**；
- AI「落地」= 建议状态变更，**非自动改业务数据**。

### 商业闭环缺口（产品合同级）

见 **P0-3**（自动任务）、**P1-1/P1-2**（异步与提醒）、**P1-6**（外发）、**MVP #6**（AI 执行）。

---

## 9. 测试覆盖

| 层                      | 规模（约）                               | 质量判断                                              |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------- |
| HTTP `tests/*.test.mjs` | 66 文件，串行真实 API+PostgreSQL         | **强**：CORE/PAGE/CHANNEL/CIRCLE/HARDENING 合同覆盖好 |
| Vitest                  | 1 文件 / 1 用例                          | **弱**（P3-4）                                        |
| Playwright              | ~46 spec / 按任务双场景（正常+无会话）   | **中**：页级冒烟与截图充分；跨端旅程弱（P1-8）        |
| 证据目录                | ~72 个 task/phase evidence               | 流程纪律好                                            |
| 最终验收                | `FINAL_ACCEPTANCE_REPORT.md` 自动化 PASS | 可信为「仓库门禁 PASS」，**非客户签字**               |

### 覆盖缺口

- 真人登录与 token 生命周期；
- 消费者动作 → 自动任务的端到端断言（当前验收绕过该能力）；
- Outbox 消费 / Worker；
- 真实第三方与支付；
- 分享落地浏览器覆盖（P3-5）；
- 默认 `pnpm test:e2e` 不全端。

---

## 10. 潜在上线风险

| 风险                                 | 级别 | 说明                       |
| ------------------------------------ | ---- | -------------------------- |
| 默认 JWT 密钥上线                    | P0   | 漏配即弱签名               |
| 种子/Compose 密码进试点              | P0   | 文档已禁，流程未签字仍高发 |
| 无登录 UI 导致「控制台注 token」运维 | P0   | 凭证易进截图/聊天          |
| 连接池耗尽导致间歇 503               | P1   | 多 Pool × 默认连接数       |
| Outbox/提醒空转导致经营 SLA 静默失败 | P1   | 看板 pending 持续涨        |
| 公网无 TLS / 无限流                  | P1   | 会话与刷写                 |
| CORS 未配导致四端全挂                | P1   | 配置项易漏                 |
| 对外过度承诺微信/支付/外发           | P1   | 营销与合同风险             |
| 仪表盘指标失真                       | P2   | 活跃租户 SQL               |
| 恢复能力被误解为生产备份             | P2   | 仅测试库 clone             |

### 运维就绪度快照

| 能力                         | 状态                            |
| ---------------------------- | ------------------------------- |
| DB readiness 503 fail-closed | 已验（HARDENING-003）           |
| 测试库恢复克隆               | 已验（HARDENING-004），范围有限 |
| 试点交付包文档               | 已验（HARDENING-005）           |
| 人类清单签字                 | **未完成**                      |
| 生产密钥强制 fail-closed     | **未完成**                      |
| 监控/告警/速率限制           | **基本缺失**                    |

---

## 维度评分（审计视角）

| #   | 维度           | 评分   | 一句话                         |
| --- | -------------- | ------ | ------------------------------ |
| 1   | 项目架构       | 6.5/10 | 单体清晰，异步与连接治理未闭环 |
| 2   | 数据模型       | 7.5/10 | 域完整，缺 RLS/对象存储        |
| 3   | 权限安全       | 6.0/10 | 会话对账强，密钥默认与无限流弱 |
| 4   | API 完整性     | 8.0/10 | 路由全，自动编排缺             |
| 5   | 前后端流程     | 5.5/10 | 缺登录生命周期与自动任务桥     |
| 6   | 四端用户链路   | 5.5/10 | HTTP 可证，真人闭环未证        |
| 7   | UI 一致性      | 6.0/10 | 状态文案齐，设计系统未接入     |
| 8   | 商业流程完整性 | 6.0/10 | 演示链可拼，合同级自动闭环缺口 |
| 9   | 测试覆盖       | 7.5/10 | HTTP 合同强，浏览器跨端弱      |
| 10  | 上线风险控制   | 5.0/10 | 文档诚实，运行时防护与交接不足 |

---

## 上线门禁建议（不改代码，仅决策）

### 必须关闭后才可对客启用（P0）

1. **强制**强随机 `AUTH_TOKEN_SECRET`：缺省即拒绝启动，并写入部署/清单。
2. 提供正式 **登录 + refresh + logout** UI（或经批准的 SSO），禁止依赖 seed/控制台注 token。
3. 实现或书面降级「未完成动作 → 员工任务」：要么自动建任务，要么修改产品合同/清单并获客户书面确认「人工编排可接受」。
4. 完成 `docs/PILOT_ACCEPTANCE_CHECKLIST.md` 全项签字；禁用一切种子与 `oneday_local_only` 凭据。

### 上线前强烈建议关闭（P1）

5. Outbox 消费实现 **或** 明确「同步写库即完成、pending 仅审计」并改看板文案。
6. 提醒/逾期：内置调度或外挂 cron 手册。
7. 共享 `pg.Pool`（或限流连接上限）。
8. 网关/WAF 对 login 与公开写限流；全站 TLS。
9. 校准对外话术：连接器/微信/支付/AI 执行边界。
10. 补一条跨端真人演示脚本（登录后走通清单 L16–19）。

### 可带入试点但须披露（P2+）

Redis 虚假依赖、无 RLS、bytea 证据、设计系统、平台首页占位、指标 SQL、错误契约等 — 记入已知技术债，不作为「已生产就绪」卖点。

---

## 与仓库自评的关系

| 文件                         | 结论                               | 本审计态度                                         |
| ---------------------------- | ---------------------------------- | -------------------------------------------------- |
| `FINAL_ACCEPTANCE_REPORT.md` | AUTOMATED PASS，可交接受控试点准备 | **同意**自动化门禁 PASS                            |
| `PROJECT_STATE/*`            | 待人类试点交接                     | **同意**，且交接清单当前不可签满（因 P0-3 等）     |
| `docs/PILOT_LIMITATIONS.md`  | 诚实边界                           | **应严格执行**，并补充「自动任务/登录 UI」现状说明 |
| 市场/销售口径                | （若宣称四端闭环+外发）            | **否决**，直到 P0 关闭                             |

---

## 审计方法与范围说明

- 只读检查：状态文件、试点文档、产品范围、API/前端/Worker/迁移/种子、HARDENING 证据与关键测试。
- 未执行全量回归套件（避免与「不改代码、先报告」冲突）；结论以源码与既有证据交叉验证为准。
- **未修改仓库业务代码**；本文件为审计交付物。
- 发现问题已分级记录；**未进行大规模修复**。

---

## 签署栏（供人工使用）

| 角色           | 姓名             | 日期       | 结论（PASS / HOLD） |
| -------------- | ---------------- | ---------- | ------------------- |
| 审计执行       | Auto（只读审计） | 2026-08-08 | **HOLD**            |
| 产品负责人     |                  |            |                     |
| 技术负责人     |                  |            |                     |
| 试点运营负责人 |                  |            |                     |

---

_报告结束。_
