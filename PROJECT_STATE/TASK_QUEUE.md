# TASK_QUEUE

## Current product-owner acceptance

- [x] HARDENING-006 PASS - Docker workspace dependency build order repaired for API, Worker and human-pilot image targets. Verified by 18-package typecheck and clean Docker human-pilot artifact build. Evidence: `evidence/HARDENING-006/ACCEPTANCE.md`.
- [ ] CONSUMER-COMMERCIAL-HOME-V1 AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE - Consumer-only commercial storefront implemented and technically verified. Follow-ups add persisted package-to-platform comparison prices, align Consumer service/action child-page styling, and restructure the storefront header with LBS, a future recommendation placeholder and a persisted-data store-information card; final visual decision remains with the product owner. Evidence: `evidence/CONSUMER-COMMERCIAL-HOME-V1/ACCEPTANCE.md`.

## Audit hardening status (latest)

- [x] H-001 PASS - API startup fails closed without a safe authentication signing secret.
- [x] H-002 PASS - systemic shared session boundary: real employee, management and platform login/refresh/logout; 36 E/M/P business pages migrated from 54 direct token reads; public consumer entry requires explicit tenant and remains anonymous; real Playwright 6/6 PASS.
- [x] AUDIT-BATCH-2 PASS (`5c0ea50`) - commercial operating orchestration: public consumer behaviour atomically projects customer/source/ownership or lead-pool/task/reminder/audit/Outbox, with HTTP full-chain evidence.
- [x] AUDIT-BATCH-3 PASS (`3998a7d`) - Worker / Outbox consumption / reminder / overdue scheduling.
- [x] AUDIT-BATCH-4 PASS (207740e) - shared API pool, database-backed auth/public-write rate limits, strict CORS and production TLS/proxy/edge-rate-limit startup controls; real HTTP security acceptance and 180 repository tests passed.
- [x] AUDIT-BATCH-5 PASS (`aa50e0e`) - controlled local AI task commands, `manual_required` fallback, execution audit/Outbox receipts, and honest management/platform connector capability boundaries.
- [x] AUDIT-BATCH-6 PASS (`62f102b`) - real public consumer -> employee follow-up/result/evidence -> owner-management journey, with actual employee/owner/platform sessions and second-tenant/low-privilege API isolation denials.
- [x] AUDIT-BATCH-7 PASS (`d175f64`) - shared commercial-language presentation, anonymous-customer minimization, accurate public platform-entry copy and non-overlapping 390px employee result form, verified by real four-terminal Playwright and full quality gates.
- [x] AUDIT REMEDIATION STAGE PASS - A through G are complete; see `PROJECT_STATE/AUDIT_REMEDIATION_CLOSEOUT.md`.
- [x] PRE-PILOT-POLISH PASS (`268464d`) - completed only the eight approved pilot-experience/deterministic-defect items; acceptance is recorded in `PROJECT_STATE/PRE_PILOT_POLISH_ACCEPTANCE.md` and no Hardening expansion occurred.
- [ ] HUMAN-PILOT-HANDOFF ACCEPTANCE REQUIRED - an operator must provision live credentials/authorizations and sign the controlled-pilot checklist; no new development phase starts automatically.
- [x] LOCAL HUMAN-PILOT-SANDBOX READY - isolated `oneday_human_pilot` database migrated through 045, non-seed local accounts, six localhost services, machine preflight evidence and human runbook are ready. This is not public HTTPS, production acceptance or an external authorization.

## Final commercial acceptance status (final)

- [x] FINAL COMMERCIAL ACCEPTANCE PASS - all 69 indexed tasks, fresh-database release rehearsal, live readiness/recovery, browser acceptance, and repository quality gates verified.
- [ ] HUMAN PILOT HANDOFF - operator must provision live credentials/authorizations and sign the controlled-pilot checklist before customer enablement.

## Final commercial acceptance status (latest)

- [x] HARDENING-005 PASS - controlled pilot deployment, administrator, limitation and acceptance package verified.
- [ ] FINAL COMMERCIAL ACCEPTANCE IN PROGRESS - execute clean-database release rehearsal and final handoff report.

