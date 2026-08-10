# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI ? `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: human test / review only; do not write in parallel with Headless.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task ? Phase-1 commercial closed loop

- branch: `hardening/COMMERCIAL-COMPLETION`
- last_verified: P1-B employee-shell slice PASS (shared @oneday/ui EmployeeWorkNav token-driven work chrome; per-page employee nav hex retired)
- status: P1-A/P1-B continue via **local unattended** Headless turns
- blocker: null (P1-C waits on G lift + cloud inventory)
- progress: P0 26/26; membership closed-loop landed; P1-B ui-kit Table/Modal landed; P1-B consumer-shell shared nav landed; P1-B employee-shell shared work-nav landed; remaining P1-B management/platform shell polish + sync-converge + content-chain
- push_pending: local commit `8578302` (P1-B employee-shell) is verified but **not yet pushed** — GitHub network unreachable (port 443 TcpTest False) during this turn on 2026-08-10. Next turn SHOULD run `git push origin HEAD` once connectivity returns. Untracked/uncommitted local infra: `scripts/local-unattended-construction.ps1` (modified) + `scripts/configure-unattended-power.ps1` (new) — left outside this slice (authorization: not force-push, no main rewrite).

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
