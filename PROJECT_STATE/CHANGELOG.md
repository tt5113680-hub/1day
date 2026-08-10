# CHANGELOG

## 2026-08-10 - SYS-5 visual tokens + Consumer hex retirement PASS

- Added `@oneday/storefront-renderer/storefront.css` and `storefrontTokens` (`--od-sf-*` restaurant + industry accents).
- Consumer `store.module.css` now uses shared vars only (zero raw hex); store root applies `od-sf-theme`.
- Extracted shared chrome: `StorefrontSection`, `StorefrontEmpty`, `storefrontActionIcon`.
- Evidence: `PROJECT_STATE/SYS_5_ACCEPTANCE.md`, `evidence/SYS-5/`. Tests: `storefront-renderer.vitest` 7/7, `sys-5-storefront-renderer` 2/2. Full module paint extraction remains. Not 全部商用.

## 2026-08-10 - SYS-5 Shared UI kit + storefront-renderer scaffold PASS

- Added `@oneday/storefront-renderer` with shared module normalize/visibility/sort, render-plan builder, and `StorefrontModuleOutline`.
- Closed design-token hole `--od-brand-50`; `@oneday/ui` re-exports `designTokens` and adds FormField/Input/Select/Skeleton.
- Consumer store imports the shared module contract; Management Page Builder canvas imports the same outline renderer.
- Evidence: `PROJECT_STATE/SYS_5_ACCEPTANCE.md`, `evidence/SYS-5/`. Tests: `storefront-renderer.vitest`, `sys-5-storefront-renderer`. Visual hex retirement remains multi-week. Not 全部商用.

## 2026-08-10 - SYS-4 Platform Outbox DLQ/replay PASS

- Added Platform console `/p/outbox` to list `needs_attention` Outbox dead letters and replay via existing `platform/outbox` APIs (no second API).
- Shell nav includes「Outbox 死信」. Evidence: `PROJECT_STATE/SYS_4_ACCEPTANCE.md`, `evidence/SYS-4/`. Test: `sys-4-platform-outbox`. Not 全部商用.

## 2026-08-10 - SYS-3 FE Sync Clients PASS

- Added `@oneday/sync-client` with authenticated ETag poll (`TenantSyncClient`) and public storefront version poll (`StorefrontSyncClient`), plus React hooks.
- Wired Management dashboard and Employee workbench to quiet-reload on sync topics; Consumer store calls `router.refresh()` when publishedVersion/authEpoch changes.
- Evidence: `PROJECT_STATE/SYS_3_ACCEPTANCE.md`, `evidence/SYS-3/`. Tests: `sync-client.vitest`, `sys-3-sync-client`. Not 全部商用.

## 2026-08-10 - SYS-1 Contract Unity + SYS-2 Config Shell/Wallet PASS

- Consumer store `actions` are store-scoped consultation/platform_entry; platform cards use store links/offers with `outboundPolicy: store_scoped_links_and_offers`. Connectors documented as not outbound.
- Onboarding industry templates emit `operating_channels` + `member_wallet`; Consumer shell resolves tabs from published channels (five-tab fallback); wallet module reads membership wallet when session access exists.
- Management Page Builder adds whitelist editors for channels, quick-action capabilities, and wallet mode. Human-pilot seed content uses placements only.
- Evidence: `PROJECT_STATE/SYS_1_2_ACCEPTANCE.md`, `evidence/SYS-1/`, `evidence/SYS-2/`. Tests: `sys-1-2-contract`, `resolve-consumer-tabs.vitest`. Not 全部商用.

## 2026-08-10 - Commercial fixture generator PASS

- Added `scripts/generate-commercial-fixtures.mjs` to provision 1–3 READY tenants via Platform onboarding and enrich them with real Management products, platform offers, content placements, and local `/fixtures` materials.
- Industries: restaurant / beauty / education. Evidence under `evidence/COMMERCIAL-FIXTURES/`; contract test `tests/commercial-fixture-generator.test.mjs` 1/1.
- LOCAL TEST ONLY — not 全部商用. See `PROJECT_STATE/COMMERCIAL_FIXTURE_GENERATOR.md`.

## 2026-08-10 - HUMAN-PILOT sandbox refresh (post-matrix)

- Migrated local `oneday_human_pilot` through `053_sync_gateway` and rebuilt Docker human-pilot services on ports 3200–3205 against current HEAD.
- Pilot seed now publishes restaurant `storefront_bindings` with the eight module-renderer module types so Consumer no longer falls back to hero-only.
- Playwright `commercial-ui-alignment` 2/2 and `consumer-commercial-home` 2/2 PASS on the refreshed sandbox.
- Added `PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md` and `evidence/HUMAN-PILOT-HANDOFF/POST_MATRIX_PREFLIGHT.md`. Human UI sign-off and 全部商用 remain unclaimed.

## 2026-08-10 - Matrix gap Wave 4 PASS

- MG-G closes remaining P0 PARTIAL depth: M-02 Management→Consumer CRUD package, XT-02 share/sync/ETag tenant isolation, RC-01 live recovery clone with commercial object count report (content/membership/sync tables; terminate backends before template clone).
- P0 minimum set COVERED 26/26. Not a 全部商用 claim. See `MATRIX_GAP_WAVE_4_ACCEPTANCE.md` and `evidence/MATRIX-GAP-WAVE-4/`.

## 2026-08-10 - Matrix gap Wave 3 PASS

- MG-F closes remaining high-value PARTIAL P0: MB-01 enrollment/consent, SE-01 multi-device revoke, P-02 suspend session convergence, CT-01 no dual-write placements, M-01 store_manager API denials, WO-01 concurrent SKIP LOCKED consumption.
- P0 COVERED now 23/26 (~88%). Remaining PARTIAL: M-02, XT-02 depth, RC-01 rebuild. See `MATRIX_GAP_WAVE_3_ACCEPTANCE.md` and `evidence/MATRIX-GAP-WAVE-3/`.

## 2026-08-10 - Matrix gap Wave 2 PASS

- MG-E isolation contracts: XT-01 route inventory denies cross-tenant context/resources; MS-01 two-store service isolation; XL-01 rejects javascript/http external links; XT-02 light covers invalid preview and tenant/storeId swap without leak.
- See `MATRIX_GAP_WAVE_2_ACCEPTANCE.md` and `evidence/MATRIX-GAP-WAVE-2/`. Next: MG-F+ remaining PARTIAL P0.

## 2026-08-10 - Matrix gap Wave 1 PASS

- Added sync gateway: Worker projects outbox events into `sync_notifications`; API exposes ETag poll (`/api/v1/sync/changes`), SSE stream, and public storefront version poll; tenant suspend bumps `auth_epoch` and emits `tenant.lifecycle.changed.v1`.
- Outbox dead-letter (`needs_attention`) after max attempts with Platform list/replay; recovery clone verifies provisioning runs, storefront bindings, member ledger and outbox counts.
- Concurrent harness covers TP-02 slug conflict, SF-01 publish/read races and MB-02 single-success redeem. See `MATRIX_GAP_WAVE_1_ACCEPTANCE.md` and `evidence/MATRIX-GAP-WAVE-1/`.

