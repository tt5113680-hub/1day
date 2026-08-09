# HARDENING-006 deployment Docker build repair

## Scope

Repair the Docker workspace build ordering that prevented a clean `human-pilot` image from compiling the API and Worker.

## Change

`infra/docker/Dockerfile` now uses a `workspace-dependencies` stage to build `@oneday/auth`, `@oneday/events`, `@oneday/database`, `@oneday/session-client`, and `@oneday/ui` before the `api`, `worker`, and `human-pilot` targets compile their dependants.

## Verification

- `git diff --check` passed.
- `pnpm.cmd lint` passed.
- `pnpm.cmd typecheck` passed: 18 packages.
- Clean Tencent Cloud build passed for image `oneday-v3-preview:b3af8e3` (`sha256:87393b77fc5d90fd4bd5effdbf5d69caff19febf890f0b3531fb57c5f6089609`).
- Database migrations `001` through `047` passed against the isolated preview PostgreSQL database.
- API health passed through both the local Nginx proxy and the public IP: `200 {"status":"ok","service":"oneday-api","database":"ready"}`.
- The public Consumer home returned `200 text/html; charset=utf-8` at `http://49.232.124.130:18080/`.

## Result

PASS. No demo data or customer credentials were published.
