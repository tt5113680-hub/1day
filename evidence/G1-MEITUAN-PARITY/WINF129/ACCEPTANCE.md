# G1-W∞-129 ACCEPTANCE — Worker/Outbox health READY 断言（§5 续刀）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-READY-WORKER-OUTBOX-HEALTH` / W∞-129
- plan: `TENANT_ONE_CLICK_PROVISIONING_SPEC.md` §7 + `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §5
- executor: IDE Agent（本机）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；不复活 consumer_orders；不宣称全部商用

## Delivered

READY 机器验收补齐 Worker/Outbox 断言：

1. migration `077_worker_heartbeats` — Worker tick 写入 `oneday-worker` 心跳
2. `apps/worker` 每次 dispatch 后 `persistHeartbeat`
3. `PlatformOnboardingService.verify` 新增 `worker_health_recent`；强化 `outbox_clear`（按 **商户 tenant + Run correlationId** 检查 last_error / needs_attention / 凝固 pending≥15m，不扫平台历史队列）
4. 测试钩子：无新鲜心跳时在事务外 seed（避免商业 TX rollback 抹掉）
5. `/p/tenants/new` 展示 verification 清单（含 Outbox/Worker）

## Evidence

- `node --test tests/g1-winf129-worker-outbox-health.test.mjs` → **2/2**
- page-p-003 + winf125..128 回归 → **10/10**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49
- `pnpm db:migrate`（test）apply `077_worker_heartbeats`

## Out of scope（后续切片）

- Circle 双审批可见性（基础 READY 不阻塞）
- 读模型/缓存版本全断言
- 清理历史测试库永久 pending（不在本刀范围；断言已按 Run 作用域）

## Honest boundaries

心跳与 Outbox 断言仅为本地开通交付健康；不调用美团/抖音；不含支付/GMV/本平台下单。