## 2026-08-10 - Storefront module-renderer unification PASS

- Consumer store home now renders from published `storefront.modules` order and omits modules with `config.visible === false`.
- Removed transitional hard-coded Banner/shortcut arrays; `banner_carousel` and `quick_actions` use module config plus domain data.
- Management draft reorder/hide → publish is verified by API and Playwright DOM evidence. Fixed five-tab Consumer shell remains for the transition.
- See `STOREFRONT_MODULE_RENDERER_ACCEPTANCE.md` and `evidence/STOREFRONT-MODULE-RENDERER/`.

## 2026-08-10 - ONEDAY-V3-COMMERCIAL-COMPLETION Batch 4 PASS

- Clean-tenant commercial rehearsal provisions a brand-new tenant without shared H-002/commercial-simulation fixture repair and proves READY, ONE-CODE, published Storefront, Consumer enrollment, Employee redemption/follow-up, Management outcome, content placement, Platform channel/circle discovery, second-tenant isolation and suspend/resume recovery.
- Platform circle approval now converges `invitation_status='accepted'` and `circle_approval_status='approved'` so Consumer discovery projects approved clean-tenant memberships without seed repair.
- Full workspace quality gates, 189 repository tests, 74 evidence checks, Batch 4 API rehearsal 1/1 and Playwright browser evidence 1/1 passed. See `BATCH_4_ACCEPTANCE.md` and `evidence/BATCH-4/`.
- Authorized continuation: Storefront module-renderer unification (Consumer renders from `storefront.modules`; remove hard-coded Banner/shortcuts).

## 2026-08-10 - ONEDAY-V3-COMMERCIAL-COMPLETION Batch 3 PASS

- Tenant suspension now revokes active sessions and tenant status is enforced at login, refresh and token claims checks; recovery requires a fresh authenticated session.
- Management can approve and place the single content entity source directly into Consumer Storefronts, with real browser evidence.
- Approved Platform Channel/Circle relations now appear in the authorized member tenant's Consumer discovery and remain hidden from non-members.
- Full workspace quality gates, repository tests, H-002 session/isolation, Consumer-to-Employee-to-Management and Batch 3 browser evidence passed. See `BATCH_3_ACCEPTANCE.md`.

## 2026-08-10 - Batch 2 content placement truth source

- Replaced Consumer's legacy `store_content_items` read path with approved `content_items` projected through tenant/store placements, with migration backfill for existing content.
- Added a tenant-scoped Management placement command that accepts only approved content and active stores, retains audit/Outbox evidence and avoids a second editable content copy.

## 2026-08-10 - Batch 2 service/package/Offer operations

- Added tenant-scoped Management catalog operations for services/packages and truthful platform Offers, including idempotency, optimistic versions, audit/Outbox receipts and a strict enabled HTTPS action boundary.
- Added source-of-price and registered-update metadata, price validation and immediate Consumer removal when an Offer is disabled; Consumer renders the same persisted comparison data without a third-party synchronization claim.
- Real API acceptance passes 1/1; Management/Consumer browser acceptance passes 2/2 with desktop, mobile and Management-session-denial evidence.

## 2026-08-10 - Batch 2 Storefront Draft/Preview/Publish/Rollback

- Bound tenant-owned page-template versions to a store-level live/draft lifecycle with immutable publication history, optimistic locks and required-module validation.
- Added short-lived store/version-bound preview tokens; Management opens the actual Consumer Storefront renderer while public reads remain pinned to the live version.
- Upgraded the Management page builder to create and edit drafts, order or hide fixed modules, preview, publish and roll back. Real API and three-browser-state acceptance pass.

## 2026-08-10 - Batch 2 one-click commercial provisioning core

- Added durable, idempotent Provisioning Runs with eleven auditable steps and explicit ready/failure states instead of treating an active tenant row as commercial delivery.
- A successful run now creates an immediately usable owner session for Management and Employee, complete tenant/store/plan settings, a published tenant-owned industry Storefront binding, honest starter operating objects and a role-aware ONE-CODE delivery entry.
- Added machine READY assertions, public ONE-CODE resolution, binding-aware Consumer entry and a Platform run-result UI. Real API and browser acceptance pass.

## 2026-08-10 - ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 PASS

- Accepted the unified Consumer, Employee, Management, Platform, Channel and Circle commercial UI foundation at source commit `1aecf81`.
- Full format, lint, 18-workspace typecheck/build, 184 repository tests, 74 evidence checks, H-002 6/6, real commercial chain 2/2, platform governance chain 14/14 and four-terminal visual suite 3/3 pass.
- Recorded the explicit Batch 2 boundary for Storefront template binding and continued automatically into one-click commercial tenant provisioning.

## 2026-08-10 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 Channel/Circle Admin modes

- Added distinct restricted Admin Shell modes for Platform, Channel and Circle, each with explicit role context and navigation instead of exposing the platform-global menu to every route.
- Migrated Channel dashboard/onboarding and Circle dashboard/member governance to shared Admin primitives, commercial Chinese operating copy and the canonical token contract; removed remaining hard-coded E/M/P page colors.
- UI/Employee/Management/Platform typechecks, workspace lint, all three affected production builds and the four real Channel/Circle browser suites (8/8) pass with refreshed desktop, denial and trace evidence.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 Consumer responsive foundation

- Completed one responsive Consumer product shell across 390/768/1024/1440 widths: mobile/tablet retain the bottom navigation, PC uses a tokenized sticky store navigation and a balanced two-column digital-store composition.
- Migrated Consumer store, service, action, process, discovery, entry and profile loading/error/permission surfaces to shared AppStatePanel/Button primitives without changing public tenant/source/store/scene continuity or business behavior.
- Format, workspace lint, Design Tokens/UI/Consumer typecheck/build and the real four-terminal visual suite (3/3) pass. Consumer deep links, viewport overflow and responsive navigation visibility are asserted, with refreshed evidence under `evidence/COMMERCIAL-UI-FOUNDATION/`.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management customer analytics foundation

- Migrated Management customer-chain risk/context panels, auditable timeline and confirmed/inferred funnel stages to shared AdminPageHeader/Card/Button/StatusBadge/AppStatePanel primitives and the canonical token contract.
- Replaced internal identity/source/risk values with operator language while preserving tenant-scoped aggregation, evidence links and explicit inferred-data boundaries.
- Format, workspace lint, UI/Management typecheck/build and real 1440px customer-chain/funnel/session browser suites (4/4) pass with refreshed visual and trace evidence. Management core-page foundation migration is complete; Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 employee customer-workflow foundation

- Migrated Employee related-customer context and task follow-up entry to shared Button/StatusBadge/AppStatePanel primitives, commercial source/identity labels and tokenized mobile form controls.
- Preserved server-side customer visibility and task assignment, and corrected migrated browser fixtures to persist the actual login `expiresAt` field so deep-link navigation does not depend on a refresh-token race.
- Format, workspace lint, UI/Employee typecheck/build and real customer/task-link plus follow-up/session browser suites (4/4) pass with refreshed visual and trace evidence. Employee core-page foundation migration is complete; Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 employee share-tools foundation

