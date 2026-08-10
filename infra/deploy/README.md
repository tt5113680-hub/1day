# Phase-1 public HTTPS pilot deploy templates (P1-C)

> **Authorization G still blocks actual public deploy.** These files are rehearsal-only scripts and templates. Do not commit secrets. Do not run against production until the owner explicitly lifts G and supplies cloud inventory (see `PROJECT_STATE/PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md` §2).

## Contents

| File                  | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `pilot.env.template`  | Required environment variables (no values)                           |
| `nginx.conf.template` | TLS-terminated reverse proxy for API + four webs                     |
| `pilot.compose.yaml`  | Reference Compose stack for CVM pilot (Postgres on-host or external) |
| `healthcheck.sh`      | Post-deploy smoke: API health + CORS preflight sanity                |

## Operator checklist before deploy

1. Owner reply: **「授权公网 HTTPS / 腾讯云试点」** + items 2–11 in `PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md`.
2. Copy `pilot.env.template` → local secret store; fill `DATABASE_URL`, `AUTH_TOKEN_SECRET` (≥32 chars), `CORS_ORIGINS`, `PUBLIC_BASE_URL`.
3. Replace `nginx.conf.template` placeholders: domain names, cert paths, upstream ports.
4. Run migrations on the pilot database only: `pnpm db:migrate`.
5. **Do not** enable repository seed passwords on the public internet.
6. Execute `healthcheck.sh` against the public API URL; record output under `evidence/P1-C/` when G is lifted.

## Rollback

1. Stop web/API/worker containers.
2. Restore previous binding version in reverse proxy (keep TLS certs).
3. If schema migration failed mid-flight, use forward-only repair per `docs/RELEASE_AND_RECOVERY.md`; never `git reset --hard` on operator data.

## Honest boundary

Templates prove deploy **readiness**, not external commercial acceptance. Product-owner UI sign-off (`PRODUCT_OWNER_UI_ACCEPTANCE.md`) remains human-only.
