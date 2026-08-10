# COMMERCIAL FIXTURES — unified 1–3 tenant generator

## Purpose

Generate **1–3 real READY tenants** (Platform onboarding) with industry products, platform offers, content placements, and local storefront materials for local/test verification.

This is **LOCAL TEST ONLY**. It does not claim live third-party inventory/price, public HTTPS, Tencent Cloud, or 全部商用.

## Command

```bash
# Against local HUMAN-PILOT (default ports 3200/3201)
pnpm fixtures:generate -- --count=3

# Explicit options
node scripts/generate-commercial-fixtures.mjs --count=2 --api=http://127.0.0.1:3200 --consumer=http://127.0.0.1:3201 --databaseUrl=postgresql://oneday:oneday_local_only@127.0.0.1:5434/oneday_human_pilot
```

Defaults assume HUMAN-PILOT platform identity `pilot.platform@oneday.local` / system tenant. For `oneday_v3_test` use `--systemEmail=admin@system.local --systemPassword=ChangeMe123!`.

## What each tenant receives

| Layer                                                 | Source of truth                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| Tenant / store / roles / published storefront modules | Platform onboarding READY run                                        |
| External links (Meituan / Douyin / partner HTTPS)     | Management external-links API                                        |
| Products (services) + platform offers                 | Management catalog API                                               |
| Stories / materials metadata                          | Management content create → approve → place                          |
| Store cover image path                                | Local SQL set to `/fixtures/stores/*` (Management API is HTTPS-only) |
| PNG materials                                         | `apps/consumer-web/public/fixtures/{stores,materials}/`              |

Industries for count 1–3: `restaurant`, `beauty`, `education`.

## Evidence

- Manifest: `evidence/COMMERCIAL-FIXTURES/latest-manifest.json`
- Contract test: `tests/commercial-fixture-generator.test.mjs`

## Docker note

After generating new fixture PNGs, rebuild Consumer so the image includes `public/fixtures`:

```powershell
$env:AUTH_TOKEN_SECRET='local-human-pilot-auth-secret-2026-08-08-only'
docker compose -f infra/docker/human-pilot.compose.yaml up --build -d consumer
```