- Migrated Employee tracked share-code creation, QR presentation, expiry, selection, revocation and recovery states to shared Card/Button/StatusBadge/AppStatePanel primitives and the canonical token contract.
- Preserved real QR generation, attribution/open counts, versioned revocation and inactive-code service rejection; mobile evidence avoids fixed-navigation full-page stitching artifacts.
- Format, workspace lint, UI/Employee typecheck/build and real 390px create/QR/revoke/session browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 employee profile foundation

- Migrated Employee identity, organization/store context, permission summary, notification preference and common tools to shared Card/Button/StatusBadge/AppStatePanel primitives and the canonical token contract.
- Replaced persisted permission codes with operator-facing capability names while preserving the versioned own-profile notification write.
- Format, workspace lint, UI/Employee typecheck/build and real 390px notification-setting/session browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 employee nurture foundation

- Migrated Employee customer-segment queue, touchpoint logging, follow-up task creation and recovery states to shared Card/Button/StatusBadge/AppStatePanel primitives and the canonical token contract.
- Preserved tenant-scoped profile versioning and idempotent touchpoint/task writes; the 390px acceptance now targets the shared Card surface and waits for ready content.
- Format, workspace lint, UI/Employee typecheck/build and real retier/touch/task/session browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 employee notifications foundation

- Migrated Employee notification summary, filters, safe task links, mark-read action and recovery states to shared Card/Button/StatusBadge/AppStatePanel primitives and the canonical token contract.
- Preserved tenant-scoped visibility, optimistic version and idempotent read boundaries; the 390px visual fixture now waits for the ready state before capture.
- Format, workspace lint, UI/Employee typecheck/build and real read/deep-link/session browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 employee lead-pool foundation

- Migrated Employee lead filtering, priority/status cards, claim/allocation/conversion actions and recovery states to shared Card/Button/StatusBadge/AppStatePanel primitives and the canonical token contract.
- Preserved tenant-scoped assignment, optimistic version and idempotent action boundaries; the 390px acceptance now targets the shared Card surface.
- Format, workspace lint, UI/Employee typecheck/build and real claim/allocation/conversion/session browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management permission-audit foundation

- Migrated Management permission audit summary, risk filters, audit records and expandable correlation/trace evidence to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved tenant-scoped audit retrieval and raw evidence visibility only behind explicit expansion; risk and persisted audit kinds use operator-facing language.
- Format, workspace lint, UI/Management typecheck/build and real 1440px filter/evidence/session browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management connector foundation

- Migrated Management tenant connector authorization intent, secret fingerprint, capability boundary and recent logs to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved secret non-disclosure and intent-only/no-external-delivery behavior while converting known connector, status, capability and authorization-log values to operator language.
- Format, workspace lint, UI/Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management settings foundation

- Migrated Management reminder/escalation, approval, quiet-hours, tagging, allocation and brand rules to the shared Admin Shell foundation and canonical commercial token contract.
- Retained accessible fieldset grouping and preserved the real permission, optimistic-version, idempotency, audit and event save boundary.
- Format, workspace lint, Management typecheck/build and real 1440px persisted-save browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management permission foundation

- Migrated Management role templates, member impact, permission selection, high-risk confirmation and change-reason controls to shared Admin Shell primitives and the canonical commercial token contract.
- Mapped all persisted permission codes to operator-facing capability names while preserving service-side version locking, explicit confirmation and audit behavior.
- Format, workspace lint, Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management organization foundation

- Migrated Management organization tree, employee invitation, employment status and offboarding handoff risk to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved tenant-scoped invitation/offboarding behavior while converting organization/status values to commercial labels and adding separate visual evidence for the below-fold employee handoff surface.
- Format, workspace lint, UI/Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management template foundation

- Migrated Management tenant template catalog, fixed-module preview and controlled version publish to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved existing version publication while converting target/module/status enums to commercial labels and explicitly stating that Consumer Storefront binding remains Batch 2 scope.
- Format, workspace lint, Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management content foundation

- Migrated Management content draft creation, approval state and channel-registration summary to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved persisted draft creation and the intent-only distribution boundary while converting content kinds, statuses and known channels to commercial labels.
- Format, workspace lint, UI/Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management workflow foundation

- Migrated Management workflow metrics, pending approvals, template state and instance responsibility table to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved the real workflow aggregation/filter behavior while converting lifecycle and step enums to commercial labels and rendering timestamps consistently in Chinese 24-hour format.
- Format, workspace lint, UI/Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management AI foundation

- Migrated Management governed AI suggestions, model/source context, execution state and feedback controls to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved whitelisted tenant-local execution/manual-required behavior and feedback writes while removing internal status/action enums and task receipt UUIDs from the operating presentation.
- Format, workspace lint, UI/Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management attribution foundation

- Migrated Management source attribution metrics, filters and customer records to shared Admin Shell primitives and the canonical commercial token contract.
- Mapped source/evidence enums and anonymous customer names to commercial language, removed internal source UUID display, and preserved customer deep links and persisted attribution semantics.
- Format, workspace lint, UI/Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 platform security foundation

- Migrated Platform risk signals, dispositions and security-event timeline to shared Admin Shell primitives and the canonical commercial token contract.
- Converted internal severities, risk kinds, review notes, event actions and resource types to operator language while retaining complete request correlation identifiers and existing auditable disposition behavior.
- Format, workspace lint, UI/Platform typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. All Platform core governance pages now share the product foundation; Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 platform connector foundation

- Migrated Platform connector definition, tenant authorization summary, health observation, limit and log views to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved connector transactions and the intent-only capability boundary while converting persisted health, authorization and delivery-state values to stable commercial language.
- Format, workspace lint, UI/Platform typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 platform template foundation

- Migrated Platform fixed-component template draft, preview and controlled publish to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved target/module API values and versioned publication behavior while mapping persisted enums to stable commercial labels and making browser acceptance isolate its fresh per-run template.
- Format, workspace lint, UI/Platform typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 platform onboarding foundation

- Migrated the transaction-backed Platform tenant initializer to shared Admin Shell primitives and the canonical commercial token contract.
- Kept tenant/organization/store/admin/template initialization unchanged and explicitly labels the result as basic initialization, reserving commercial READY for Batch 2 provisioning acceptance.
- Format, workspace lint, Platform typecheck/build and real fresh-tenant 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 platform business-circle foundation

- Migrated Platform business-circle recommendation, benefits and approval to shared Admin Shell primitives and the canonical commercial token contract.
- Preserved create/recommend/approve transactions and updated browser acceptance to target the fresh per-run circle code, eliminating dependence on accumulated historical records.
- Format, workspace lint, Platform typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 platform channel foundation

- Migrated the Platform first-level channel and merchant-pool operating surface to shared `AdminPageHeader`, `Card`, `Button`, `StatusBadge` and `AppStatePanel` primitives in the platform Admin Shell.
- Added commercial-language labels for persisted platform channel lifecycle values while preserving real channel creation, idempotency, audit and Outbox behavior. The browser fixture now uses the access/refresh/expiry session contract.
- Format, workspace lint, Platform/UI typecheck, Platform build and the real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 management performance foundation

