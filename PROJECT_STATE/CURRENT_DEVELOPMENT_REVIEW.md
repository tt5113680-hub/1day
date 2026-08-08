# ONEDAY V3 当前真实开发状态 — 独立审查报告

| 项               | 内容                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| 审计角色         | 独立商业产品 / 软件架构 / 质量与安全审计员                                                                    |
| 审计对象         | `D:\ONEDAY_V3`                                                                                                |
| 审计日期         | 2026-08-08                                                                                                    |
| Git 分支（真实） | `hardening/HARDENING-H-002`                                                                                   |
| HEAD             | `03ca783`（`chore(state): complete H-001`）                                                                   |
| 工作区           | **不干净**：H-002 未提交施工中（四端 login、`@oneday/session-client`、Playwright 配置与改动的 layout/页面）   |
| 状态文件自称     | `current_task: H-002` / `IN_PROGRESS`；但 `CURRENT_STATE.branch` 仍写 `hardening/HARDENING-H-001`（状态漂移） |
| 前序审计         | `PRE_RELEASE_AUDIT_REPORT.md`（基线 `4b96c93`，当时 H-001/H-002 未开工）                                      |
| 本轮约束         | **只读排查 + 唯一写入本报告**；未改业务代码、未修缺陷、未改测试、未提交                                       |

**审查口径：** 不是「代码能不能跑 / 69 任务自动化 PASS」，而是「距真正可商用、可试点、可持续扩展还差什么」。

**对施工中任务的处理：** H-002 **明确为 IN_PROGRESS**。下文区分「方向判断」与「已落成缺陷」；**不把未完成状态误判为最终缺陷**，但会评估若按当前 WIP 原样收尾会产生的产品/维护风险。

---

## A. 当前总体结论

### **HOLD**

仓库具备：清晰四端拆分、较完整的 CORE/PAGE/CHANNEL 域模型、强会话对账（HARDENING-001）、密钥 fail-closed（H-001）、大量真实 PostgreSQL HTTP 合同测试与证据纪律。

但仍**不能**对客宣称「四端商业闭环可真人上线、可持续运营」：

1. **产品合同级闭环断裂**：消费者未完成动作 **不会**自动形成客户资产 / 来源归属 / 员工任务（MVP 成功判断第 3 条；试点清单 L16 亦要求此链）。
2. **异步经营系统名存实亡**：Outbox 大量写入，Worker 仅为健康检查桩；逾期提醒依赖手工 API。
3. **真人身份旅程未闭环**：H-002 正在补 login/refresh/logout，但 WIP 方向已出现角色混淆与补丁化接入；完成前真人无法自助完成员工/管理/平台旅程。
4. **人类试点交接未签字**；种子账号仍为事故面。
5. **共享基础设施债**：约 51 个独立 `pg.Pool`、设计系统零引用、可观测性占位、连接器停在 prepared。

**不判 PASS：** 自动化门禁通过 ≠ 商用就绪。
**不判 NEEDS_REDESIGN：** 产品定位与模块骨架总体正确，问题主要是「经营编排 / 会话层 / 异步运行时」未系统落地，而非整体产品方向错误。需要的是**阶段性系统施工**，不是推倒重来。

---

## B. 当前 H-002 方向判断

> 范围：未提交的 `@oneday/session-client`、四端 `/login`、layout 中的 `SessionControls`、部分页的 `SessionGuard`、`tests/e2e/h-002-login.spec.ts`、`playwright.h-002.config.ts`。

### 正确部分

1. **抽出共享 `@oneday/session-client`**，集中 `login / refresh / logout / clear` 与 token 键名，方向正确，优于四端各自复制 fetch。
2. **对接已有 API 合同**（`/auth/login|refresh|logout` + 持久 `auth_sessions`），与 H-001 / HARDENING-001 一致，不是另起一套鉴权。
3. **意图覆盖 refresh**：`BrowserSession.accessToken()` 在临近过期时主动 refresh；Playwright 通过把 `expiresAt` 置 0 后 reload 验证恢复路径——测试意图正确。
4. **提供 `SessionGuard` + `SessionControls`**，说明作者意识到「守卫」与「退出」应成为横切能力，而非页面文案「请登录」。
5. **独立 Playwright 配置拉起 API + 四端**，相对旧 E2E「`sessionStorage.setItem` 注 token」是正确升级方向。

