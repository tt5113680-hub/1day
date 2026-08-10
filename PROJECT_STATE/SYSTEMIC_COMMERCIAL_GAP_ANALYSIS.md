# SYSTEMIC COMMERCIAL GAP ANALYSIS

- recorded_at: 2026-08-10 Asia/Shanghai
- branch: `hardening/COMMERCIAL-COMPLETION`
- head_baseline: `ef5a46f`
- method: four-terminal route inventory + API controller inventory + blueprint/matrix/template cross-check + live code (not stale Aug-8 audit alone)
- claim boundary: This document diagnoses productization debt. It does **not** claim 全部商用, first-tier visual parity, or Tencent Cloud readiness.

## 0. One-sentence truth

**Matrix P0 is engineering-green; the commercial product is still infrastructure with incomplete surfaces, transitional dual truths, and three visual/IA systems — not a sellable一线大厂 SaaS.**

Previous statements that “施工接近尾声” referred only to **authorized P0 matrix close-out**. They were **not** a claim that FE/BE unity, commercial depth, or UI bar were finished. That distinction must stay explicit.

## 1. What is already true (do not re-litigate)

| Layer                                  | Fact                    |
| -------------------------------------- | ----------------------- |
| Indexed tasks / Audit / Hardening      | PASS                    |
| Batch 1–4 + Storefront module-renderer | PASS                    |
| Matrix P0 (26)                         | COVERED via Waves 1–4   |
| Local HUMAN-PILOT + fixture generator  | READY (LOCAL TEST ONLY) |
| Product-owner UI sign-off              | **Unsigned**            |
| Tencent Cloud / public HTTPS           | Out of scope (G)        |

## 2. Root-cause clusters (systemic, not page bugs)

### S1 — Capability islanding (P0)

Backend controllers exist and are matrix/API-proven; operators cannot operate them from product UIs.

| Domain                               | Backend exists                           | Frontend reality                                                                  |
| ------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------- |
| Sync gateway SSE/ETag                | `/api/v1/sync/*`, public storefront sync | **CLOSED (SYS-3)** `@oneday/sync-client` on M/E/C                                 |
| Outbox DLQ + replay                  | Platform API                             | **CLOSED (SYS-4)** `/p/outbox`                                                    |
| Provisioning Run detail / retry      | `GET onboarding/:runId`                  | **CLOSED (SYS-11)** failure trail + fresh retry on `/p/tenants/new`               |
| ONE-CODE resolve                     | `GET /api/v1/one-code/:code`             | **CLOSED (SYS-22)** Consumer `/c/one-code/[code]` + delivery `landingPath`        |
| Workflow write machine               | Full CRUD/publish/decide                 | **CLOSED (SYS-4/7/9…21)** Management `/m/workflows` STA authoring                 |
| Content distributions (intent)       | `POST .../distributions`                 | **CLOSED (SYS-4)** Management `/m/content` distributions                          |
| Org/merchant/store create            | Organization APIs                        | **CLOSED (SYS-6)** Management organization-employees creates                      |
| Customer merge / identity / transfer | Customer + attribution APIs              | **CLOSED (SYS-24)** detail transfer/approve/merge UX; list batch transfer already existed |
| Result/order/evidence/verification   | Result-evidence APIs                     | **MOSTLY CLOSED** Consumer process + Mgmt customer read; deep order UX remains P1 |
| Membership wallet                    | `GET consumer/memberships/wallet`        | **CLOSED (SYS-2)** Consumer member session wallet call                            |
| Generic external-actions CRUD        | `/external-actions`                      | **CLOSED (SYS-25)** Management catalog list/create; store bind remains `/m/stores` |
| RBAC role create / role packs        | RBAC API                                 | **CLOSED (SYS-4)** `/m/roles-permissions` role create                             |
| Management attribution IA            | Attribution APIs + `/m/attribution` page | **CLOSED (SYS-23)** `MANAGEMENT_MENU_CATALOG.attribution` for `tenant.manage`     |

### S2 — Dual truths / FE–BE contract drift (P0)

