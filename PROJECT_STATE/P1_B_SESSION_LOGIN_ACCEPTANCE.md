# P1-B Promotion-grade session login baseline

## Result

`P1_B_SESSION_LOGIN_PASS` (Phase-1 local slice). Not 全部商用. Not pixel parity.

## Delivered

| Surface                  | Change                                                                |
| ------------------------ | --------------------------------------------------------------------- |
| `@oneday/session-client` | `SessionLogin` uses `@oneday/ui` FormField/Input/Button/AppStatePanel |
| `@oneday/design-tokens`  | Login subtitle + submit spacing tokens                                |
| E/M/P login pages        | Shared labeled fields (no page-level CSS patches)                     |

## Evidence

- Playwright `playwright.p1-b-session-login.config.ts` 1/1
- Screenshots `evidence/P1-B/login-*-390.png`

## Honest remainder

- Consumer remains public (no login shell)
- Full design-system parity deferred (D4)
- Product-owner UI sign-off still human