### 风险部分

1. **消费者端被做成员工式邮箱密码登录**
   - `/c/login` 硬编码 system 租户 UUID，登录后跳转 `/c/entry?tenant=system`。
   - 产品定位：消费者应是**公开经营入口**（场景码 / 分享 / slug），不是 `admin@system.local` 工作台账号。
   - 若按此收尾，会把「统一经营入口」扭曲成「第四个后台登录壳」。

2. **四端身份并未真正统一，只是 UI 壳统一**
   - 四端登录页几乎同构，全部写死 `00000000-0000-4000-8000-000000000001`。
   - E2E 四端都用同一种子管理员。
   - 缺少：租户选择/解析、角色路由、员工 vs 老板 vs 平台权限分流、消费者会员身份模型。

3. **SessionGuard 位置不合理（点状包裹）**
   - 当前仅见：`employee-web` 工作台、`management-web` dashboard。
   - `platform-web` / 渠道 / 商圈、员工其余页面、管理其余页面 **未挂 Guard**。
   - 根 layout 只挂了 `SessionControls`（退出按钮），无统一守卫 → 刷新后大量页仍靠本地 `sessionStorage.getItem` 显示 forbidden，**不会自动 refresh 再请求**。

4. **双轨 Token 访问（最大维护风险）**
   - 共享包有 `BrowserSession.accessToken()`（会 refresh）。
   - 业务页仍普遍 `sessionStorage.getItem('oneday.accessToken')` 直读（Grep 覆盖员工/管理/平台大量页面）。
   - 结果：Guard 测过的 refresh **不等于**业务 API 生命周期完整；15 分钟后真人仍会集体 401。

5. **登录页无设计系统、无设备角色差异**
   - 裸 `<main><form>`，与 `03_DESIGN` / 既有经营页视觉断裂；工程验收壳感强。

6. **工程状态漂移**
   - Git 在 `HARDENING-H-002`，`CURRENT_STATE.branch` 仍写 H-001；无 `evidence/H-002`；包 `main` 指向 `dist`，施工期依赖 transpile/本地构建约定需在收尾时明确。

### 是否存在补丁式施工

**是（中度补丁化倾向），但尚未锁死为坏架构。**

| 信号                  | 证据                                                            |
| --------------------- | --------------------------------------------------------------- |
| 为过测试而最小接入    | Guard 只包测试会访问的目标页；平台无 Guard 却在 E2E 断言 logout |
| 未替换旧取 token 方式 | 全仓业务页仍直读 sessionStorage                                 |
| 角色语义未建模        | 消费者强制 staff login；tenantId 写死                           |
| 横切能力未进壳层      | 未在角色 layout / 路由组统一注入                                |

这是「正确抽象起了头，落地却在用页面级创可贴赶旅程」——**现在纠偏成本低**；若标记 PASS 后再补，会形成四端分叉债务。

### 推荐调整（仍属 H-002 范围，系统级，不是再打补丁）

1. **先定义四端会话语义**
   - 消费者：默认公开；会员能力单独模型（手机/微信/最小化身份），**禁止**与员工/平台共用邮箱密码壳作为主路径。
   - 员工 / 管理 / 平台：共享 `BrowserSession`，但 login 后按 membership + RBAC 路由；tenant 来自邀请链接 / 子域 / 选择器，禁止写死 system。
