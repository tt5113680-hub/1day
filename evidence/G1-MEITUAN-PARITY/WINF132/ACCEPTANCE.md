# G1-W∞-132 ACCEPTANCE — CRM retention depth + dormant wake

- task: `G1-R-CRM-RETENTION-DEPTH`
- date: 2026-08-16 Asia/Shanghai
- branch: `hardening/COMMERCIAL-COMPLETION`
- status: **PASS**

## Scope

§2 CRM densify after §5 close-out:

1. `GET /api/v1/management/customers/retention-depth` — cohort + repurchase cycle + dormant wake queue + RFM summary (real local archives; no GMV / no payment).
2. `POST /api/v1/management/customers/dormant-queue/wake` — tag eligible 需唤醒/沉睡 customers with `沉睡唤醒` + audit/outbox (Idempotency-Key).
3. Management `/m/customers` panels: retention-depth + dormant-queue wake actions.

## Evidence

| Gate | Result |
| ---- | ------ |
| `node --test tests/g1-winf132-crm-retention-depth.test.mjs` | **2/2 PASS** |
| `pnpm --filter @oneday/api typecheck` | PASS |
| `pnpm --filter @oneday/management-web typecheck` | PASS |
| `pnpm build` | **20/20** |
| `pnpm test:unit` | **12 files / 49 tests PASS** |

## Honest boundaries

- Cohort / repurchase / wake queue derived from local interaction + RFM only.
- No payment amounts, no third-party conversion claims, no native checkout revival.
- Phase4 connectors not started.

## Owner reopen note

2026-08-16 owner「该放开的都放开，加速施工」cleared COST STOP and authorized W∞-132+.