- Migrated Management employee process performance to shared `AdminPageHeader`, `Card`, `Button`, `StatusBadge` and `AppStatePanel` primitives in the Admin Shell.
- Preserved tenant-scoped task, follow-up, evidence and confirmed-contribution semantics. Updated the browser fixture to the access/refresh/expiry session contract and verified secure login recovery.
- Format, workspace lint, Management typecheck/build and real 1440px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 employee workbench foundation

- Migrated the daily Employee workbench to shared `Button`, `StatusBadge` and `MetricCard` primitives with the canonical commercial token contract.
- Preserved real task completion, scoped customer/opportunity context and mobile navigation. Updated the browser fixture to the access/refresh/expiry session contract and verified the secure no-session login redirect.
- Format, workspace lint, Employee typecheck/build and real 390px browser suite (2/2) pass with refreshed visual and trace evidence. Batch 1 remains in progress.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 employee task-detail foundation

- Migrated the protected Employee task-detail surface to shared `Button`, `StatusBadge` and `AppStatePanel` primitives and replaced local blue/purple visual rules with the canonical commercial token contract.
- Preserved evidence association, result-evidence upload, idempotent task completion, session recovery and tenant/RBAC behavior. Verified format, workspace lint, Employee typecheck/build and real 390px Employee session regression (2/2), with refreshed screenshot and trace evidence.
- Batch 1 remains in progress; this is an internal migration checkpoint, not a Batch 1 acceptance claim.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 1 state and shell continuation

- Added active-route feedback to the shared Admin Shell and removed the duplicate Employee Workbench navigation so the employee app has one authoritative mobile task bar.
- Unified Consumer, Employee, Management and Platform root loading, empty, error and permission routes; replaced blank Consumer/Employee nested loading boundaries; aligned protected-session recovery and E/M/P login pages with the shared foundation.
- Confirmed format, lint and all-workspace typecheck after rebuilding the affected shared packages. Batch 1 remains in progress pending core-page migration, visual evidence and full acceptance regressions.

## 2026-08-09 — ONEDAY-V3-COMMERCIAL-COMPLETION Batch 0 + Batch 1 foundation start

- Preserved all pre-existing dirty workspace material in `D:\ONEDAY_V3_SAFE_CHECKPOINT\20260809-202946`; committed valid baseline audit/evidence separately and archived the historical zip outside the repository.
- Started the shared Commercial UI Foundation: one token source and reusable primitives now back the Consumer/Employee Mobile Shell and Management/Platform Admin Shell. Management and Platform dashboards use the shared state and metric primitives.
- Verified this foundation checkpoint with all-workspace typecheck and build. Batch 1 remains in progress; no business capability or final commercial-pass claim was made.

## 2026-08-09 — CONSUMER-COMMERCIAL-HOME-V1 navigation and interaction alignment

- Replaced the fixed platform-style consumer tabs with the restaurant storefront contract: `首页 / 团购 / 菜单 / 会员 / 我的`. Each item has a store-scoped page rather than an in-page placeholder.
- Added a shared Consumer Shell to storefront, group-buy, menu, membership, profile, product-detail and external-action pages. Tenant, store, source, scene and share-code context remain present across each consumer journey.
- Routed all product, group-buy and consultation actions through the existing confirmation/audit path before an external hand-off. Map, phone and sharing retain their explicit outbound behavior; no payment, fabricated order or third-party delivery claim was added.
- Verification: full 18-package typecheck/build, focused service API test, Consumer storefront Playwright 2/2 and mobile service/action Playwright 2/2. Status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`.

## 2026-08-09 — CONSUMER-COMMERCIAL-HOME-V1 store-information card

- Replaced the storefront's single-line store title/business-hours area with a reference-inspired store-information card: existing store image, persisted store name, open state, business hours, service method and TEST ONLY marker.
- Kept the existing LBS/future-recommendation row, warm color system, Banner and lower storefront modules unchanged; no rating, sales or other unsupported marketing metrics were invented.

## 2026-08-09 — CONSUMER-COMMERCIAL-HOME-V1 storefront header layout

- Reworked only the storefront introduction/header layout without changing its color system: LBS location is on the upper left and a non-interactive future “business circle / OEM recommendation” placeholder is on the upper right.
- Retained the store title, business status, sharing action, banner and all lower storefront sections unchanged. Status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`.

## 2026-08-08 — CONSUMER-COMMERCIAL-HOME-V1 follow-up

- Added migration 047 and local TEST ONLY package/platform prices so the storefront directly displays Meituan, Douyin and partner group-buy prices for the same recommended package.
- Aligned Consumer service-detail and external-action child-page cards, backgrounds and buttons with the storefront's warm commercial visual system.
- Kept the task in `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`; per-tenant theme/plugin editing remains a separately scoped, controlled configuration capability rather than arbitrary page code.

## 2026-08-08 — CONSUMER-COMMERCIAL-HOME-V1

- Reworked the Consumer storefront into a mobile commercial home with store switching, Banner carousel, action grid, membership entry, offers, platform comparison, updates, benefits, store contact actions and five-item bottom navigation.
- Seeded three distinct local TEST ONLY coffee storefronts using original project-local visual assets; added Consumer-only Playwright coverage and mobile screenshots.
- Status is `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`; this is not a final commercial UI pass.

## 2026-08-08 LOCAL HUMAN-PILOT-SANDBOX READY

- Added an isolated, idempotently provisioned `oneday_human_pilot` local database workflow using migrations 001–045 and non-seed HUMAN PILOT identities; no production migration or business logic changed.
- Started PostgreSQL, API, Worker and four localhost terminals; machine preflight passed API/Worker health, scheduler, anonymous consumer access, sessions, RBAC, tenant isolation and the customer/task/Outbox chain.
- Added local-only account inventory, human operator runbook and evidence under `PROJECT_STATE/` and `evidence/HUMAN-PILOT-HANDOFF/`.

## 2026-08-08 PRE-PILOT-POLISH PASS

- `268464d` closes only the approved pilot polish: truthful Discovery entry links, real consumer navigation, platform dashboard root redirect, honest consumer recommendation copy, accurate management AI execution receipts, active-tenant metric correction, and pilot AI/Redis documentation calibration.
- Final acceptance: `PROJECT_STATE/PRE_PILOT_POLISH_ACCEPTANCE.md`.

## 2026-08-08 AUDIT-BATCH-7 PASS (`d175f64`)

- Added shared business-language mappings for operating source, ownership, status, evidence and audit timeline values; the critical employee and owner flow now omits generated consumer identifiers while retaining the persisted business trace.
- Corrected public platform-entry language and the 390px employee result composition. Real four-terminal browser acceptance verifies consumer, employee, management, platform and cross-tenant isolation behavior.

## 2026-08-08 AUDIT-BATCH-6 PASS (`62f102b`)

- Added a task-scoped employee result and controlled image-evidence flow with server-side session, membership, assignment, customer and idempotency enforcement; result, audit and Outbox receipts commit as one transaction.
- Added real four-terminal browser acceptance from public consumer behaviour through employee handling to owner management visibility, including second-tenant and low-privilege API isolation checks.