2. **SessionGuard 放在受保护路由组 layout**（`/e/*`、`/m/*`、`/p|/ch|/bc`），login 路由排除；不要逐页包裹。
3. **强制所有 API 调用走 `session.accessToken()`（或薄封装 apiClient）**，删除业务页直读 sessionStorage。
4. **E2E 用角色真实账号**（员工、租户管理员、平台），禁止四端同一 seed 冒充闭环。
5. **完成前验收标准**：真人「登录 → 核心页工作 → access 过期自动续期 → logout → 再进需登录」在三端（E/M/P）成立；消费者公开链不被登录墙阻断。

---

## C. P0：阻塞商用

| ID   | 标题                                                         | 状态说明                                                                                         |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| P0-1 | 消费者动作不自动进入「客户 → 来源/归属 → 员工任务」          | **已确认缺陷**（相对 `MVP_SCOPE` / `PILOT_ACCEPTANCE_CHECKLIST` L16）                            |
| P0-2 | 真人身份旅程未完成；H-002 WIP 若按当前方向收尾会固化角色错位 | **H-002 进行中** — 记为阻塞商用的能力缺口 + 方向风险，**非**「已完成错误实现」终局判定           |
| P0-3 | 人类试点交接未完成；种子账号进入真实环境即为事故             | **流程/运营阻塞**                                                                                |
| P0-4 | 试点文档宣称的经营闭环与实现不一致，对外易构成虚假陈述       | **合同/话术阻塞**（`PILOT_LIMITATIONS` 写「consumer action → … employee task」，代码未自动串联） |

> 对照前序 `PRE_RELEASE`：原 P0-1（密钥默认回落）已被 **H-001 PASS** 关闭（`runtime-config.ts` fail-closed + 启动测试）。本报告不再列为开放 P0。

---

## D. P1：上线前必须修

| ID    | 标题                                                                              |
| ----- | --------------------------------------------------------------------------------- |
| P1-1  | Worker 无 Outbox 消费；pending 事件只增不消                                       |
| P1-2  | 任务提醒 / 逾期升级无调度，依赖 `POST .../tasks/actions/process-due`              |
| P1-3  | API ≈51 个独立 `pg.Pool`，连接耗尽风险                                            |
| P1-4  | Login / refresh / 公开写接口无限流                                                |
| P1-5  | 部署未强制 TLS；Bearer 与授权材料易明文暴露                                       |
| P1-6  | CORS 仅在配置时启用且 methods 无 DELETE；四端分离源易踩坑                         |
| P1-7  | 连接器 / 外部动作为 prepared，不可当真外发                                        |
| P1-8  | AI「确认」只改 `ai_suggestions.status=accepted`，不落地经营动作                   |
| P1-9  | 浏览器验收多为页级冒烟 + HTTP 编排；缺真人跨端经营旅程                            |
| P1-10 | H-002 完成后必须消灭「直读 sessionStorage / 注 token」双轨，否则 refresh 形同虚设 |

---

## E. P2：可试点但应排期

| ID    | 标题                                                                                   |
| ----- | -------------------------------------------------------------------------------------- | --- | ----------- |
| P2-1  | Compose/文档要求 Redis，运行时未使用                                                   |
| P2-2  | 无 PostgreSQL RLS；租户隔离仅靠应用 SQL                                                |
| P2-3  | 软删除 + 唯一约束，运营重建同 code 困难                                                |
| P2-4  | 证据 `bytea` 入库，库体积与恢复成本高                                                  |
| P2-5  | 平台「30 天活跃租户」SQL 运算符优先级可疑                                              |
| P2-6  | Refresh token pepper 硬编码（`oneday-refresh-token-v1`）                               |
| P2-7  | 错误响应契约不统一                                                                     |
| P2-8  | `@oneday/design-tokens` / `@oneday/ui` 零引用；色值/Arial 漂移                         |
| P2-9  | 平台壳首页仍为占位文案（与已交付 `/p                                                   | /ch | /bc` 矛盾） |
| P2-10 | 漏斗 visit 为推断且排除转化率（诚实但产品叙事易误解）                                  |
| P2-11 | `TASK_QUEUE` / `CURRENT_STATE` 历史段落互相覆盖，状态可信度下降                        |
| P2-12 | 共享包 `events` / `workflows` / `ai-core` / `observability` / `contracts` 与运行时脱节 |

