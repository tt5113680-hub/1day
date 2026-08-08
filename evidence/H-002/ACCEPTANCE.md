# H-002 acceptance

## Scope and boundary

- Consumer routes remain public and anonymous. No consumer email/password, phone, SMS, WeChat, or other new identity mechanism is introduced.
- Authenticated browser journeys cover the employee, tenant-owner/management, and platform terminals. Channel and business-circle operators use distinct test accounts in the platform tenant.
- `tests/fixtures/commercial-simulation.mjs` is an E2E-only, test-database-only fixture. It creates the fictional “瑞幸咖啡 · ONEDAY测试模拟租户” and “ONEDAY测试餐饮B公司” data, then removes it after the suite. It is not a production seed or a demo/customer data source.

## Acceptance result

| Journey / control                                                                                                                           | Result | Evidence                |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| PostgreSQL simulation graph: 3 stores, 5 employees, customers, tasks/reminders, evidence, share code, AI, audit, Outbox, channel and circle | PASS   | H-002 Playwright test 1 |
| Employee: browser login → workbench → forced access expiry → refresh → logout → old token rejected                                          | PASS   | H-002 Playwright test 2 |
| Tenant owner: browser login → management dashboard → forced access expiry → refresh → logout → old token rejected                           | PASS   | H-002 Playwright test 3 |
| Platform administrator: browser login → dashboard → forced access expiry → refresh → logout → old token rejected                            | PASS   | H-002 Playwright test 4 |
| Consumer: public merchant entry stays outside a backend login wall                                                                          | PASS   | H-002 Playwright test 5 |
| Channel/circle credentials, low-privilege denial, cross-tenant context denial, refresh rotation                                             | PASS   | H-002 Playwright test 6 |

## Commands passed

- `pnpm exec playwright test --config playwright.h-002.config.ts` — 6 passed.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test`, `pnpm build`.
- `pnpm db:migrate`, `pnpm db:seed`, `pnpm evidence:check`, `git diff --check`.

The fixture deliberately supplies reusable test data only. The consumer-action-to-customer/task operating orchestration is not claimed by H-002 and remains subject to its separately scoped hardening acceptance.