## 2026-08-08 AUDIT-BATCH-5 PASS (`aa50e0e`)

- Added migration-backed AI execution receipts and a controlled command boundary: only complete whitelisted tenant-local task commands run, while incomplete or unsupported suggestions remain `manual_required`.
- Executed AI follow-ups now emit tenant-scoped task, audit, and Outbox evidence. Management/platform connector surfaces explicitly declare intent-only authorization and unavailable external delivery without exposing submitted secrets.
- Added real API-process acceptance for command execution, manual fallback, audit/Outbox receipt, secret non-disclosure, and both connector capability surfaces.

## 2026-08-08 AUDIT-BATCH-4 PASS (207740e)

- Consolidated API database access behind a bounded, application-owned PostgreSQL pool and added persistent, atomic limit windows for authentication and public consumer writes.
- Enforced production HTTPS/TLS-proxy/CORS/edge-rate-limit configuration, added request correlation and CORS session-revocation support, and covered the boundary with real API-process acceptance.

## 2026-08-08 AUDIT-BATCH-3 PASS (`3998a7d`)

- Replaced the health-only Worker with locked internal Outbox consumption, durable retry diagnostics and a shared reminder/overdue scheduler.
- Added a real isolated Worker-process regression test covering delivery, notifications, overdue escalation and failed-event recovery.

## 2026-08-08 AUDIT-BATCH-2 PASS (`5c0ea50`)

- Closed the consumer-to-operations break with a single transaction that projects a public consumer event into one customer, source, existing-rule ownership/task/reminder or existing lead-pool record, correlated audit and Outbox events.
- Added concurrent/replay regression coverage and a real employee-to-management HTTP chain; consumer access remains public and anonymous.

## 2026-08-08 H-002 PASS

- Added a shared browser session client and real tenant-slug login, refresh rotation and logout journeys for employee, management and platform terminals; protected backend routes are guarded at each terminal root layout.
- Kept consumer access public and anonymous, removing the incorrect staff-style consumer login experiment.
- Completed the systemic close-out: migrated 36 protected business pages / 54 direct token reads to `SessionApiClient`, which owns Bearer, request-id, refresh/retry and cleanup semantics; consumer public routes no longer default to `system`.
- Added regression coverage for forced 401 refresh/retry and for the protected-page session boundary; verified 173 repository tests and 6 real H-002 Playwright journeys.
- Added an automatically cleaned, test-only “瑞幸咖啡 · ONEDAY测试模拟租户” commercial fixture with a second isolated tenant, role accounts, stores, operational records, channel/circle relations, audit and Outbox data.

## 2026-08-08 H-001 PASS

- Closed pre-release P0-1 by removing the API authentication-secret fallback and making missing/unsafe production configuration fail closed.

## 2026-08-08 FINAL COMMERCIAL MVP AUTOMATED ACCEPTANCE PASS

- Completed all 69 indexed tasks and recorded final controlled-pilot acceptance, including fresh-database migration/seed/rollback/repair rehearsal, live readiness/connector recovery, and browser terminal acceptance.
- Remediated fresh-database foundation seed ordering and a transient consumer browser-test selector race; both have regression coverage.

## 2026-08-08 HARDENING-005 PASS

- Added a controlled pilot delivery package covering deployment, administrator operations, deterministic-demo-account isolation, product limitations, and an evidence-led handoff checklist.
- Added documentation contracts that prevent unsafe readiness, credential, cross-tenant, recovery, and external-delivery claims from silently regressing.

## 2026-08-08 — HARDENING-004 PASS

- Added guarded PostgreSQL recovery clone tooling, retained recovery verification, and release/rollback runbook documentation.
- Verified tenant, configuration, connector and evidence-file counts against a real controlled recovery clone.

## 2026-08-08 — HARDENING-003 PASS

- Replaced static API health reporting with bounded database-backed readiness and verified failure-closed behavior.
- Verified connector unavailable-to-healthy recovery through versioned idempotent observations.

## 2026-08-08 — HARDENING-002 PASS

- Verified the commercial MVP across consumer action, employee follow-up/repurchase, fixed business-circle attribution, and merchant onboarding with real PostgreSQL-backed HTTP chains.
- Added cross-terminal Playwright screenshots and trace evidence; merchant onboarding now grants the tenant administrator the necessary `employee.manage` capability.

## 2026-08-08 — HARDENING-001 PASS

- Protected API requests now require a matching active, unrevoked, unexpired persistent session in addition to a valid JWT.
- Added runtime and contract coverage for logout revocation, tenant/RBAC separation, private controllers, export and evidence-file security headers.

## 2026-08-08 — CHANNEL / BUSINESS-CIRCLE PHASE ACCEPTED

- Verified CHANNEL-001, CHANNEL-002, CIRCLE-001 and CIRCLE-002 with full repository gates, database migration/seed, HTTP and browser evidence.

## 2026-08-08 — CIRCLE-002 PASS

- Delivered `/bc/merchants` with prepared-only invitations, distinct circle and platform approvals, versioned display configuration and auditable exit.
- Approved merchant projections now honor display visibility and sort configuration in the fixed-circle dashboard.

## 2026-08-08 — CIRCLE-001 PASS

- Delivered `/bc/dashboard` with fixed-circle merchant benefits plus aggregate content, traffic and conversion projections.
- The dashboard accepts only system-tenant platform access and displays approved platform-owned memberships; tenant private master data and pending memberships remain excluded.

## 2026-08-08 — CHANNEL-002 PASS

- Delivered `/ch/merchants/new` with transactional merchant provisioning, channel affiliation, invitation preparation, initial template, commercial plan and recoverable delivery states.
- Delivery state is explicit and versioned; no external invitation or delivery is fabricated without authorization.

## 2026-08-08 — CHANNEL-001 PASS

- Delivered `/ch/dashboard` with persisted first-level channel merchant assignments, onboarding status, 30-day activity and evidence-based renewal opportunity signals.
- Renewal signals are limited to inactive-30-day or existing high-risk evidence; no subscription expiry is fabricated.

## 2026-08-08 — PAGE-P-008 PASS

- Delivered `/p/security-audit` with platform-authorized risk signals, reviewable privilege and connector events, and persistent risk disposition.
- Dispositions use idempotency and optimistic versioning, with a tenant-bound review record plus correlated audit and Outbox evidence.

## 2026-08-08 — PAGE-P-007 PASS

- Delivered `/p/connectors` with platform connector definitions, fixed authorization modes, rate limits, persisted health observations and logs.
- Tenant authorization is aggregated from existing records only; connector secrets are never exposed and health observations never claim an unperformed external call.

## 2026-08-08 — PAGE-P-006 PASS

- Delivered `/p/templates` with platform-owned template drafts, fixed CORE-008 modules, validated industry/scenario configuration, preview and versioned publication.
- Platform templates are system-tenant isolated, require platform permissions and retain idempotency, audit and correlated Outbox evidence without allowing arbitrary executable configuration.

## 2026-08-08 — PAGE-P-005 PASS