---

## F. P3：后续迭代

| ID   | 标题                                                                      |
| ---- | ------------------------------------------------------------------------- |
| P3-1 | Vitest 几乎空；单元层薄弱                                                 |
| P3-2 | Access token 存 sessionStorage，同域 XSS 可窃                             |
| P3-3 | 消费者发现商圈 vs 平台固定商圈双模型，运营成本高                          |
| P3-4 | 分享落地页 Playwright 覆盖不足                                            |
| P3-5 | OEM / 白标 / 私有化 / Open API / 插件市场（MVP 明确不做，但扩展点需预留） |
| P3-6 | Next.js Playwright 开发服跨源告警（已知非阻断）                           |
| P3-7 | 默认 `test:e2e` 不全端                                                    |

---

## G. P0 / P1 详解

### P0-1 消费者动作不自动进入经营资产链

- **根因：** `consumer-store` / `consumer-action` / `employee-share.open` 等路径只写事件 + audit + outbox，**没有**编排 `customers` / `customer_sources` / ownership / `tasks`。HARDENING-002 HTTP 链用管理员 API **手工** `POST /customers` → sources → tasks 拼出「可追踪痕迹」，测试证明的是接口可拼，不是产品自动闭环。
- **影响：** 违反 `01_PRODUCT/MVP_SCOPE.md` 成功判断第 3 条与试点清单 L16；真人扫码咨询后员工工作台无任务 → 产品核心价值不成立。
- **系统级方案：** 定义「消费者经营事件 → 领域命令」的单一编排层（同步事务内最小闭环 **或** Outbox 消费者幂等投影）：身份解析（可匿名占位）→ upsert 客户 → 首要/当前来源 → 默认归属规则（`BUSINESS_RULES_FREEZE`）→ 按租户规则创建/合并员工任务；写入审计与可追踪 correlation。
- **禁止补丁：** 在单个 controller 里硬编码「confirm 后 insert task」且绕过归属/去重；或改测试/清单假装已满足；或要求运营手工调 API「演示闭环」。
- **涉及模块：** `apps/api` consumer\* / customer / attribution / task / employee-share；`apps/worker`（若异步）；事件契约；E2E 真闭环测试。
- **推荐顺序：** 产品规则冻结表（哪些动作建任务）→ 编排服务 → 与现有幂等键对齐 → 改 HARDENING 验收为「禁止手工建客」→ 再 UI 演示脚本。

### P0-2 真人身份旅程 / H-002 方向风险

- **根因：** 前序交付用注入 token 满足页级验收；H-002 正在补洞，但 Guard 点状接入 + 消费者 staff 化 + 业务页未统一经 session client。
- **影响：** 员工/老板/平台无法自助登录运营；完成后若方向不纠，消费者入口被登录墙污染，后续会员/OEM/多租户登录更难。
- **系统级方案：** 见 §B「推荐调整」；把会话层当作 FOUNDATION 级横切能力收口，而不是 PAGE 级附加。
- **禁止补丁：** 只给 E2E 访问到的 2～4 个页面加 Guard；继续允许业务页直读 token；四端共用一个 seed 账号当「闭环证明」。
- **涉及模块：** `packages/session-client`；四端 app layout/路由组；可选 `packages` api-client；Playwright H-002；状态/evidence。
- **推荐顺序：** 语义矩阵（谁需要登录）→ apiClient + layout Guard → 三角色真实账号 E2E → 再考虑消费者会员。

### P0-3 人类试点交接与种子账号

