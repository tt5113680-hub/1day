# SYS-11 Platform provisioning failure trail

## Result

`SYS_11_PROVISIONING_FAILURE_TRAIL_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. Not mid-run resume.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| Onboarding create catch | Recoverable failures persist step trail + return run payload (conflicts still 409) |
| Platform `/p/tenants/new` | Honest step badges (失败/未执行/完成); error code/detail; refresh trail; fresh retry clears idempotency key |
| Honesty | Retry = new attempt with new key; no fake mid-run continue |

## Evidence

- `tests/sys-11-provisioning-failure-trail.test.mjs` 1/1
- `tests/e2e/sys-11-provisioning-failure-trail.spec.ts` 1/1
- Screenshot: `evidence/SYS-11/provisioning-failure-trail.png`

## Honest remainder

Product-owner UI sign-off remains human. Free-form graph editor multi-week. Not claimed as full commercial.
