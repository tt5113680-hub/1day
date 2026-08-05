# CORE-003 — 角色权限管理服务

## 任务状态

PENDING

## 阶段

core

## 前置任务

CORE-002

## 目标

实现角色模板、权限分配、变更审计和敏感确认。

## 施工边界

- 只实现本任务直接要求的能力。
- 不修改产品冻结、技术栈和其他任务边界。
- 不把静态 mock 当作业务完成。
- 不复用旧工程未经重新验证的代码。
- 发现依赖缺失时记录阻塞，不跨任务补全大功能。

## 开始前必须读取

- `01_PRODUCT/PRODUCT_FREEZE.md`
- `01_PRODUCT/MVP_SCOPE.md`
- `02_ARCHITECTURE/TECH_STACK_AND_REPO.md`
- `06_QUALITY_SECURITY/QUALITY_GATES.md`
- `07_CODEX_RULES/CODEX_EXECUTION_PROTOCOL.md`
- 本任务直接依赖的规范与前置任务交接

## 必须产出

1. 业务实现代码；
2. 数据库迁移或契约变更（适用时）；
3. API/事件/权限实现（适用时）；
4. 加载、空、错误、无权限状态；
5. 自动化测试；
6. `evidence/CORE-003/` 下的截图、trace、测试输出和验收表；
7. Git 提交；
8. 项目状态更新。

## 数据与权限检查

- 所有数据访问必须经过 TenantContext；
- 接口必须校验角色、数据范围和动作权限；
- 关键写操作记录 audit log；
- 外部输入做 Schema 校验；
- 敏感字段按角色脱敏；
- 事件包含 correlation_id 和 trace_id。

## UI/交互要求

- 使用统一设计令牌和共享组件；
- 不在页面内硬编码租户品牌；
- 支持 1440px PC 或 390px 移动主视口（按任务端）；
- 关键动作有明确成功/失败反馈；
- 表单错误可定位；
- 返回后保留必要上下文；
- 完成 loading / empty / error / forbidden 状态。

## API与状态

- 使用 `/api/v1`；
- 创建型接口支持 Idempotency-Key；
- 并发更新使用 version/乐观锁；
- 状态变更必须走领域服务或状态机；
- 禁止前端直接决定权限和最终业务状态。

## 验收标准

- 权限变更可追溯。
- 任务目标能够通过真实数据和操作验证；
- 所有适用质量闸门通过；
- 无高危安全问题；
- evidence 完整；
- 工作区干净；
- 状态文件与 Git 提交一致。

## 最低测试集

- 正常路径；
- 校验失败；
- 未登录；
- 无权限；
- 跨租户拒绝；
- 重复提交/幂等；
- 并发或版本冲突（适用时）；
- 空数据；
- 外部服务失败（适用时）；
- 页面 E2E 与截图（页面任务）。

## 禁止标记 PASS 的情况

- 只完成页面样式；
- 使用假按钮、假接口或无持久化数据；
- 测试失败或未执行；
- 权限仅在前端隐藏；
- 缺少错误/无权限状态；
- 没有 evidence；
- 未提交 Git 或未更新状态。

## 分支与提交

- 分支：按 `07_CODEX_RULES/GIT_AND_STATE_PROTOCOL.md`
- 建议提交：`feat(core): CORE-003 角色权限管理服务`

## 完成报告格式

```text
TASK: CORE-003
RESULT: PASS / BLOCKED
BRANCH:
COMMIT:
TESTS:
EVIDENCE:
RISKS:
NEXT_TASK:
```