- Delivered `/p/business-circles` with platform-owned fixed business circles, an explicit merchant recommendation, persisted benefits and a separate approval queue.
- Nearby merchant discovery remains separate and cannot auto-enroll a merchant; creation and approval use platform RBAC, idempotency, optimistic versioning, audit and correlated Outbox evidence.

## 2026-08-08 — PAGE-P-004 PASS

- Delivered `/p/channels` with persisted first-level channels, tenant merchant pool, onboarding progress and service status.
- Channel creation requires platform authority and records idempotency, audit and correlated Outbox evidence.

## 2026-08-08 — PAGE-P-003 PASS

- Delivered `/p/tenants/new` with transactional tenant, organization, store, administrator/RBAC and starter-template provisioning.
- Platform onboarding now validates operator-supplied administrator credentials, persists only a password hash, and records correlated audit/Outbox/idempotency evidence.
- Serialized shared-database integration tests to eliminate cross-test data races in the repository quality gate.

## 2026-08-08 — PAGE-P-002 PASS

- Delivered `/p/tenants` with platform-scoped lifecycle, plan, quota and risk management.
- Sensitive lifecycle changes now require exact second confirmation and write audited outbox events.

## 2026-08-08 — PAGE-P-001 PASS

- Delivered `/p/dashboard` with platform-permission-scoped global tenant, channel, activity, risk and PostgreSQL availability signals.
- Platform-wide reads require a system-tenant membership carrying the new `platform.read` permission.

## 2026-08-08 — PAGE-M-016 PASS

- Delivered `/m/settings` with tenant-scoped, versioned operational settings for reminders, approvals, default quiet hours, tags, ownership and branding.
- Browser saves are now supported by CORS `PUT`, while employee-level quiet-hour preferences remain independent.

## 2026-08-08 — PAGE-M-015 PASS

- Delivered `/m/connectors` with tenant-scoped authorization requests, persisted status/logs and a no-fabricated-external-call boundary.
- Connector secrets are converted to a fingerprint before persistence; authorization requests remain idempotent and emit auditable, correlated events.

## 2026-08-08 — PAGE-M-014 PASS

- Delivered `/m/page-builder` with persisted fixed-module templates, real-time preview and server-controlled version publishing.

## 2026-08-08 — PAGE-M-013 PASS

- Delivered `/m/content` with tenant-scoped drafts, optimistic-version approval and auditable pending-authorization distribution requests.

## 2026-08-08 — PAGE-M-012 PASS

- Delivered `/m/attribution` with tenant-scoped first/current/final source views, contribution context, evidence levels and customer-chain drill-down.

## 2026-08-08 — PAGE-M-011 PASS

- Delivered `/m/employee-process-performance` with tenant-scoped task, follow-up, evidence-link and confirmed-contribution order signals.
- The view explicitly avoids single-order performance judgments and gives process-based, reviewable coaching guidance.

## 2026-08-08 — PAGE-M-010 PASS

- Delivered `/m/permission-audit` with tenant-scoped permission-change, export, risk-signal and trace views.
- Risk signals distinguish high-privilege expansion from unattributed privileged activity and retain correlation/trace evidence for review without claiming unverified violations.
- Verified through production HTTP/PostgreSQL, two 1440px browser flows, 112 repository tests and all quality gates.

## 2026-08-08 — PAGE-M-009 PASS

- Delivered `/m/roles-permissions` with tenant-scoped role templates, effective permission ranges, affected-member counts and high-risk confirmation guidance.
- Permission changes retain CORE-003's server-side reason, confirmation, version and audit safeguards.

## 2026-08-08 — PAGE-M-008 PASS

- Delivered `/m/organization-employees` with a tenant-scoped organization tree, employee status, invitations and visible task/customer handoff risk.
- Reused the audited CORE-002 invitation and offboarding state transitions; verification covered tenant isolation and post-offboarding risk visibility.

## 2026-08-08 — PAGE-M-007 PASS

- Delivered `/m/stores` with tenant-scoped store status, accountable manager, configured entries and traceable operating comparison signals.
- Manager assignment is optimistic-versioned and records audit and correlated Outbox events.
- Verified through production HTTP/PostgreSQL, two 1440px browser flows, repository gates, migration/seed and evidence checks.

## 2026-08-08 — PAGE-M-006 PASS

- Delivered `/m/ai-suggestions` with tenant-scoped persisted recommendations, model name/version metadata, explicit acceptance and field-addressable feedback.
- Acceptance only records the manager confirmation: optimistic versioning, audit and correlated Outbox evidence preserve the boundary before any business action is performed elsewhere.
- Verified with production HTTP/PostgreSQL, two 1440px browser flows, 104 repository tests and all quality gates.

## 2026-08-08 — PAGE-M-005 PASS

- Delivered `/m/workflows` with tenant-scoped workflow templates, instances, responsibility, approval and timeout views.
- Verified through production HTTP/PostgreSQL, two 1440px browser flows and all quality gates.

## 2026-08-08 — PAGE-M-004 PASS

- Delivered `/m/customers/[id]` with tenant-scoped customer-chain, approval, ownership, anomaly, order-evidence and audit-timeline views.
- Verified through production HTTP/PostgreSQL, two 1440px browser flows, 100 repository tests and all quality gates.

## 2026-08-08 — PAGE-M-003 PASS

- Delivered `/m/customers` with tenant-scoped persisted customer filters, segmentation, ownership context and a desktop batch ownership-transfer approval workflow.
- Added approval-gated export requests and CSV download with idempotency, optimistic versioning, audit and correlated Outbox records.
- Verified through production HTTP/PostgreSQL, two 1440px browser flows, 98 repository tests and all quality gates.

## 2026-08-08 — PAGE-M-002 PASS

- Delivered `/m/funnels/[id]` with tenant-scoped source, lead, follow-up, deal and repurchase outcomes, plus an explicit unconfirmed visit stage.
- The funnel keeps confirmed PostgreSQL outcomes separate from unavailable customer-to-visit inference so conversion rates never overstate evidence.
- Verified through production HTTP/PostgreSQL, two 1440px browser flows, 93 repository tests and all quality gates.

## 2026-08-08 — PAGE-M-001 PASS

- Delivered `/m/dashboard` with tenant-bound customer, order and task operating metrics, persisted overdue-task and ownership-approval exceptions, and explainable action-first recommendations.
- Management reads require `tenant.manage`; every metric and exception remains traceable to tenant-scoped persisted records and safe internal action links.
- Verified through production HTTP/PostgreSQL, two 1440px browser flows, 92 repository tests and all quality gates.

## 2026-08-08 — PAGE-E-009 PASS

- Delivered `/e/profile` with employee-private personal, organization, store, permission and notification-preference data plus safe common tool links.
- Added a server-resolved own-preference endpoint so client-supplied employee IDs cannot alter another employee's notification setting; existing version, audit and Outbox safeguards remain enforced.
- Verified through production HTTP/PostgreSQL, two 390px browser flows, 91 repository tests and all quality gates.

## 2026-08-08 — PAGE-E-008 PASS

