# Local unattended deployment status (machine-local facts).

- deployed_at: 2026-08-10 Asia/Shanghai
- branch: `hardening/COMMERCIAL-COMPLETION`
- charter: `PROJECT_STATE/COMMERCIAL_EXECUTION_CHARTER.md`

## Status (2026-08-10)

**Plan B ACTIVE** — OpenCode + DeepSeek API (`UNATTENDED_EXECUTOR=opencode`)

Plan A (Cursor Headless) retired for Free tier instability. See `EXECUTOR_PLAN_B_API_AGENT.md`.

## Installed

| Item | Status |
| ---- | ------ |
| Windows task `ONEDAY-V3-Unattended-Construction` | every **10 minutes** |
| Chain mode | `UNATTENDED_CHAIN_MODE=1` in `.env.local-unattended` |
| Resolved BLOCKED archive | `evidence/historical/BLOCKED_REPORT_BATCH2_RESOLVED.md` |
| Progress board | `pnpm unattended:dashboard` |
| Verify script | `pnpm unattended:verify` |

## Owner action required (one-time)

**Authentication** — pick one:

1. Edit `D:\ONEDAY_V3\.env.local-unattended` → set real `CURSOR_API_KEY=...`  
   (from Cursor Settings → Account / API)

2. Or run once in terminal: `agent login` (browser login; no file edit)

Then verify:

```powershell
cd D:\ONEDAY_V3
pnpm unattended:verify
pnpm unattended:once -- -Force
pnpm unattended:dashboard
```

## After auth is green

- Task runs every 10 min automatically; no IDE windows needed
- Do **not** use Cursor Agent to write `ONEDAY_V3` in parallel
- You may use ChatGPT / Cursor on **other projects**
- Appear only at **G1 READY** (human test) and **G2** (cloud)

## Full auto (no Pro, no watching)

**You do not need to watch.** System runs 24h until G1 READY.

| Layer | Role |
| ----- | ---- |
| Scheduled task | Every **20 min** — start next turn if previous finished |
| Logon daemon | Hidden loop — same chain, survives reboot after login |
| Usage limit | Auto **6h backoff**, then retry until quota returns — **no click from you** |

**You appear only at G1 READY** (full local test). Until then: use PC for other work; do not IDE-write `ONEDAY_V3`.

Current blocker: **free Agent quota exhausted** — auto-resumes when Cursor resets quota (system retries every 6h).

Re-enable after any manual pause:

```powershell
pnpm unattended:resume
```

## Free tier (no Pro)

Cursor Agent has a **monthly free quota**. When exhausted, Headless turns stop with `USAGE_LIMIT` — **handled automatically**, not a manual task for you.

Optional glance (not required): `pnpm unattended:status`

Stretch quota in `.env.local-unattended`:

```
UNATTENDED_POLL_MINUTES=60
UNATTENDED_USAGE_LIMIT_WAIT_MIN=720
```

## Stop / pause

```powershell
schtasks /End /TN ONEDAY-V3-Unattended-Construction
schtasks /Delete /TN ONEDAY-V3-Unattended-Construction /F
```
