# LOCAL HUMAN PILOT machine preflight

- Date: 2026-08-10 Asia/Shanghai
- Database: `oneday_human_pilot` (separate from `oneday_v3_test`)
- Migration: through `054_channel_permissions`
- Containers: rebuilt on 2026-08-10 against `hardening/COMMERCIAL-COMPLETION`
- Seed: role_permissions re-seed after 054; `PILOT-CONSULT` store bindings restored

| Check                               | Result                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| PostgreSQL / migration              | PASS — ledger includes through `054_channel_permissions`                               |
| Storefront bindings                 | PASS — three Luckin pilot stores have live `storefront_bindings` + restaurant modules  |
| Consult CTA                         | PASS — floating 「到店咨询（本地模拟）」 restored via `store_external_actions`          |
| API health                          | PASS — `200 { status: ok, database: ready }` on `3200/api/v1/health`                   |
| Worker health                       | PASS — Worker `ok` on `3205`                                                           |
| Four browser terminals              | PASS — Consumer `3201`, Employee `3202`, Management `3203`, Platform `3204` HTTP `200` |
| Playwright commercial-ui-alignment  | PASS — 2/2                                                                             |
| Playwright consumer-commercial-home | PASS — 2/2                                                                             |

This preflight does **not** replace the human PASS/FAIL entries in `PROJECT_STATE/LOCAL_HUMAN_PILOT_RUNBOOK.md` or `PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md`, and does not approve production, public HTTPS, external delivery, or customer onboarding.