- **根因：** 自动化 PASS 后停在 `HUMAN PILOT HANDOFF`；清单全未勾选；种子 `admin@system.local` / `ChangeMe123!` 仍在库与文档叙事中。
- **影响：** 一旦「先用种子演示」进入客户环境，即为凭证事故与合规事故。
- **系统级方案：** 强制清单签字门禁；试点环境禁止 seed；部署检查拒绝默认口令；运维发放唯一账号。
- **禁止补丁：** 改文档说「可用种子试点」；或仅口头提醒。
- **涉及模块：** `docs/PILOT_*`；种子策略；部署检查。
- **推荐顺序：** 与 P0-1/P0-2 技术关闭后同一窗口完成签字。

### P0-4 对外闭环陈述与实现不一致

- **根因：** `PILOT_LIMITATIONS.md` 写明 demonstrated loop 含 employee task；实现依赖人工编排。
- **影响：** 销售/试点话术法律与商誉风险。
- **系统级方案：** 实现 P0-1 **或** 立即修订局限性文档与清单为「人工编排可接受」并获客户书面确认（产品降级路径）。
- **禁止补丁：** 保持文档承诺同时用脚本后台造数演示。
- **涉及模块：** docs + 编排实现二选一。
- **推荐顺序：** 先决策「做自动」还是「改合同」；禁止模糊带过。

### P1-1 Worker / Outbox 只写不消费

- **根因：** `apps/worker` 仅 HTTP `/health`；API 多处 `insert into outbox_events`（约 30+ 调用点），无消费者。
- **影响：** 平台看板 `pending_events` 虚高；一切「事后异步」能力（提醒、投影、未来连接器）无法生长。
- **系统级方案：** 最小可用 Outbox poller（租约、重试、死信、幂等 handler 注册表）；先接「经营提醒/任务投影」等高价值事件。
- **禁止补丁：** 在请求路径 `setTimeout` 伪异步；或删掉 Outbox 写入假装没有异步需求。
- **模块：** `apps/worker`、`packages/events`、相关 handlers。
- **顺序：** 基础设施 poller → 注册 2～3 个真实 handler → 再扩。

### P1-2 提醒 / 逾期无调度

- **根因：** CORE-006 能力在 API 手动触发；无 cron/worker tick。
- **影响：** 经营 SLA 静默失败；员工不会「被系统找上门」。
- **系统级方案：** Worker 定时调用同一领域服务（复用 `process-due` 逻辑），带租户分片与抖动。
- **禁止补丁：** 文档写「请运维 crontab curl」作为唯一生产方案且无监控。
- **模块：** worker、task.service、告警。
- **顺序：** 接在 P1-1 之后。

### P1-3 多 Pool

- **根因：** 每 Service `new Pool({ connectionString })`（约 51）。
- **影响：** 默认每池数十连接 → 易打满 Postgres；间歇 503。
- **系统级方案：** 进程级共享 Pool（或 DataSource 模块）+ 上限配置；禁止新 Service 自建池。
- **禁止补丁：** 只把个别热点服务合并。
- **模块：** `apps/api` 全局。
- **顺序：** 可与 P1-1 并行，属运行时稳定性。

### P1-4 无限流

- **根因：** `main.ts` 无 throttle；公开 confirm/open/share 可刷写。
- **影响：** 审计/Outbox/DB 被刷；登录爆破面。
- **系统级方案：** 网关或应用层对 login/refresh/公开写限流；按 IP + tenant/slug。
- **禁止补丁：** 仅前端 disable 按钮。
- **模块：** API / 边缘网关。
- **顺序：** 试点公网前必须。

### P1-5 TLS

- **根因：** 部署指南未强制 HTTPS。
- **影响：** 会话与 connector 材料泄露。
- **系统级方案：** 试点清单硬性 TLS；明文拒绝。
- **禁止补丁：** 「内网所以无所谓」无书面范围。
- **模块：** docs + 部署。
- **顺序：** 与交接清单合并。

### P1-6 CORS

