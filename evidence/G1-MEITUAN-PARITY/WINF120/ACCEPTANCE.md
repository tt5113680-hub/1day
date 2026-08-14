# G1-W∞-120 ACCEPTANCE — Outbox 重放 + 告警（W∞-SAAS-OUTBOX）

- recorded_at: 2026-08-14 Asia/Shanghai
- task: `G1-R-SAAS-OUTBOX` / W∞-120
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase3（§6 Outbox 死信一键重放 + 可观测告警字段）
- executor: **IDE 本地收口**（DeepSeek 无人值守 3× TIMEOUT；根因 migration 073 缺 `outbox_event_id` UNIQUE → `ON CONFLICT` 500）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单

## Delivered

平台 Outbox 死信从「逐条重放 + 只读列表」推进到 **告警台账 + 健康观测 + 一键重放全部**，全部由真实 `outbox_events` / `outbox_dlq_alerts` 行现场推导。

### 1. 迁移 `073_outbox_alert_fields` + 修复 `074_outbox_dlq_alerts_event_unique`
- 表 `outbox_dlq_alerts`：平台运维对 `needs_attention` 死信的持久告警台账（alert_level/age_minutes/alert_count/first_seen/last_seen/replayed_at）
- **`outbox_event_id` UNIQUE 索引**（074 修复已 apply 073 的非唯一索引，使 `ON CONFLICT` 可用）

### 2. API `PlatformOutboxController` / `PlatformOutboxService`
- `GET /api/v1/platform/outbox/health` — DLQ 深度、告警等级分布、最老死信年龄、critical 计数（platform.read）
- `GET /api/v1/platform/outbox/dead-letters` — 死信列表 + 告警字段 join
- `POST /api/v1/platform/outbox/replay-all` — 一键重放全部 needs_attention → pending，清 alert 台账，写 audit + outbox（platform.manage）
- `POST /api/v1/platform/outbox/:tenantId/:eventId/replay` — 逐条重放
- 从 `SyncGatewayController` 迁出旧 outbox 端点，避免重复路由

### 3. `/p/outbox` 平台页
- 「Outbox 告警字段」面板 + 「告警等级分布」+ 「一键重放全部」确认流
- 保留 W56 深页分布面板与诚实底注（仅恢复本地投递状态、不调用美团/抖音、非本平台下单）

## Evidence commands

- `node --test tests/g1-winf120-platform-outbox-replay-alert.test.mjs` → **5/5**
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **435/435**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49
- `pnpm db:migrate`（DATABASE_URL=oneday_v3_test）apply **073** + **074**

## Honest boundaries

Outbox 是平台/租户内投递队列；重放只恢复本地投递状态，不调用外部平台、不代表第三方成交、不含支付、非本平台下单、无 GMV。
