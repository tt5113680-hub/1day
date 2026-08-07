# ONEDAY V3 commercial MVP final acceptance

**Result:** AUTOMATED PASS — ready for controlled pilot handoff.

## Scope accepted

All 69 indexed tasks are complete. The accepted MVP covers the consumer, employee, management, platform, channel, and fixed-business-circle operating loop with tenant isolation, server-side RBAC, persistent sessions, audit/outbox evidence, result evidence, controlled connector state, release readiness, and guarded recovery rehearsal.

## Final verification record

- Quality gates passed: `pnpm.cmd lint`, `pnpm.cmd format:check`, `pnpm.cmd typecheck` (17 packages), `pnpm.cmd test:unit`, `pnpm.cmd test`, `pnpm.cmd build`, `pnpm.cmd db:migrate`, `pnpm.cmd db:seed`, `pnpm.cmd evidence:check`, and `git diff --check`.
- Live HTTP readiness and connector recovery passed through `tests/hardening-003-reliability.test.mjs`: ready PostgreSQL returns 200/ready; an unavailable database returns 503/unavailable; the connector recovery flow retains idempotent audit/outbox evidence.
- Browser acceptance passed through `playwright.hardening-002.config.ts`: live consumer, employee, management, and channel terminals rendered against the built API and PostgreSQL.
- Fresh release rehearsal passed on `oneday_v3_test_final_release_retry_1786139833`: 41 migrations applied, foundation seed completed, migration `041_circle_merchant_management` rolled back, forward repair reapplied it, and seed completed again.
- Recovery clone rehearsal remains recorded under `evidence/HARDENING-004/ACCEPTANCE.md`; it only creates unused safe test databases and never overwrites or deletes a database.

## Final remediation included

The fresh-database rehearsal exposed that the foundation seed wrote two role-permission links before their referenced permission definitions. The seed now inserts all permission definitions before every role-permission relationship, with a regression contract in `tests/foundation-seed-contract.test.mjs`.

The four-terminal browser test also now targets the rendered consumer page rather than a transient loading placeholder, eliminating a strict-locator race while preserving the live browser acceptance flow.

## Handoff conditions

The automated repository acceptance is complete. Before enabling a real pilot, the operator must perform the documented human handoff: provision a unique pilot administrator credential, supply approved third-party accounts/authorization where needed, configure controlled secrets and allowed origins, and sign the checklist in `docs/PILOT_ACCEPTANCE_CHECKLIST.md`.

The known Next.js development-server cross-origin resource warnings occurred during Playwright dev-server startup; all browser flows passed. They are a non-production development observation and do not change the API CORS requirement in the deployment guide.
