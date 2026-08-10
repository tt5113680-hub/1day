# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI ? `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: human test / review only; do not write in parallel with Headless.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task ? Phase-1 commercial closed loop

- branch: `hardening/COMMERCIAL-COMPLETION`
- last_verified: P1-B platform-shell slice PASS (last raw hex in the Platform product shell chrome retired; Platform admin/prod shell fully token-driven)
- status: P1-A/P1-B continue via **local unattended** Headless turns
- blocker: null (P1-C waits on G lift + cloud inventory)
- progress: P0 26/26; membership closed-loop landed; P1-B ui-kit Table/Modal landed; P1-B consumer-shell shared nav landed; P1-B employee-shell shared work-nav landed; P1-B management-shell shared admin-shell chrome landed; P1-B **platform-shell** shared token-driven polish landed; remaining P1-B sync-converge + content-chain
- push_pending: none — prior local commits `8578302` + `4b16124` pushed to origin (`d802d25..4b16124`) once connectivity returned (port 443 reachable). This turn's P1-B management-shell evidence/state commits will be pushed in the same turn. Untracked/uncommitted local infra: `scripts/local-unattended-construction.ps1` (modified) + `scripts/configure-unattended-power.ps1` (new) — left outside slice (authorization: not force-push, no main rewrite).

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
