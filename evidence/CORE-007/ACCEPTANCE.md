# CORE-007 验收证据

## 交付范围

- 已持久化客户订单、截图/照片证据、核销码和连接器结果回执；所有记录以 `tenant_id` 和关联的客户订单限制访问。
- 图片证据仅接受 PNG、JPEG、WebP，拒绝路径穿越文件名、错误内容签名和超过 5 MiB 的内容；二进制内容、MIME 类型、尺寸与 SHA-256 均存储，下载要求 `evidence.read` 并以附件响应、`nosniff` 头返回。
- 核销码仅存储 SHA-256，不返回明文；核销使用版本号和事务，已核销或过期/不匹配代码拒绝重复状态变更。
- 订单、文件、核销和连接器回执的关键写操作均有幂等保护（适用创建操作）、审计日志及含 correlation/trace 的 Outbox 事件。

## 自动化验收

- `tests/core-007-e2e.test.mjs` 使用构建后的 NestJS/Fastify API 与 PostgreSQL，验证订单创建与幂等、真实 PNG 上传/下载、文件安全校验、核销、连接器结果、审计、Outbox、未登录、无角色拒绝和跨租户拒绝。
- 最近一次 HTTP E2E：`1 passed, 0 failed`（`customer order results persist secure evidence, verification and connector receipts`）。
- 本任务无页面交付；页面 E2E、截图、可访问性检查不适用。连接器回执是本地持久化的受控输入，实际第三方连接器授权和调用属于后续 CORE-009。

## 质量闸门

- `pnpm.cmd typecheck`、`pnpm.cmd build`：17/17 workspaces passed。
- `pnpm.cmd lint`、`pnpm.cmd format:check`、`pnpm.cmd test`、`pnpm.cmd test:unit`、`pnpm.cmd evidence:check` 与 `git diff --check` 已通过。
- `pnpm.cmd db:migrate` 已实际应用 `012_result_evidence`；`pnpm.cmd db:seed` 已写入 `evidence.read` / `evidence.manage` 权限。