- **根因：** 默认关闭；methods 缺 DELETE。
- **影响：** 四端分离部署全挂或会话撤销失败。
- **系统级方案：** 部署模板给齐四端 origin；methods 与真实 API 对齐。
- **禁止补丁：** `origin: true` 通配。
- **模块：** `main.ts`、部署文档。
- **顺序：** H-002 联调前对齐。

### P1-7 连接器 prepared ≠ 外发

- **根因：** 产品边界诚实，但易被销售夸大。
- **影响：** 客户期望「已接通美团/企微」。
- **系统级方案：** UI 显著标签 + 合同附件；真连接单独立项。
- **禁止补丁：** UI 显示「已发送」而无回执。
- **模块：** management/platform connectors UI、docs。
- **顺序：** 话术立即；真连接后置。

### P1-8 AI 确认不执行

- **根因：** `management-ai-suggestion` 只更新状态。
- **影响：** 违背「AI 输出可执行任务」的产品原则（确认后应生成任务/动作意图）。
- **系统级方案：** accepted → 受控命令（建任务 / 生成跟进草稿），经 RBAC；禁止静默外发。
- **禁止补丁：** 把 status 文案改成「已执行」。
- **模块：** AI suggestion、task、audit。
- **顺序：** 在 P0-1 编排层之后复用同一命令总线。

### P1-9 / P1-10 测试与会话双轨

- **根因：** 页级 Playwright + HTTP 编排；token 双轨。
- **影响：** 回归绿但真人链路红。
- **系统级方案：** 一条跨端经营旅程 E2E（含 refresh）；apiClient 强制。
- **禁止补丁：** 继续 `setItem` token 当主路径。
- **模块：** tests、session-client、各 web。
- **顺序：** H-002 完成门槛写入。

---

## H. 给 Codex 的批量施工建议

按**阶段批量**重组，禁止「一个审计 ID 一个补丁 PR」。

### 批次 0 — 状态与门禁（0.5 天）

- 修正 `CURRENT_STATE` 分支名与 H-002 IN_PROGRESS 事实。
- 书面冻结：H-002 验收语义矩阵（消费者是否登录墙）。
- 决策 P0-4：自动闭环 vs 文档降级（二选一，禁止模糊）。

### 批次 1 — 会话层系统化（完成 H-002，纠偏后 PASS）

- 角色语义 + layout 级 Guard + apiClient 取代直读 sessionStorage。
- 三角色真实账号 Playwright；消费者公开链不被误伤。
- evidence/H-002；禁止仅包 2 个页面交差。

### 批次 2 — 经营编排闭环（关闭 P0-1 / P0-4）

- 单一「ConsumerOperatingOrchestrator」（命名随意，职责唯一）。
- 动作/分享/咨询 → 客户/来源/归属/任务幂等投影。
- 重写验收：HARDENING 类测试**禁止**管理员手工建客建任务作为主断言。

### 批次 3 — 异步运行时（P1-1 / P1-2）

- Worker Outbox 消费框架 + due-task 调度。
- 死信、重试、指标（至少 pending/失败可观测）。

### 批次 4 — 运行时稳定性与安全（P1-3 / P1-4 / P1-5 / P1-6）

- 共享 Pool；限流；CORS/TLS 部署模板 hardening。

### 批次 5 — AI 落地与连接器诚实性（P1-7 / P1-8）

- AI accepted → 命令总线；连接器 UI/文档标签一致。

### 批次 6 — 试点交接（P0-3）

- 清单签字；禁用种子；真人脚本走通 L16–19。

### 批次 7 — 体验与扩展债（P2 选做）

- 接入 design-tokens/ui；平台首页去占位；错误契约；证据对象存储规划；RLS 评估。

**并行规则：** 批次 1 与 批次 4 的 Pool 可并行；批次 2 依赖产品决策；批次 3 依赖事件契约稳定；**不要**在批次 1 未纠偏时并行做四端各自登录美化。

---

## I. 最终推荐施工路线

