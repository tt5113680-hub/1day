# HARDENING-006 deployment Docker build repair

## Scope

Repair the Docker workspace build ordering that prevented a clean `human-pilot` image from compiling the API and Worker.

## Change

`infra/docker/Dockerfile` now uses a `workspace-dependencies` stage to build `@oneday/auth`, `@oneday/events`, `@oneday/session-client`, and `@oneday/ui` before the `api`, `worker`, and `human-pilot` targets compile their dependants.

## Verification

- `git diff --check` passed.
- `pnpm.cmd lint` passed.
- `pnpm.cmd typecheck` passed: 18 packages.
- An initial local image artifact check completed, but the subsequent clean Tencent Cloud build revealed that `@oneday/session-client` and `@oneday/ui` also need to be compiled before the Employee, Management and Platform applications.
- Fresh clean-image verification is pending after adding these two packages.

## Result

IN PROGRESS. No demo data or customer credentials were published.