- Delivered `/e/notifications` with employee-private task, anomaly, ownership-approval and system records, category/read filters, safe internal deep links and mobile recovery states.
- Added a deduplicated persistent inbox projection for CORE-006 notification logs and pending ownership approvals; read changes enforce employee scope, version/idempotency, audit and correlated Outbox records.
- Verified by production HTTP/PostgreSQL, two 390px browser flows, 90 repository tests and all quality gates.

## 2026-08-08 — PAGE-E-007 PASS

- Delivered `/e/nurture` with employee-owned customer segmentation, repurchase/dormant handling, real touchpoint records and optional follow-up task creation.
- Added tenant/RBAC/optimistic-lock/idempotency protections, correlated audit/Outbox writes and a pipeline from E006 nurture conversion into retained-customer execution.
- Fixed the API CORS allowlist to support the product PATCH update path; 88 repository tests and all quality gates passed.

## 2026-08-06 — PAGE-E-006 PASS

- Delivered `/e/leads` with persisted, tenant-bound acquisition entries and mobile status filtering, claim, staff allocation, follow-up conversion and nurture conversion.
- Real HTTP verification covers RBAC, active employee scope, input validation, version conflicts, idempotency, tenant rejection, follow-up task creation, batch allocation, audit and Outbox persistence.
- Two 390px Chromium interactions, 86 repository tests and all repository quality gates passed.

## 2026-08-06 — PAGE-E-005 PASS

- Delivered `/e/share` with real employee, campaign and channel codes, scannable QR links, expiry/revocation and mobile recovery states.
- Public consumer share entry records source-code opens, rejects revoked or expired codes, and safely routes only to internal consumer paths.
- HTTP isolation/idempotency/audit/Outbox checks, two 390px browser scenarios, 84 repository tests and all quality gates passed.

## 2026-08-06 — PAGE-E-004 PASS

- Delivered mobile task follow-up recording with persistent original text/voice transcription, editable summary and optional next task creation.
- Real HTTP scope/idempotency/audit/Outbox checks and 390px browser normal/recovery evidence passed.

## 2026-08-06 — PAGE-E-003 PASS

- Delivered a mobile employee customer detail at `/e/customers/[id]` with persisted source, own ownership, safe tags, masked identity, own tasks and timeline.
- Customer reads are restricted to an active employee's owned, tasked or contributed customers; HTTP and 390px browser checks verified tenant scope and recovery states.

## 2026-08-06 — PAGE-E-002 PASS

- Delivered `/e/tasks/[id]` as an employee-scoped mobile task detail surface for persisted task reason, deadline, customer and safe evidence metadata, with loading/error/forbidden/empty feedback.
- Added tenant-bound task evidence links that accept only the task customer's persisted active evidence, use idempotency, write audit/Outbox records, and preserve self-only task completion with version locking.
- Real HTTP isolation/idempotency verification, two 390px Chromium scenarios with screenshots/traces, and full repository gates passed: lint, format, typecheck, Vitest, 78 repository tests, build, migration/seed and evidence checks.

## 2026-08-06 — PAGE-E-001 PASS

- Delivered `/e/workbench` as an employee-scoped mobile execution surface: today's tasks, customer reminders and explainable due-signal opportunities all use persisted task data.
- Task completion is limited to the logged-in employee's own assignment, version-protected, and records audit/Outbox evidence.
- Real HTTP permission/isolation tests and two 390px Chromium scenarios passed, along with lint, format, typecheck, Vitest, repository tests, build, migration/seed and evidence checks.

## 2026-08-06 — PAGE-C-007 PASS / PAGE-C phase acceptance

- Delivered `/c/profile` with tenant-bound profile access, masked identity bindings, tenant-scoped benefits, personal service history and consent revocation.
- All PAGE-C-001 through PAGE-C-007 tasks passed automated phase acceptance before PAGE-E-001 began.

## 2026-08-06 — PAGE-C-006 PASS

- Delivered `/c/processes/[id]` for consumer-visible order, consultation, appointment, verification, connector-result and exception feedback progress.
- Added an expiring, tenant-bound, hashed process access secret so public reads do not expose customer identity or rely on enumerable order IDs.
- HTTP secret/isolation checks, 390px normal/recovery browser evidence, and full gates passed: 72 repository tests, lint, format, 17-package typecheck/build, migration/seed and evidence checks.

## 2026-08-06 — PAGE-C-005 PASS

- Delivered `/c/actions/[id]` as a real external-action confirmation and recovery flow, connected from the consumer entry rather than directly trusting browser-side destinations.
- Added a tenant-scoped public confirmation API and persisted redirect events with idempotency, audit records, Outbox events and safe local-only return paths.
- HTTP tenant/isolation/idempotency tests, two 390px Chromium scenarios with screenshots/traces, and full gates passed: 70 repository tests, lint, format, 17-package typecheck/build, migration/seed and evidence checks.

## 2026-08-06 — PAGE-C-004 PASS

- Delivered a tenant-scoped consumer service page at `/c/services/[id]`, including applicable store, benefits, explicit consultation result and loading/error/unavailable states.
- The service action is resolved server-side, reuses the persisted, idempotent, audited consumer-action flow, and preserves strict tenant/store/action boundaries.
- HTTP isolation and idempotency checks, 390px Chromium interaction/screenshots/traces, plus full gates passed: lint, format, 17-package typecheck/build, Vitest, 68 repository tests, migration/seed and evidence checks.

## 2026-08-06 — PAGE-C-003 PASS

- Delivered a real consumer store detail experience with persisted services, benefits, content, action entry, deep-link source retention and complete loading/empty/error/forbidden feedback.
- Public consultation clicks are tenant/store/action scoped, idempotent, audited and published as `consumer.action.clicked.v1`. CORS is an explicit environment allowlist rather than a wildcard.
- HTTP isolation and event tests, 390px browser interaction/screenshots/traces, and full gates passed: 66 repository tests, 17-package typecheck/build, lint, format, migration/seed and evidence checks.

## 2026-08-06 — PAGE-C-002 PASS

- Delivered the consumer discovery page backed by distinct tenant-scoped channel, business-circle and merchant-location models. Public coordinate validation, empty/error/forbidden/loading states, browser geolocation action and 390px responsive interaction are implemented.
- Real HTTP data-isolation validation, two Chromium E2E scenarios with normal/empty/forbidden screenshots and traces, and the full repository gate passed: lint, format, 17-package typecheck/build, Vitest, 64 repository tests, migration/seed and evidence checks.
- Isolated PAGE-C-001 public-entry fixtures so concurrent repository tests no longer select each other’s published content.

## 2026-08-06 — PAGE-C-001 PASS

- 交付真实数据驱动的消费者统一入口：已发布模板、服务权益、推荐和外部行动入口按租户公开呈现，包含空、不可用、加载和错误恢复状态。
- 构建后 HTTP API、390px Playwright 交互与三种状态截图/trace 已通过；全仓质量闸门和 evidence check 已通过。

## 2026-08-06 — CORE 阶段验收 PASS

- CORE-001 至 CORE-010 的任务提交、验收证据、HTTP/权限/租户边界与全仓质量闸门已复核通过；报告：`evidence/CORE-PHASE/ACCEPTANCE.md`。

## 2026-08-06 — CORE-010 PASS / CORE 阶段完成

