# OWNER_ALERT — Unattended construction

- auto_generated: true
- updated_at: 2026-08-13 13:04 Asia/Shanghai
- status: **RESOLVED**

## Incident (owner-discovered)

IDE left an infinite keeper lock after W111 → DeepSeek `SKIP: previous task still running (lock)` for ~3h → API balance flat. Owner noticed; agents did not.

## Fix

- Stale lock auto-clear (IDE ≥90m / daemon ≥200m / `expires=`)
- Health check uses correct `.construction.lock`; hourly task + auto-fix
- `scripts/unattended-ide-lock.ps1` TTL Acquire/Release
- Alerts rewrite this file when unhealthy

## Latest

healthy=true (re-check after false-positive skip-storm fix). W112 DeepSeek turn in progress.