```text
阶段 A  会话与身份系统化（纠偏后的 H-002）
   →  真人可进入员工 / 管理 / 平台；refresh/logout 真闭环；消费者保持公开入口

阶段 B  经营编排闭环（自动客户/来源/归属/任务）
   →  产品合同与试点清单 L16 可诚实勾选

阶段 C  Worker + Outbox + 逾期调度
   →  经营提醒不再靠人工 curl

阶段 D  Pool / 限流 / TLS / CORS
   →  受控试点可公网暴露的最低运行时安全

阶段 E  AI 确认落地 + 连接器边界产品化
   →  「建议」变成可执行、可审计的下一步

阶段 F  人类试点交接签字
   →  唯一对外「可试点」门禁

阶段 G  设计系统 / 数据纵深 / OEM·OpenAPI 预留
   →  可持续扩展，不阻塞首期试点
```

**阶段门禁建议：**

- A 未 PASS：不算 H-002 完成。
- B 未 PASS：不得签试点清单「商业演示链」。
- F 未签字：不得对客启用。

---

## 附录 1：十二维审查摘要

### 1. 产品定位

- **总体仍符合**「统一经营入口 + 员工执行 + 老板监督 + 渠道/商圈 + AI 辅助」骨架。
- **偏离风险：** 管理/平台页面数量膨胀后，「后台功能堆砌」感增强；消费者动作未回流任务，导致入口与经营脱节。
- H-002 WIP 若强制消费者邮箱登录，会**进一步偏离**消费者端定位。

### 2. Hardening 方向

| 项                 | 判断                                    |
| ------------------ | --------------------------------------- |
| H-001              | **正确且已 PASS**（fail-closed secret） |
| H-002 统一 Session | **方向正确，落地偏补丁**；需按 §B 纠偏  |
| SessionGuard 位置  | **不合理**（点状页面，非路由组）        |
| 四端身份统一       | **表面统一、语义未统一**                |
| 为过测试打补丁     | **存在倾向**                            |
| 后续维护           | 双轨 token 会显著增加成本               |

### 3. 系统架构

- 边界：apps 四端 + api + worker，包过多但多数未接入。
- 重复：各页自写 fetch；各 service 自建 Pool；Outbox SQL 复制粘贴。
- 数据访问：迁移 Kysely，运行时 raw `pg`。
- Worker/Outbox/调度：断裂。
- Auth：服务端强；浏览器层施工中。
- Observability：`logger: false`，包占位。
- 扩展性：租户/RBAC/事件字段预留尚可；编排与异步未成平台。

### 4. 四端真人链路（模拟）

| 角色      | 首次进入                     | 登录                               | 核心工作                 | 异常      | refresh              | logout           | 再进入       |
| --------- | ---------------------------- | ---------------------------------- | ------------------------ | --------- | -------------------- | ---------------- | ------------ | --- | ---- |
| 消费者    | 公开 `/c/*` 可用             | WIP 却引入 staff login（错误方向） | 浏览/动作可用            | 有空/错态 | 不应依赖 staff token | 不适用公开主路径 | 分享码可再进 |
| 员工      | 无会话 → 多页 forbidden 文案 | WIP login                          | 工作台等可用（需 token） | 有        | 业务页直读则断       | WIP Controls     | 需再登录     |
| 老板      | 同左                         | WIP                                | 看板等可用               | 有        | 同左                 | WIP              | 同左         |
| 平台/渠道 | 同左；根页占位               | WIP；无 Guard                      | `/p                      | /ch       | /bc` 可用            | 有               | 同左         | WIP | 同左 |

**「接口有，真人不会用」典型：** 管理端造客户/任务代替消费者自动成单；`process-due` 手工点；连接器「授权」无外发；AI「接受」无动作。

### 5. 商业闭环

```text
现实：动作事件 ──✗──> 客户/来源/归属/任务
验收：管理员 API 手工补齐 ──✓──> 痕迹可查
产品：应自动 ──✓──> 员工跟进 → 证据 → 复购
```

