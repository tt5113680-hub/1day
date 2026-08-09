# HARDENING-006 deployment Docker build repair

## Scope

Repair the Docker workspace build ordering that prevented a clean `human-pilot` image from compiling the API and Worker.

## Change

`infra/docker/Dockerfile` now uses a `workspace-dependencies` stage to build `@oneday/auth` and `@oneday/events` before the `api`, `worker`, and `human-pilot` targets compile their dependants.

## Verification

- `git diff --check` passed.
- `pnpm.cmd lint` passed.
- `pnpm.cmd typecheck` passed: 18 packages.
- `docker build --target human-pilot -t oneday-v3-build-verify:hardening-006 -f infra/docker/Dockerfile .` completed and produced image `sha256:f32a96498ff69adc130cfbc195b5e6031bd7e2a7930510d0ede16b43bb7080b4`.
- `docker run --rm --entrypoint sh oneday-v3-build-verify:hardening-006` verified the built Auth, Events, API, Worker and Consumer artifacts.

## Result

PASS. The image is ready for the separate Tencent Cloud preview deployment steps; no demo data or customer credentials were published.
