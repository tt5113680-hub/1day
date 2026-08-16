# G1-W∞-135 ACCEPTANCE — 会员批量发放 + 入会月 cohort（§2 densify）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-MEMBER-BATCH-COHORT` / W∞-135
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2 会员「批量发放、cohort」
- executor: IDE Agent（接管 unattended 锁后施工）
- claim_boundary: 工程 PASS；非主人 UI 签验；无储值/支付/GMV

## Delivered

1. `GET /api/v1/management/memberships/cohort?months=3|6|12|24`
   - 入会月聚合：enrolled / stillValid / expired / active30d + disclaimer
2. `POST /api/v1/management/memberships/batch-grants`
   - 同权益批量发放（≤50）；幂等 `membership_batch_grant`；逐条 ledger + 批审计
3. `/m/memberships`：cohort 面板、勾选批量发放、选择权益

## Evidence

- `node --test tests/g1-winf135-membership-batch-cohort.test.mjs` → **2/2**
- `pnpm typecheck` → 20/20；`pnpm test:unit` → 49/49
- api + management-web build OK

## Honest boundaries

批量发放与 cohort 均为本地 membership / ledger 档案；不含储值、支付、GMV、第三方成交。
