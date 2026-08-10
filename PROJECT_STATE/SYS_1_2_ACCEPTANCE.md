# SYS-1 + SYS-2 ACCEPTANCE

## Result

`SYS_1_PASS` + `SYS_2_PASS` (local engineering gates). Not 全部商用. Not Tencent Cloud. Product-owner UI sign-off remains unsigned.

## SYS-1 Contract Unity

| Deliverable                                                                         | Evidence                                                                           |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Consumer consult prefers store-scoped `consultation`                                | `apps/api/src/consumer-store.service.ts`; Consumer store/channel CTA               |
| Platform cards = store `externalLinks` (`link`/`platform_entry`) + `platformOffers` | `outboundPolicy: store_scoped_links_and_offers`                                    |
| New seeds/fixtures content via placements                                           | fixture generator unchanged (placements); human-pilot seed switched off dual-write |
| Connectors ≠ outbound                                                               | `PROJECT_STATE/SYS_1_CONTRACT_UNITY.md`                                            |

## SYS-2 Config Shell + Wallet

| Deliverable                                                              | Evidence                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------- |
| Onboarding emits `operating_channels` + `member_wallet` per industry     | `platform-onboarding.service.ts`                  |
| Consumer shell tabs from `operating_channels` (fallback five tabs)       | `resolve-consumer-tabs.ts` + store/channel shells |
| `member_wallet` renders wallet API when session access present           | `storefront-modules.tsx` MemberWallet             |
| Page Builder whitelist editors for channels / capabilities / wallet mode | `management-web/.../page-builder`                 |

## Verify

```text
pnpm --filter @oneday/api build
pnpm test:unit -- tests/resolve-consumer-tabs.vitest.ts
node --test --test-concurrency=1 tests/sys-1-2-contract.test.mjs tests/page-c-003-api.test.mjs tests/storefront-module-renderer.test.mjs
pnpm --filter @oneday/consumer-web typecheck
pnpm --filter @oneday/management-web typecheck
pnpm --filter @oneday/consumer-web build
pnpm --filter @oneday/management-web build
```

## Honest remainder

SYS-3 sync clients, SYS-4 ops verticals, SYS-5 shared UI kit/renderer package, SYS-6 role IA, and一线大厂 parity remain queued. Do not claim D4/D5.
