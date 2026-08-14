# G1-W∞-121 ACCEPTANCE — 审计导出全覆盖（W∞-SAAS-AUDIT）

- recorded_at: 2026-08-14 Asia/Shanghai
- task: `G1-R-SAAS-AUDIT` / W∞-121（Phase3 §6 审计导出全覆盖）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §6「写操作不可篡改审计 + 导出」
- executor: DeepSeek / Plan B（本切片）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单

## Delivered

把管理端 `/m/permission-audit`（操作审计，MPC-12/SAAS-AUDIT）从「只读列表 + 分布」推进到 **真实审计记录 CSV 导出 + 导出本身也被审计 + 派发 Outbox** 的可作业闭环，全部由真实 `audit_logs` 行现场导出（禁止假 BI）。

### 1. API `ManagementPermissionAuditController` + `ManagementPermissionAuditService`
- 抽取共享 `queryAuditRows(tenantId, filter)`：on-screen 列表与 CSV 导出永远同源同筛选。
- `exportAudit(context, filter, requestId)`：按 `filter=all|change|export|risk` 导出同租户真实 `audit_logs` 为 CSV（表头 `action,kind,actor,resource_type,resource_id,correlation_id,trace_id,detail,created_at`，CSV 转义 `""`）。
- **导出写路径自审计**：每次导出写 `audit_logs('management.audit.exported','audit_export')` + `outbox_events('management.audit.exported.v1','audit_export')` → 审计导出全覆盖闭环。
- `GET /api/v1/management/permission-audit/export`：`tenant.manage` fail-closed + `x-request-id` 校验 + `text/csv; charset=utf-8` attachment + `nosniff`；非法 filter 400。
- 复用 `list` 的共享查询，无 schema / migration / DB 变更。

### 2. `/m/permission-audit` 管理页
- `topBar` 新增「导出审计」按钮（下载当前筛选 CSV）+ loading 禁用态。
- 导出成功显示黄色 `exportBar` 提示条（`aria-label`/`data-testid=audit-export-message`）。
- 诚实边界全保留（source=local、仅本地可追溯安全证据、不接美团/抖音实时、不包含本平台收款、非本平台下单）；`/m/workflows` 仍 CUSTOM。

## Evidence commands

- `node --test tests/g1-winf121-audit-export-full-coverage.test.mjs` → **3/3**（静态 + 真实 DB round-trip：401 / 跨租户 403 deny / CSV 内容含种子 action+trace / audit+outbox 落库断言 / 非法 filter 400）
- `node --test tests/g1-winf*.test.mjs` → 串行复核 **437/438**（唯一失败 `g1-winf116` 为并行 API 起服 `ECONNRESET` 瞬断，隔离复跑 10/10 通过，与本刀无涉）
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49
- `pnpm evidence:check` → 74/74；变更文件 eslint + prettier clean

## Honest boundaries

审计导出来自租户本地不可篡改 `audit_logs`，仅记录入口/权限/导出/风险等可追溯证据链；导出动作本身计入审计与 Outbox。不接美团/抖音实时、不代表第三方成交、不含支付金额、非本平台下单、无 GMV。
