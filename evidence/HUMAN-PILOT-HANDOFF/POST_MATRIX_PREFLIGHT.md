# HUMAN-PILOT-HANDOFF — post–SYS-11 local preflight refresh

- recorded_at: 2026-08-10 Asia/Shanghai
- branch: `hardening/COMMERCIAL-COMPLETION`
- head_at_preflight: see commit that includes this evidence
- database: `oneday_human_pilot`
- migration: through `054_channel_permissions` (053→054 applied this refresh)
- containers: rebuilt human-pilot stack on ports 3200–3205
- seed fix: `PILOT-CONSULT` now linked via `store_external_actions` on all three Luckin pilot stores (restores floating 「到店咨询（本地模拟）」)
- business claim: **LOCAL TEST ONLY**. Not public HTTPS, not Tencent Cloud, not 全部商用, not product-owner visual PASS.

## Engineering checks

| Check                               | Result                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| API health                          | PASS — `{"status":"ok","database":"ready"}` on `:3200/api/v1/health`             |
| Worker health                       | PASS — `:3205/health` HTTP 200                                                   |
| Four terminals                      | PASS — Consumer/Employee/Management/Platform HTTP 200                            |
| Migration                           | PASS — latest `054_channel_permissions`                                          |
| Storefront binding                  | PASS — three Luckin pilot stores + restaurant modules                            |
| Consult CTA                         | PASS — `PILOT-CONSULT` bound on stores 021/022/023                               |
| Pilot seed                          | PASS — `scripts/local-human-pilot-seed.mjs`                                      |
| Playwright commercial-ui-alignment  | PASS — 2/2                                                                       |
| Playwright consumer-commercial-home | PASS — 2/2                                                                       |

## Product-owner gate (human)

Open and sign `PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md`. Engineering cannot mark that document PASS.

Primary visual URL:

`http://127.0.0.1:3201/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot`

Runbook: `PROJECT_STATE/LOCAL_HUMAN_PILOT_RUNBOOK.md`  
Accounts: `PROJECT_STATE/LOCAL_HUMAN_PILOT_ACCOUNTS.md`

## Honest remainder

- Matrix P0 COVERED 26/26 remains an engineering fact only.
- Free-form drag graph editor remains multi-week; SYS-12 is condition branch preview only.
- Controlled pilot checklist `docs/PILOT_ACCEPTANCE_CHECKLIST.md` still requires a named operator for any non-local claim.