## Current hardening status (latest)

- [x] HARDENING-004 PASS — guarded PostgreSQL recovery clone and release/recovery rehearsal verified.
- [ ] HARDENING-005 NEXT — pilot delivery package and final commercial acceptance.

## Current hardening status (latest)

- [x] HARDENING-003 PASS — database-backed readiness and connector recovery reliability verified.
- [ ] HARDENING-004 NEXT — backup recovery and release rehearsal.

## Current hardening status (latest)

- [x] HARDENING-002 PASS — four commercial MVP HTTP chains and four-terminal browser evidence verified.
- [ ] HARDENING-003 NEXT — performance and reliability hardening.

## Current hardening status (latest)

- [x] HARDENING-001 PASS — persistent session validation, tenant isolation and private controller authorization contracts verified.
- [ ] HARDENING-002 NEXT — commercial MVP end-to-end acceptance.

## Current hardening status (latest)

- [x] CHANNEL / BUSINESS-CIRCLE PHASE ACCEPTED — full gates and evidence verified.
- [ ] HARDENING-001 NEXT — end-to-end permissions and tenant-isolation hardening.

## Channel phase status (latest — acceptance required)

- [x] CIRCLE-002 PASS — business-circle merchant invitation, dual approval, display control and exit verified.
- [ ] CHANNEL PHASE ACCEPTANCE — review CHANNEL-001, CHANNEL-002, CIRCLE-001 and CIRCLE-002 before HARDENING-001.

## Current task status (latest — CIRCLE-001 passed)

- [x] CIRCLE-001 PASS — fixed business-circle operations console verified.
- [ ] CIRCLE-002 NEXT — business-circle merchant management.

## Current task status (latest — CHANNEL-002 passed)

- [x] CHANNEL-002 PASS — channel merchant onboarding verified.
- [ ] CIRCLE-001 NEXT — fixed business-circle operations console.

## Current task status (latest — CHANNEL-001 passed)

- [x] CHANNEL-001 PASS — channel operations console verified.
- [ ] CHANNEL-002 NEXT — channel merchant onboarding.

## Current task status (latest — PAGE-P-008 passed)

- [x] PAGE-P-008 PASS — platform security audit verified.
- [ ] CHANNEL-001 NEXT — channel operations console.

## Current task status (latest)

- [x] PAGE-P-007 PASS — platform connectors verified.
- [ ] PAGE-P-008 NEXT — platform security audit.

## Current task status (previous)

- [x] PAGE-P-006 PASS — platform template components verified.
- [ ] PAGE-P-007 NEXT — platform connectors.

## Current task status (previous)

- [x] PAGE-P-005 PASS — fixed business-circle management verified.
- [ ] PAGE-P-006 NEXT — platform template components.

## Current task status (previous)

- [x] PAGE-P-004 PASS — channel management verified.
- [ ] PAGE-P-005 NEXT — business-circle management.

## Current task status (latest)

- [x] PAGE-P-003 PASS — tenant onboarding verified.
- [ ] PAGE-P-004 NEXT — channel management.

## Current task status (latest)

- [x] PAGE-P-002 PASS — tenant management verified.
- [ ] PAGE-P-003 NEXT — tenant onboarding wizard.

## Current task status (latest)

- [x] PAGE-P-001 PASS — platform overview verified.
- [ ] PAGE-P-002 NEXT — tenant management.

## Current task status (latest)

- [x] PAGE-M-016 PASS — tenant operating settings verified.
- [ ] PAGE-P-001 NEXT — platform overview.

## Current task status (latest)

- [x] PAGE-M-015 PASS — connector management verified.
- [ ] PAGE-M-016 NEXT — tenant operating settings.

## Current task status (latest)

- [x] PAGE-M-014 PASS — page decoration verified.
- [ ] PAGE-M-015 NEXT — connector management.

## Current task status (latest)

