# SYS-1 Contract Unity

- recorded_at: 2026-08-10 Asia/Shanghai
- branch: `hardening/COMMERCIAL-COMPLETION`
- claim boundary: Local contract unity only. Not 全部商用. Not Tencent Cloud. Connectors are not outbound delivery.

## Contract

| Surface                                     | Truth                                                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Consumer `actions`                          | Store-scoped `store_external_actions` of type `consultation` / `platform_entry` only; consult CTA prefers `consultation`                     |
| Consumer `externalLinks` + `platformOffers` | Store-scoped platform hand-off cards (`link` / `platform_entry` + offers). Consultation is excluded from platform cards                      |
| `outboundPolicy`                            | `store_scoped_links_and_offers`                                                                                                              |
| Content for new seeds/fixtures              | `content_items` + `content_store_placements` only. Legacy `store_content_items` remains dual-read for old rows                               |
| Connectors                                  | Intent / authorization capability surfaces. They are **not** Consumer outbound HTTPS hand-off and must not be described as “已对接美团/抖音” |

## Evidence

- `tests/sys-1-2-contract.test.mjs`
- `tests/page-c-003-api.test.mjs` (store binding required for consult actions)
- `evidence/SYS-1/`
