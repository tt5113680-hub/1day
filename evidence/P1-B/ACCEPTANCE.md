# P1-B acceptance — promotion-grade session login

- Gate: Phase-1 P1-B visual/IA floor (shared login, not page patches)
- Playwright: `pnpm exec playwright test --config playwright.p1-b-session-login.config.ts`
- Screenshots: `login-employee-390.png`, `login-management-390.png`, `login-platform-390.png`

## Verified

- Labeled tenant/email/password fields on Employee, Management, Platform login
- Successful login reaches workbench/dashboard shells
- Error state uses AppStatePanel on failed credentials (component-level)

## Honest boundary

Not pixel parity with一线大厂. Consumer public entry unchanged.
