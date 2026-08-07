# PAGE-M-006 acceptance

- Route: `/m/ai-suggestions` is backed by tenant-scoped persisted `ai_suggestions` records.
- Access: API requires an authenticated `tenant.manage` membership; missing authentication and cross-tenant context are rejected.
- Confirmation: accepting a pending suggestion uses optimistic versioning and records the selected model name/version, an audit entry, and a correlated Outbox event. It does not execute the suggested business action automatically.
- Feedback: feedback is stored through an inline, field-addressable form with server-side validation, versioning, audit, and Outbox records.

## Verification

- `pnpm.cmd --filter @oneday/management-web typecheck` PASS
- `pnpm.cmd --filter @oneday/api build` PASS
- `node --test tests/page-m-006-api.test.mjs` PASS
- `pnpm.cmd exec playwright test --config playwright.page-m-006.config.ts` PASS (2 tests)
- Screenshots: `management-ai-suggestions-desktop.png`, `management-ai-suggestions-forbidden.png`
- Traces: `playwright-output/**/trace.zip`