- [x] PAGE-M-013 PASS — content center verified.
- [ ] PAGE-M-014 NEXT — page decoration.

## Current task status (latest)

- [x] PAGE-M-012 PASS — source attribution verified.
- [ ] PAGE-M-013 NEXT — content center.

## Current task status (latest authoritative)

- [x] PAGE-M-011 PASS — employee process performance verified.
- [ ] PAGE-M-012 NEXT — source attribution.

## Current task status (authoritative)

- [x] PAGE-M-010 PASS — permission audit verified.
- [ ] PAGE-M-011 NEXT — employee process performance.

This section supersedes older duplicate task snapshots below.

## Current employee status (authoritative)

- [x] PAGE-E-001 PASS — employee-scoped workbench verified.
- [x] PAGE-E-002 PASS — employee task detail and evidence links verified.
- [x] PAGE-E-003 PASS — employee-related customer detail verified.
- [x] PAGE-E-004 PASS — employee follow-up records and next tasks verified.
- [x] PAGE-E-005 PASS — employee sharing codes, QR entry, expiry and source tracing verified.
- [x] PAGE-E-006 PASS — employee acquisition pool verified.
- [x] PAGE-E-007 PASS — employee nurture workbench verified.
- [x] PAGE-E-008 PASS — employee notifications verified.
- [x] PAGE-E-009 PASS — employee profile and tools verified.
- [x] PAGE-M-001 PASS — management overview verified.
- [x] PAGE-M-002 PASS — management funnel verified.
- [x] PAGE-M-003 PASS — customer assets verified.
- [x] PAGE-M-004 PASS — management customer detail verified.
- [x] PAGE-M-005 PASS — workflow center verified.
- [x] PAGE-M-006 PASS — AI suggestion center verified.
- [x] PAGE-M-007 PASS — store management verified.
- [x] PAGE-M-008 PASS — organization and employees verified.
- [x] PAGE-M-009 PASS — roles and permissions verified.
- [ ] PAGE-M-010 NEXT — permission audit.

## Current page status

- [x] PAGE-C-001 PASS — public consumer entry renders published template and actions with mobile state coverage.
- [x] PAGE-C-002 PASS — tenant-scoped channel recommendations, fixed business circles and LBS discovery are independently rendered and verified.
- [x] PAGE-C-003 PASS — consumer store detail, consultation trace, audit and Outbox verified.
- [x] PAGE-C-004 PASS — consumer service detail, benefits and tenant-scoped action trace verified.
- [x] PAGE-C-005 PASS — consumer external-action redirect, recovery and audit trail verified.
- [x] PAGE-C-006 PASS — consumer process/results, private access and recovery verified.
- [x] PAGE-C-007 PASS — consumer identity, membership, minimized data exposure and consent revocation verified.

## Employee status archive

The following current employee status is authoritative; the two legacy entries retained below it are superseded snapshots and must be ignored.

## Current employee status

- [x] PAGE-E-001 PASS — employee-scoped workbench, actionable tasks, due-signal opportunities and customer reminders verified.
- [x] PAGE-E-002 PASS — employee-scoped task detail, evidence links and self completion verified.
- [ ] PAGE-E-003 NEXT — employee customer detail.

- [x] PAGE-E-001 PASS — employee-scoped workbench, actionable tasks, due-signal opportunities and customer reminders verified.
- [ ] PAGE-E-002 NEXT — employee task detail.

## Latest core status

- [x] PAGE-C-001 PASS — public consumer entry renders published template and actions with mobile state coverage.
- [ ] PAGE-C-002 NEXT — consumer discovery page.

## Latest core status

- [x] CORE-002 PASS — employee invitations, memberships, lifecycle, audit and outbox verified.
- [ ] CORE-003 NEXT — role and permission management.

## Current core status

- [x] CORE-001 PASS — tenant, organization, merchant and store model; evidence and all applicable quality gates passed.
- [ ] CORE-002 NEXT — user, employee and membership model.

## Milestones

- [x] FOUNDATION MILESTONE PASS — FOUNDATION-001 至 FOUNDATION-010（10/69，基础阶段最终状态提交：239114e）