复购/养客/获客池等**后半段**能力存在，但**前半段自动点火**缺失。

### 6. UI / UX / 高保真

- 角色设备分工大体正确（C/E 移动，M/P 桌面）。
- 工程后台感：Arial、手写蓝、tokens 未用、平台占位首页、H-002 登录裸表单。
- 状态（加载/空/错/无权限）文案在旧页较齐；未达商业 SaaS 品牌试点水准。
- Demo 感：注 token 验收史、种子管理员四端通吃（测试）。

### 7. 权限与安全

- 强：会话 DB 对账、RBAC、平台 system 租户、跨租户拒绝、connector 指纹。
- 弱：无限流、TLS 非强制、pepper 硬编码、无 RLS、种子账号、token 存 sessionStorage。
- H-001 已修密钥默认回落。

### 8. 数据与性能

- 索引/乐观锁/幂等在写路径普遍存在（质量加分）。
- 风险：多 Pool、bytea 证据、软删唯一约束、Outbox 膨胀。

### 9. 异步与经营提醒

- Outbox 写全；消费无；调度无；AI/提醒无法自动运转。

### 10. 测试质量

- HTTP 合同：**强**。
- Playwright：**中**（页冒烟）。
- 真人跨端 + token 生命周期 + 自动商业闭环：**弱 / 施工中**。
- 存在「测试编排绕过真实业务点火」模式（HARDENING-002）。

### 11. 上线与运维

- 文档包较全（HARDENING-005）；清单未签。
- 监控/限流/Worker/TLS 不足。
- 恢复仅为测试库 clone。

### 12. 未来扩展

- 未封死 OEM/渠道/商圈/插件方向（模型有租户与连接器）。
- **可能封死的路径：** 消费者=staff login；页面级会话补丁；无编排总线导致各页私自 insert task；Outbox 无人消费导致事件模型空转。
- Open API / 白标：需稳定鉴权客户端与设计 tokens 真正落地后才可扩展。

---

## 附录 2：与前序 PRE_RELEASE 审计的关系

| 前序项                | 本轮                                        |
| --------------------- | ------------------------------------------- |
| P0 密钥默认           | **已关闭（H-001）**                         |
| P0 无登录 UI          | **转为 H-002 IN_PROGRESS**；方向需纠偏      |
| P0 自动任务           | **仍开放（本报 P0-1）**                     |
| P0 交接签字           | **仍开放（本报 P0-3）**                     |
| P1 Worker/Pool/限流等 | **仍开放**                                  |
| 总判 HOLD             | **维持 HOLD**；增加「H-002 补丁化风险」专项 |

---

## 附录 3：核验过的关键事实清单（摘录）

- Git：`hardening/HARDENING-H-002` @ `03ca783`；脏工作区含 session-client 与四端 login。
- `evidence/H-001` 存在；`evidence/H-002` **不存在**。
- `apps/worker/src/index.ts` 仅健康检查。
- `consumer-action.service.ts` / `consumer-store.service.ts` confirm/open 无客户/任务写入。
- `tests/hardening-002-e2e.test.mjs` L88–126 管理员手工建客/来源/任务。
- `SessionGuard` 仅 workbench + management dashboard；业务页大量直读 `oneday.accessToken`。
- 四端 login 均硬编码 system tenant UUID。
- `@oneday/ui` / `@oneday/design-tokens` 在 apps 中 **零引用**。
- `platform-web/app/page.tsx` 仍为「将在后续页面任务接入」。
- API service 级 `new Pool(` 约 **51** 处。

---

## 签署栏

| 角色             | 结论                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| 独立审计（本轮） | **HOLD**                                                                          |
| H-002 方向       | **可继续，但必须先纠偏再收尾**；禁止以当前点状 Guard + 消费者 staff 登录标记 PASS |
| 产品负责人       | （待签）                                                                          |
| 技术负责人       | （待签）                                                                          |

---

_本报告为唯一允许写入物。未修改业务代码，未提交 Git。_