| Dual surface                                                               | Risk                                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| ~~Consumer shell tabs hard-coded~~ (SYS-2)                                 | Shell resolves published `operating_channels` with five-tab fallback          |
| Content: `content_items`+placements **union** legacy `store_content_items` | New seeds/fixtures placements-only; dual-read remains for old rows            |
| ~~Outbound tenant-wide actions~~ (SYS-1)                                   | Consult = store-scoped consultation; platform cards = store links/offers      |
| Connectors (intent) vs Consumer outbound (HTTPS hand-off)                  | Easy to over-claim “已对接美团/抖音”; SYS-1 documents connectors ≠ outbound   |
| Membership benefits vs wallet (partial SYS-2)                              | `member_wallet` calls wallet API when session access present; else enroll CTA |
| Sync covered in tests, UIs still hard-refresh                              | Closed-loop in DB, not in continuous product                                  |

### S3 — Role × IA incomplete (P0)

`ROLE_PRODUCT_MATRIX` freezes nine roles. Runtime chrome progress:

- Consumer anonymous shell
- Employee menu DTO + **SYS-27** desktop nav ≥700px + store-manager mode/package on `/e/store` (full nine-role packages still multi-week)
- Management flat `tenant.manage` nav (**SYS-26** closed connectors/AI/audit/employee-process orphans; deeper role packages remain)
- Platform path-mode (`/p` `/ch` `/bc`) with **SYS-27** product switcher + role home strips (deeper Channel/Circle scope UX remains)

### S4 — Config-driven Storefront incomplete vs HIGH_FIDELITY (P1)

- Module renderer PASS for order/visibility.
- Page Builder = list/hide/reorder/preview-link — not entity pickers, `operating_channels` editor, or industry family configs.
- API whitelist includes `member_wallet` / `operating_channels`; Consumer renderer does not fully productize them.
- Renderer lives under Consumer app, not a shared package Management can preview with the same code.

### S5 — UI / design-system distance from一线大厂 (P1 structural)

| Terminal   | Honest bar | Structural gap                                                       |
| ---------- | ---------- | -------------------------------------------------------------------- |
| Consumer   | ~6/10      | Three IAs (entry/discovery/store); cream vs green tokens; fixed tabs |
| Employee   | ~6.5/10    | Desktop nav ≥700px landed (SYS-27); task inbox depth remains         |
| Management | ~6/10      | Flat nav; thin `@oneday/ui` kit                                      |
| Platform   | ~6/10      | Product switcher + role homes (SYS-27); enum bleed; intent connectors |

~70% of remaining distance is **structural** (IA, shared kit, config chrome, shared renderer). ~30% is cosmetic. **Page-level hex/CSS patches will not close this.**

Thin design system: Button/Card/Metric/AdminShell/MobileShell/AppStatePanel exist; missing FormField/Input/Select/Table/Skeleton/Modal/Icon pipeline. Token holes (`--od-brand-50`, etc.) and Consumer parallel palette remain.

### S6 — Commercial journey depth holes (P1)

Incomplete as **systems** (not missing a button):

1. Configured外链 → Consumer card → confirm → attribution **discoverable in Management IA (SYS-23)**
2. Member enroll → wallet → Employee redeem → Management grant/revoke timeline
3. Publish → four-terminal auto-converge without refresh
4. Platform Run failure → visible steps → retry
5. Content approve → place → (honest) distribution intent — not fake delivery
6. Store Manager scoped chrome vs Tenant Owner

### S7 — Honest out-of-scope / multi-week (do not fake “today”)

| Item                                                  | Why not “today done”                                   |
| ----------------------------------------------------- | ------------------------------------------------------ |
| First-tier visual parity (美团商家端/有赞/钉钉级)     | Weeks–months; Wave 0–3 UI program                      |
| Full ROLE_PRODUCT_MATRIX nine packages                | Product + RBAC + nav DTO program                       |
| Retire all legacy dual-read without migration program | Multi-day backfill + sunset                            |
| Real Meituan/Douyin delivery                          | Forbidden / not this product                           |
| Tencent Cloud / public HTTPS                          | Authorization G                                        |
| Claiming 全部商用                                     | Requires human pilot + P1 + ops; blocked without owner |