- [x] FOUNDATION-001 — 新仓库与 Monorepo 骨架
- [x] FOUNDATION-002 — 本地基础设施
- [x] FOUNDATION-003 — 共享配置与代码质量
- [x] FOUNDATION-004 — 数据库迁移与种子框架
- [x] FOUNDATION-005 — 认证与会话
- [x] FOUNDATION-006 — 租户上下文与数据隔离
- [x] FOUNDATION-007 — RBAC与数据范围
- [x] FOUNDATION-008 — 事件与Outbox
- [x] FOUNDATION-009 — 设计系统与应用壳
- [x] FOUNDATION-010 — 测试与证据框架
- [x] CORE-001 — 租户与组织模型
- [x] CORE-002 — 用户员工与成员关系
- [x] CORE-003 — 角色权限管理服务
- [x] CORE-004 — 客户主档与身份
- [x] CORE-005 — 来源归属与贡献
- [x] CORE-006 — 任务提醒与升级
- [x] CORE-007 — 证据与结果回收
- [x] CORE-008 — 页面模板与模块
- [x] CORE-009 — 入口插件与外部动作
- [x] CORE-010 — 标准工作流引擎
- [x] PAGE-C-001 — 消费者统一入口
- [ ] PAGE-C-002 — 消费者发现页
- [ ] PAGE-C-003 — 商户详情
- [x] PAGE-C-004 — 服务/权益详情
- [x] PAGE-C-005 — 外部动作中转
- [x] PAGE-C-006 — 过程与结果查询
- [ ] PAGE-C-007 — 消费者身份与会员
- [ ] PAGE-E-001 — 员工工作台
- [ ] PAGE-E-002 — 任务详情
- [ ] PAGE-E-003 — 客户详情
- [ ] PAGE-E-004 — 跟进记录
- [ ] PAGE-E-005 — 分享码与场景
- [ ] PAGE-E-006 — 获客池
- [ ] PAGE-E-007 — 养客工作台
- [ ] PAGE-E-008 — 消息与通知
- [ ] PAGE-E-009 — 个人与工具
- [ ] PAGE-M-001 — 经营总览
- [ ] PAGE-M-002 — 经营漏斗
- [ ] PAGE-M-003 — 客户资产
- [ ] PAGE-M-004 — 管理客户详情
- [ ] PAGE-M-005 — 流程中心
- [ ] PAGE-M-006 — AI建议中心
- [ ] PAGE-M-007 — 门店管理
- [ ] PAGE-M-008 — 组织与员工
- [ ] PAGE-M-009 — 角色权限
- [ ] PAGE-M-010 — 权限审计
- [ ] PAGE-M-011 — 员工过程绩效
- [ ] PAGE-M-012 — 来源归因
- [ ] PAGE-M-013 — 内容中心
- [ ] PAGE-M-014 — 页面装修
- [x] PAGE-M-015 — 插件连接器
- [ ] PAGE-M-016 — 租户经营设置
- [ ] PAGE-P-001 — 平台总览
- [ ] PAGE-P-002 — 租户管理
- [ ] PAGE-P-003 — 租户开通向导
- [ ] PAGE-P-004 — 渠道管理
- [ ] PAGE-P-005 — 固定商圈管理
- [ ] PAGE-P-006 — 平台模板组件
- [ ] PAGE-P-007 — 平台连接器
- [ ] PAGE-P-008 — 平台安全审计
- [ ] CHANNEL-001 — 渠道经营台
- [ ] CHANNEL-002 — 渠道商户开通
- [ ] CIRCLE-001 — 固定商圈经营台
- [ ] CIRCLE-002 — 商圈商户管理
- [ ] HARDENING-001 — 全链路权限与隔离加固
- [ ] HARDENING-002 — 商业MVP端到端验收
- [ ] HARDENING-003 — 性能与可靠性
- [ ] HARDENING-004 — 备份恢复与发布演练
- [ ] HARDENING-005 — 试点交付包
