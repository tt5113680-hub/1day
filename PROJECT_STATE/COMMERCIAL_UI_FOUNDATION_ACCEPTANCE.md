# Commercial UI Foundation Acceptance

## Decision

- Result: `BATCH_1_PASS`
- Verified source commit: `1aecf81`
- Verified at: 2026-08-10 Asia/Shanghai
- Blocker: none

## Accepted product foundation

- Consumer is one high-fidelity responsive digital storefront across 390, 768, 1024 and 1440 pixel viewports. Mobile/tablet use the Mobile Shell and desktop uses the dedicated store navigation and two-column composition.
- Employee core work surfaces use the shared Mobile Shell, tokens, business components and canonical loading, empty, error, permission and session states.
- Management core operating surfaces use the shared Admin Shell and commercial component system with explicit tenant, organization and store context.
- Platform governance plus restricted Channel and Circle operating modes use the shared Admin Shell with distinct product identities, role context and scoped navigation.
- E/M/P page-level hard-coded colors were removed in favor of the canonical token contract. Legacy UI is migrated or recorded in `UI_DEPRECATION_LIST.md`.
- Existing session, tenant isolation, RBAC, audit, Outbox and business-write boundaries remain intact.

## Full acceptance gates

| Gate                                                     | Result                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `pnpm.cmd format:check`                                  | PASS                                                        |
| `pnpm.cmd lint`                                          | PASS                                                        |
| `pnpm.cmd typecheck`                                     | PASS, 18/18 workspaces                                      |
| `pnpm.cmd build`                                         | PASS, 18/18 workspaces                                      |
| `pnpm.cmd test`                                          | PASS, 184/184 repository tests and 18/18 package test tasks |
| `pnpm.cmd evidence:check`                                | PASS, 74/74 evidence checks                                 |
| H-002 session and tenant/RBAC isolation                  | PASS, 6/6 on isolated ports 3270-3274                       |
| Consumer -> Employee -> Management real commercial chain | PASS, 2/2                                                   |
| Platform tenant/channel/circle plus restricted modes     | PASS, 14/14                                                 |
| Four-terminal visual foundation                          | PASS, 3/3 suites                                            |

The H-002 isolated configuration was used because the approved local preview processes already occupied ports 3171-3174; those user processes were not stopped or modified.

## Visual evidence

- Consumer: `evidence/COMMERCIAL-UI-FOUNDATION/consumer-phone-390-v2.png`, `consumer-tablet-768-v2.png`, `consumer-desktop-1024-v2.png`, `consumer-desktop-1440-v2.png`
- Employee: `evidence/COMMERCIAL-UI-FOUNDATION/employee-phone-390.png`
- Management: `evidence/COMMERCIAL-UI-FOUNDATION/management-desktop-1440.png`
- Platform: `evidence/COMMERCIAL-UI-FOUNDATION/platform-desktop-1440.png`
- Restricted operating modes: refreshed evidence under `evidence/CHANNEL-001/`, `evidence/CHANNEL-002/`, `evidence/CIRCLE-001/` and `evidence/CIRCLE-002/`

## Frozen boundary carried into Batch 2

Consumer template-local colors and content are intentionally retained as storefront business configuration. Binding industry templates to Storefront Draft/Preview/Publish/Rollback, commercial defaults, member setup and ONE-CODE belongs to Batch 2 and is not an unverified Batch 1 claim.
