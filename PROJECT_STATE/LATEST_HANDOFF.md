# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI ? `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: human test / review only; do not write in parallel with Headless.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task ? Phase-1 commercial closed loop

- branch: `hardening/COMMERCIAL-COMPLETION`
- last_verified: P1-B sync-converge + content-chain PASS (content approve emits `content.published.v1`; Management content page converges via the `content` sync topic; per-item honest convergence line; page-builder surfaces published_at publish effectiveness)
- status: P1-A/P1-B continue via **local unattended** Headless turns; four P1-B shells + ui-kit + sync-converge + content-chain all PASS; remaining P1-B is essentially complete -> next P1-C bundle review + G1 packaging
- blocker: null (P1-C live waits on G lift + cloud inventory)
- progress: P0 26/26; membership closed-loop landed; ui-kit Table/Modal; consumer/employee/management/platform shells token-driven; **sync-converge + content-chain PASS** (see `evidence/P1-B-SYNC-CONVERGE/ACCEPTANCE.md`)
- push_pending: local P1-B sync-converge commit ahead of origin; prior local infra (scripts/) left outside slice. Push `origin/hardening/COMMERCIAL-COMPLETION` when connectivity returns.

### Owner ? one-time only

1. Copy `.env.local-unattended.example` ? `.env.local-unattended`, set `CURSOR_API_KEY`
2. `pnpm unattended:install` (or `pnpm unattended:daemon` for hidden loop)
3. Power: never sleep on AC
4. **Do not** open IDE Agent for construction while task/daemon runs
5. Appear only at **G1** (full local test) and **G2** (cloud after PASS)

### Headless turn prompt

`scripts/unattended-construction-prompt.md`

### New-window paste (IDE ? manual/debug only)

```text
?????? PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md ? ?????? Headless ??????? unattended ????
```