- 交付版本化工作流定义、实例、条件、真实任务生成、指派审批和超时终止；每个关键状态变更均有租户/RBAC 边界、审计与 Outbox 事件。
- 构建后 HTTP E2E 验证定义幂等、发布、任务、条件、审批、超时、认证、无权限和跨租户拒绝；60 项仓库测试、Vitest、typecheck、lint、format、build、迁移、种子和 evidence check 已通过。

## 2026-08-06 — CORE-009 PASS

- 交付租户隔离的 HTTP(S) 链接、小程序路径和平台入口配置，以及可追踪的点击事件。
- 构建后 HTTP E2E 验证幂等、动作事件、审计、Outbox、输入校验、未登录、无权限与跨租户拒绝；58 项仓库测试、Vitest、typecheck、lint、format、build、迁移、种子和 evidence check 已通过。

## 2026-08-06 — CORE-008 PASS

- 交付租户页面模板、模块实例、版本草稿、预览、发布和回滚；关键操作采用乐观锁、审计与 Outbox 事件。
- 构建后 HTTP E2E 验证完整版本状态机及认证/跨租户拒绝；56 项仓库测试、Vitest、typecheck、lint、format、build、迁移、种子和 evidence check 已通过。

## 2026-08-06 — CORE-007 PASS

- 交付客户订单、图片证据文件、哈希化核销码和连接器结果回执；图片仅接受受限格式并经租户授权下载。
- 构建后 HTTP E2E 验证订单幂等、文件安全、核销、回执、审计、Outbox、未登录、无角色和跨租户拒绝；54 项仓库测试、Vitest、typecheck、lint、format、build、迁移和 evidence check 已通过。

## 2026-08-06 — CORE-006 PASS

- 交付租户隔离的任务、持久化提醒、超时升级、员工勿扰偏好和通知日志；关键写操作均有乐观锁、审计和 Outbox 事件。
- 构建后 HTTP E2E 验证到期升级、提醒投递、勿扰抑制/恢复、未登录和跨租户拒绝；52 项仓库测试、Vitest、typecheck、lint、format、build、迁移和 evidence check 已通过。

## 2026-08-06 — CORE-005 PASS

- 交付客户来源、推荐/接待/成交/核销贡献、归属链与审批式转移；所有关键写操作均有乐观锁、审计和 Outbox 事件。
- 锁定依赖安装、lint、format、Vitest、50 项仓库测试、typecheck、build 和 evidence check 已通过。

## 2026-08-06 — CORE-004 PASS

- 交付客户主档、手机号/微信身份哈希与脱敏、同租户去重、乐观锁身份新增和客户合并。
- 所有客户写操作均通过动作权限、TenantContext、审计日志和带 correlation/trace 的 Outbox 事件保护。
- 锁定依赖安装、lint、format、Vitest、48 项仓库测试、typecheck、build 和 evidence check 已通过。

## 2026-08-06 — FOUNDATION-010 PASS

- 配置 Vitest、Playwright Chromium、evidence 校验和可重复截图/trace 输出。
- 生成 Consumer 应用壳截图并通过最终全仓质量闸门；代码提交：`0666f345d009334c705b5604d0334c0319834846`。

## 2026-08-06 — FOUNDATION-009 PASS

- 建立设计令牌、统一状态文案及四端应用壳/状态边界。
- 四端构建和全仓质量闸门通过；代码提交：`2b3aac67876a84cff99048e0087adaee38171f5f`。

## 2026-08-06 — FOUNDATION-008 PASS

- 实现 PostgreSQL Outbox、消费者唯一键幂等与 correlation/trace 追踪字段。
- 实际数据库一致性测试和全仓质量闸门通过；代码提交：`f16ef6a1b98ace697eaa74be1d908233c02ab519`。

## 2026-08-06 — FOUNDATION-007 PASS

- 建立成员角色映射、统一授权服务和权限矩阵 HTTP E2E。
- 全仓质量闸门通过；代码提交：`678a4e5041057c4dc7651205c87e1a9ea73f82b8`。

## 2026-08-06 — FOUNDATION-006 PASS

- 建立基于认证声明的 TenantContext，拒绝客户端租户头与服务端声明不一致的请求。
- 真实 HTTP 跨租户读/写隔离测试和全仓质量闸门通过；代码提交：`d218f82044c979103ae264420c2d898257796341`。

## 2026-08-06 — FOUNDATION-005 PASS

- 实现持久化登录、刷新轮换、登出与会话撤销 API，并以会话租户字段拒绝跨租户撤销。
- 认证 HTTP E2E 和全仓质量闸门均通过；代码提交：`c9f40f810a6b259a7c0abdcb4636d63436144959`。

## 2026-08-06 — FOUNDATION-004 PASS

- 建立 Kysely PostgreSQL 数据访问、类型化基础表迁移、回滚与前向修复 CLI。
- 建立可重复执行的系统租户和基础权限种子，并提供受保护的测试数据库准备器。
- 实测 PostgreSQL 18 测试库的迁移、幂等迁移/种子、回滚和前向修复；完成全仓质量闸门。
- 任务代码提交：`3685e9a07be6e98e4980d00afabeb33be8087106`。

## 2026-08-05 — FOUNDATION-001 PASS

- 初始化 Git 仓库、pnpm 10 与 Turborepo Monorepo。
- 建立四个 Next.js 16 Web 入口、NestJS 11 + Fastify API、Worker 与 11 个共享包。
- 通过冻结依赖安装、17 工作区类型检查、20 项结构契约测试、17 工作区构建、API health 注入测试和生产依赖安全审计。
- 任务提交：`1d94bb72ac8b89d2dab8948d7a1f8a7567c94f06`。

## 2026-08-05 — FOUNDATION-002 PASS

- 建立 PostgreSQL 18、Redis 8、API 与 Worker 的 Docker Compose，并将项目名、数据卷和主机端口与旧项目隔离。
- API 和 Worker 均具备真实 HTTP 健康检查；容器实测全部 healthy。
- 通过冻结依赖安装、17 工作区类型检查、25 项契约测试、17 工作区构建和生产依赖安全审计。
- 任务提交：`b32844de7d84e5a6a94a3305bfaf57b999417cf8`。

## 2026-08-06 — FOUNDATION-003 PASS

- 建立统一 ESLint、Prettier、Commitlint 和 Zod 环境变量校验。
- 通过格式、类型、Lint、26 项契约测试、17 工作区构建和生产依赖安全审计。

## 2026-08-09 — CONSUMER-COMMERCIAL-HOME-V1 service product detail follow-up

- Expanded the Consumer service detail into a warm, mobile product page: product card, package data, purchase notes, applicable store facts, benefits and a store-scoped platform-price list with lowest-price indication.
- Service-detail API data is now restricted to active store-linked actions and returns persisted `store_service_platform_offers`, store facts and content materials. Product-page action clicks retain the existing public intent record before an external destination is opened.
- Verified: API/Consumer typecheck and production builds; focused service-detail HTTP acceptance; focused mobile Playwright 2/2. Visual evidence: `evidence/CONSUMER-COMMERCIAL-HOME-V1/service-detail-mobile.png`.