## 3. Stale documents (do not plan from them blindly)

Still useful historically, **wrong as current UI facts** in places:

- `PRODUCT_UI_GAP_AUDIT.md` (missing外链 UI / decorative employee nav — largely superseded by commercial-ui-alignment)
- Early `COMMERCIAL_UI_FULL_CHAIN_AUDIT.md` scores for shells

Trust for “what’s done”: Batch/Matrix/Storefront/Foundation acceptances + live code.

## 4. Definition of “施工完毕” (must agree before coding)

| Definition                                                                                               | Status today                            | Remaining              |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------- |
| **D1** P0 matrix engineering close-out                                                                   | DONE                                    | —                      |
| **D2** Local HUMAN-PILOT operable + fixtures                                                             | DONE (engineering)                      | Product-owner sign-off |
| **D3** Systemic commercial productization (FE/BE unity, config shell, sync clients, missing ops systems) | **IN PROGRESS**                         | Waves SYS-1…SYS-4      |
| **D4** 一线大厂 visual/IA parity                                                                         | NOT STARTED as program                  | 7–15+ weeks            |
| **D5** External pilot / 全部商用 claim                                                                   | BLOCKED without human + cloud decisions | Out of auto-claim      |

**Today’s authorized construction target = D3 Wave SYS-1 start + as many SYS gates as fit**, not D4/D5 fantasy completion.

## 5. Engineering waves (no page-level patches)

Each wave: code + contract tests + cross-terminal evidence + PROJECT_STATE update + commit. No per-page CSS fixes.

| Wave                                       | Goal                                                                                                                                                                      | Gate                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **SYS-1 Contract Unity**                   | Kill dual outbound/content ambiguity for **new** tenants; fixtures/seeds only placements+store links; Consumer prefers store-scoped links; document connectors ≠ outbound | Contract tests + fixture generator proof                  |
| **SYS-2 Config Shell + Wallet**            | Consumer nav from `operating_channels` (fallback to five tabs); render `member_wallet` when authorized; Page Builder fields for channels/capabilities (whitelist forms)   | Publish → Consumer DOM; beauty/education smoke            |
| **SYS-3 FE Sync Clients**                  | Shared ETag/SSE client for Management dashboard, Employee workbench, Consumer storefront                                                                                  | Timing evidence without hard refresh                      |
| **SYS-4 Ops Systems (pick verticals)**     | Platform DLQ/replay **or** Content distributions UI **or** Workflow write — one full vertical per sub-wave                                                                | API already exists; UI must not invent second API         |
| **SYS-5 Shared UI Kit + Renderer Package** | Expand `@oneday/ui`; extract `@oneday/storefront-renderer`; retire Consumer-only hex path                                                                                 | Tokens complete; Management preview imports same renderer |
| **SYS-6 Role IA**                          | Server menu DTO by role/scope; Store Manager / Channel / Circle homes                                                                                                     | Role matrix E2E                                           |

## 6. Time honesty

| Scope                | Estimate (1 Cursor executor)                         |
| -------------------- | ---------------------------------------------------- |
| SYS-1                | 0.5–1 day                                            |
| SYS-2                | 1–2 days                                             |
| SYS-3                | 0.5–1 day                                            |
| SYS-4 (one vertical) | 1 day each                                           |
| SYS-5                | 2–3 weeks                                            |
| SYS-6                | 2–3 weeks                                            |
| 一线大厂 parity (D4) | ~2–4 months productized; full matrix ambition longer |

**“今天全部施工好” cannot mean D4/D5.** It can mean: analysis frozen + SYS-1 landed + SYS-2 started/landed if capacity + clear remaining backlog.

## 7. Construction rules (non-negotiable)

1. No page-level patches; no “发现一个修一个”.
2. No arbitrary low-code / HTML injection.
3. No fake third-party delivery.
4. No 全部商用 marketing claim without human pilot + owner decision.
5. Prefer shared packages, contracts, and config-driven chrome over local arrays.
6. Evidence per wave under `evidence/SYS-*`.
