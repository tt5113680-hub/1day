# G1-W∞-128 ACCEPTANCE — mid-run resume（§5 续刀）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-READY-MID-RUN-RESUME` / W∞-128
- plan: `TENANT_ONE_CLICK_PROVISIONING_SPEC.md` 事务策略（foundation 提交 + 商业可恢复）+ `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §5
- executor: IDE Agent（本机）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；不复活 consumer_orders；不宣称全部商用

## Delivered

商业开通失败后可从失败步骤续跑，基础租户不回滚：

1. `PlatformOnboardingService` 拆为 `provisionFoundation`（租户/Owner/组织门店，独立提交）+ `provisionCommercial`（模板→发布→默认商业→渠道→一码→激活校验→READY）
2. 商业阶段失败 → `failed_recoverable`，`input.checkpoint` 保留资源 ID；foundation 步骤保持 succeeded
3. `POST /api/v1/platform/onboarding/:runId/resume` 重置商业步骤并重跑至 `ready` / `awaiting_activation`
4. 测试钩子 `testFailAtStep`（仅 `ONEDAY_PROVISIONING_TEST_HOOKS=1` 或 test DB）可注入商业失败
5. `/p/tenants/new` 在 `failed_recoverable` 展示「从失败步骤续跑」按钮（`data-testid=provisioning-resume`）

## Evidence

- `node --test tests/g1-winf128-mid-run-resume.test.mjs` → **2/2**
- `node --test` page-p-003 + winf125/126/127 → **8/8**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49

## Out of scope（后续切片）

- Worker health / Outbox 永久 pending 全断言（SPEC §7）
- Circle 双审批可见性（基础 READY 不阻塞）
- 进程崩溃时 `provisioning` 中途自动续跑（本刀覆盖 failed_recoverable 显式 resume）

## Honest boundaries

续跑仅为本地开通交付恢复；不含支付/GMV/本平台下单；不绕过 Owner 激活令牌路径。
