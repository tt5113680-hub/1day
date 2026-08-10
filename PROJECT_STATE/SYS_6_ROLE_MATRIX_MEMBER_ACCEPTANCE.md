# SYS-6 Role Matrix E2E — Member Consumer journey (slice 4)

## Result

`SYS_6_ROLE_MATRIX_MEMBER_PASS` (local engineering slice). Not full nine-role matrix. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| Session helper | `member-session.ts` shared read/write + wallet/profile fetch |
| Store 「我的」 | Anonymous denial (no PII) + CTA to enroll; ready state proves memberCode + masked phone + wallet balances + privacy link |
| Enroll continuity | Success note + deep link to 「我的」会员证明 |
| Wallet module | Reuses shared session helper (no dual session logic) |
| Denials | Missing/wrong access → 404; UI clears invalid session to forbidden/re-enroll |

## Evidence

- `tests/sys-6-role-matrix-member-consumer.test.mjs` 1/1
- `tests/e2e/sys-6-role-matrix-member-consumer.spec.ts` 1/1 (Playwright 390px)
- Screenshots: `evidence/SYS-6/member-profile-anonymous.png`, `evidence/SYS-6/member-profile-ready.png`
- `evidence/SYS-6/`

## Honest remainder

Cross-device Member resume landed as SYS-8 (phone + memberCode + consent; no SMS OTP). Dedicated `circle.read`/`provision.request` codes and visual workflow editors remain multi-week. Not claimed as full commercial.
