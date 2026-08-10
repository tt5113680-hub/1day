# SYS-22 ONE-CODE consumer landing UX

## Result

`SYS_22_ONE_CODE_LANDING_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| Consumer `/c/one-code/[code]` | Resolves public ONE-CODE API and redirects to `targetPath` with source continuity |
| Platform onboarding delivery | Includes `landingPath: /c/one-code/{code}` + UI readout |
| Honesty | Missing/invalid states; copy states local delivery entry, not third-party platform |

## Evidence

- `tests/sys-22-one-code-landing.test.mjs` 1/1
- `tests/e2e/sys-22-one-code-landing.spec.ts` 2/2
- Screenshot: `evidence/SYS-22/one-code-landing.png`

## Honest remainder

Product-owner UI sign-off remains human. Customer merge/transfer UX and generic external-actions CRUD remain open FE islands. Free-form DAG deferred. Not claimed as full commercial.
