# SYS-8 Cross-device Member resume

## Result

`SYS_8_MEMBER_RESUME_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. No SMS OTP this phase.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `POST /api/v1/consumer/memberships/resume` | Requires tenant slug, storeId, phone, 12-hex `memberCode`, `consent:true`, idempotency key |
| Resume semantics | Existing active enrollment only; issues new profile access; revokes prior active accesses for that customer |
| Idempotency | `membership_resume` key replay returns same payload |
| Denials | Missing consent / bad phone / non-hex code → 400; unknown phone/code → 404; old access wallet → 404 after resume |
| Consumer 「我的」 | Anonymous/forbidden shows resume form (phone + memberCode + consent) + enroll CTA; success writes session and proves membership |

## Evidence

- `tests/sys-8-member-resume.test.mjs` 1/1
- `tests/e2e/sys-8-member-resume.spec.ts` 1/1 (`playwright.sys-8-member-resume.config.ts`)
- Screenshots: `evidence/SYS-8/member-resume-anonymous.png`, `evidence/SYS-8/member-resume-ready.png`
- `evidence/SYS-8/`

## Honest remainder

SMS OTP / real multi-factor identity, product-owner UI sign-off, and Tencent Cloud remain out of auto scope. Not claimed as full commercial.
