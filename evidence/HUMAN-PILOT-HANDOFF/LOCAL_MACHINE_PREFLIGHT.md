# LOCAL HUMAN PILOT machine preflight

- Date: 2026-08-10 Asia/Shanghai
- Database: `oneday_human_pilot` (separate from `oneday_v3_test`)
- Migration: through `053_sync_gateway`
- Containers: rebuilt on 2026-08-10 against `hardening/COMMERCIAL-COMPLETION`
- Business-code scope this refresh: pilot seed storefront bindings + restaurant module catalog alignment; Playwright locator contracts updated for module-renderer DOM

| Check                               | Result                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| PostgreSQL / migration              | PASS — ledger includes 048–053; seed requires `053_sync_gateway`                       |
| Storefront bindings                 | PASS — three Luckin pilot stores have live `storefront_bindings` + restaurant modules  |
| API health                          | PASS — `200 { status: ok, database: ready }` on `3200`                                 |
| Worker health                       | PASS — Worker `ok` on `3205`                                                           |
| Four browser terminals              | PASS — Consumer `3201`, Employee `3202`, Management `3203`, Platform `3204` HTTP `200` |
| Playwright commercial-ui-alignment  | PASS — 2/2                                                                             |
| Playwright consumer-commercial-home | PASS — 2/2                                                                             |

This preflight does **not** replace the human PASS/FAIL entries in `PROJECT_STATE/LOCAL_HUMAN_PILOT_RUNBOOK.md` or `PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md`, and does not approve production, public HTTPS, external delivery, or customer onboarding.
