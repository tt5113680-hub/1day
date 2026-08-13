# G1-W∞-116 ACCEPTANCE — 员工邀请→激活→角色包（MPC-10）

- recorded_at: 2026-08-13 Asia/Shanghai
- task: `G1-R-EMPLOYEE-ROLE-PACKAGE` / W∞-116
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase2（§4 P1 MPC-10）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰

## Delivered

把 MPC-10 `/m/organization-employees`（员工管理）从「创建/邀请/离职」推进到 **邀请→激活→角色包→门店 scope** 的可作业闭环，全部由真实租户档案行现场推导/落库（禁止假 BI）：

### 1. 邀请携带角色包与门店范围（`employee.service.ts` `invite`）
- `POST /api/v1/employees/invitations` 现接受可选 `roleCode`（`store_manager`/`employee`）与 `storeId`：
  - `roleCode` 经租户 `roles`（`code` 匹配 `status='active'`）解析为 `role_id`，非法即 400；
  - `storeId` 校验归属租户门店，非法即 404；
  - 落库 `membership_invitations.role_id` / `.store_id`（Idempotency-Key 幂等重放 + `audit_logs employee.invited` + `outbox employee.invited.v1` 全保留）。

### 2. 激活即绑定角色包与门店 scope（`employee.service.ts` `accept`）
- 员工接受邀请激活后（建 user/membership/employee），据邀请 `role_id` 写 `membership_roles`（`on conflict(membership_id,role_id) do nothing`）；
- 据邀请 `store_id` 写 `store_managers`（`on conflict(store_id,employee_id)` 恢复 active）+ `data_scopes`（`scope_type='store'`，`on conflict(membership_id,scope_type,scope_value)` 恢复 active）；
- 仍写 `audit_logs employee.accepted` + `outbox employee.accepted.v1`；仅登记租户内授权，不碰钱/销售/管店。

### 3. 概览回读角色包与门店范围（`management-organization-employee.service.ts` `overview`）
- `employees[]` 每行返回 `roles`（由 `membership_roles join roles` 聚合 `r.code`）+ `store_scope`（`store_managers` active 集合）；
- `invitations[]` 返回 `role_code`/`role_id`/`store_id`/`store_name`；
- 新增 `roles[]`（可邀请角色包列表）与 `stores[]`（可选门店范围列表）供 UI 与受邀行展示。

### 4. `/m/organization-employees` UI（`page.tsx` + `page.module.css`）
- 邀请表单新增「角色包」（店长/员工）+「门店范围（可选，不限定门店）」下拉；
- 待接受邀请行展示 `角色包` + `门店名`；
- 员工行展示 `角色包` + `门店范围` 明细；
- 概况条 `summaryStrip` 新增「店长员工」计数（5 列，`repeat(5)`）；
- 分布面板新增「角色包分布」（真实 roles 计数）；
- loading/forbidden/error/empty 全状态与既有创建/邀请/离职交互全继承；`data-testid="management-organization-employees"` 保留。

## Evidence commands

- `node --test tests/g1-winf116-employee-role-package.test.mjs` → **7/7**（静态扫描：migration 069 的 role_id/store_id 列 + 诚实边界；invite 接收 roleCode/storeId 并落库；accept 绑定 membership_roles + store_managers + data_scopes；overview 暴露 roles/stores/store_scope/role_code；页面角色包+门店选择与分布；诚实边界无伪 BI/mockMetrics/Math.random；真实 DB：新建独立租户 + supervisor 角色（含 employee.manage/organization.manage）+ 组织/商户/门店 + store_manager/employee 角色包 → owner 登录 → 带 roleCode=store_manager + storeId 邀请（201）→ accept 激活（201）→ 断言 membership_roles/store_managers/data_scopes 均绑定 → 跨租户 403/404 deny → overview 回读 roles 含 store_manager + store_scope 含门店 + 受邀已激活不再 pending）
- 随动回归：`node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **427/427**（原 420 + 7），其中 g1-winf43 / g1-winf48（employee 页 heroCard/honest/summaryStrip 断言）回归通过
- 真实 DB 串行复核：W107–115 既往 real-DB round-trip + matrix-sync-gateway + p1-b-content-sync → **429/429**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49（12 文件）
- `node tests/evidence-contract.test.mjs` → 74/74；变更文件 eslint（0 errors）+ prettier clean
- `pnpm db:migrate`（DATABASE_URL=oneday_v3_test）apply **069_employee_role_package**

## Honest boundaries

- 角色包与门店 scope 仅是推广员工具在租户内的**访问授权登记**：邀请落库目标角色/门店，接受激活据此绑定 `membership_roles`/`store_managers`/`data_scopes`
- **不接美团/抖音实时人事或绩效**、不伪造第三方评分或成交、不包含本平台收款、非本平台下单
- `invite`/`accept` 既有幂等 + audit + outbox 全保留；未绑角色包/门店的邀请照常工作（role_id/store_id 为空跳过绑定）
- **无 GMV、无储值/支付、非本平台下单**；`/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders / 本平台下单 / 收单

## Next

- **W∞-117** 通知已读/忽略/批量（MPC-13）+ 设置变更审计（MPC-12）——Phase2 收尾后进入 Phase3 SaaS 最强（W∞-118+）。
