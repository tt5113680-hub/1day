# TASK_QUEUE

## Current commercial completion engineering

- [x] BATCH 1 PASS - unified four-terminal commercial UI foundation and all repository/session/isolation/commercial-chain/visual gates passed at source commit `1aecf81`; see `COMMERCIAL_UI_FOUNDATION_ACCEPTANCE.md`.

- [x] ONEDAY-V3-COMMERCIAL-COMPLETION / BATCH 2 PASS - provisioning READY, four industry Storefronts, lifecycle, Offer, content placement, membership and ONE-CODE are accepted at `c79812b`.
- [x] ONEDAY-V3-COMMERCIAL-COMPLETION / BATCH 3 PASS - cross-terminal tenant lifecycle, content placement and approved Platform network discovery pass at source commit `ead41e4`; see `BATCH_3_ACCEPTANCE.md`.
- [x] ONEDAY-V3-COMMERCIAL-COMPLETION / BATCH 4 PASS - clean-tenant commercial rehearsal (READY/ONE-CODE/Storefront through isolation and suspend/resume) verified; see `BATCH_4_ACCEPTANCE.md` and `evidence/BATCH-4/`.
- [x] ONEDAY-V3-COMMERCIAL-COMPLETION / Storefront module-renderer unification PASS - Consumer renders from `storefront.modules`; hard-coded Banner/shortcuts removed; Management order/visibility projects to Consumer; see `STOREFRONT_MODULE_RENDERER_ACCEPTANCE.md`.
- [x] ONEDAY-V3-COMMERCIAL-COMPLETION / matrix gap Wave 1 PASS - sync gateway (SY-01/02), concurrent harness (TP-02/SF-01/MB-02), worker DLQ/replay (WO-02), recovery commercial counts (RC-01); see `MATRIX_GAP_WAVE_1_ACCEPTANCE.md`.
- [x] ONEDAY-V3-COMMERCIAL-COMPLETION / matrix gap Wave 2 PASS - MG-E isolation (XT-01, MS-01, XL-01, XT-02 light); see `MATRIX_GAP_WAVE_2_ACCEPTANCE.md`.
- [x] ONEDAY-V3-COMMERCIAL-COMPLETION / matrix gap Wave 3 PASS - MG-F PARTIAL P0 (MB-01, SE-01, P-02, CT-01, M-01, WO-01); see `MATRIX_GAP_WAVE_3_ACCEPTANCE.md`.
- [x] ONEDAY-V3-COMMERCIAL-COMPLETION / matrix gap Wave 4 PASS - MG-G depth (M-02, XT-02, RC-01); P0 minimum COVERED 26/26; see `MATRIX_GAP_WAVE_4_ACCEPTANCE.md`.
- [x] COMMERCIAL-FIXTURES generator PASS - unified 1–3 READY tenants with products/offers/content/materials for local/test; see `COMMERCIAL_FIXTURE_GENERATOR.md` and `evidence/COMMERCIAL-FIXTURES/`.
- [x] SYS-1 Contract Unity PASS - store-scoped consult/outbound; placements-first seeds; connectors ≠ outbound; see `SYS_1_2_ACCEPTANCE.md` and `evidence/SYS-1/`.
- [x] SYS-2 Config Shell + Wallet PASS - operating_channels shell, member_wallet render, Page Builder whitelist editors; see `SYS_1_2_ACCEPTANCE.md` and `evidence/SYS-2/`.
- [x] SYS-3 FE Sync Clients PASS — `@oneday/sync-client` ETag poll wired to Management dashboard, Employee workbench, Consumer storefront; see `SYS_3_ACCEPTANCE.md` and `evidence/SYS-3/`.
- [x] SYS-4 Ops vertical PASS — Platform Outbox DLQ/replay UI at `/p/outbox`; see `SYS_4_ACCEPTANCE.md` and `evidence/SYS-4/`.
- [x] SYS-5 Shared UI kit + storefront-renderer **scaffold + visual token** PASS — `@oneday/storefront-renderer` extracted; `--od-sf-*` theme; Consumer store CSS hex retired; Management outline + storefront.css; see `SYS_5_ACCEPTANCE.md` and `evidence/SYS-5/`.
- [x] SYS-5 banner paint extraction PASS — `StorefrontBannerCarousel` + shared `.od-sf-banner*`; other module paints remain in Consumer; see `SYS_5_ACCEPTANCE.md`.
- [x] SYS-5 quick-actions paint extraction PASS — `StorefrontQuickActions` + `.od-sf-shortcut*`; Consumer keeps capability catalog wiring; Member/Offers paints remain; see `SYS_5_ACCEPTANCE.md`.
- [x] SYS-5 member + offer paints extraction PASS — `StorefrontMemberCard` + `StorefrontOfferList`; OfferCompare/platform/story remain in Consumer; see `SYS_5_ACCEPTANCE.md`.
- [x] SYS-5 compare + story paints extraction PASS — `StorefrontOfferCompare` + `StorefrontStoryList`; benefit/wallet/store_info remain in Consumer; see `SYS_5_ACCEPTANCE.md`.
- [x] SYS-5 benefit + store_info paints extraction PASS — `StorefrontBenefitList` + `StorefrontStoreInfo`; see `SYS_5_ACCEPTANCE.md`.
- [x] SYS-5 store_hero + floating consult paints extraction PASS — `StorefrontHero` + `StorefrontFloatingConsult`; channel pages remain local; see `SYS_5_ACCEPTANCE.md`.
- [x] SYS-6 Role IA / menu DTO **scaffold** PASS — `GET /api/v1/me/menu` + Management shell consumer; see `SYS_6_ACCEPTANCE.md` and `evidence/SYS-6/`.
- [x] SYS-6 multi-product menus + role homes **scaffold** PASS — Platform/Channel/Circle/Employee catalogs + shells; Store Manager `/e/store`; `homeHref`/`scopes`/`availableProducts`; see `SYS_6_ACCEPTANCE.md`.
- [x] SYS-6 data_scopes resolver PASS — `DataScopeService` merges `data_scopes` ∪ `store_managers`; manager assign/onboarding sync; `GET /api/v1/employee/managed-stores` + access gate; see `SYS_6_ACCEPTANCE.md`.
- [x] SYS-6 write-path scopes PASS — redeem gated by enrollment store scope; assigned store managers may list/update store commercial + external links; assign-manager remains owner-only; see `SYS_6_ACCEPTANCE.md`. More write controllers remain.
- [x] SYS-6 channel/circle network packs PASS — channel/circle dashboards + merchant writes filter/deny by `data_scopes`; `platform.manage` unrestricted; circle dashboard accepts `circle.manage`; see `SYS_6_ACCEPTANCE.md`.
- [x] SYS-6 store-manager content placements PASS — assigned managers list approved content + place on scoped stores; create/approve/distribute remain owner-only; Management menu 内容中心 for `tenant.read`; see `SYS_6_ACCEPTANCE.md`.
- [x] SYS-6 store-manager catalog scopes PASS — assigned managers list/create/update services + offers on scoped stores only; Management menu 套餐与 Offer for `tenant.read`; see `SYS_6_ACCEPTANCE.md`.
- [x] SYS-6 store-manager membership scopes PASS — assigned managers list enrollments/benefits and grant on scoped stores only; Management menu 会员与权益 for `tenant.read`; see `SYS_6_ACCEPTANCE.md`.
- [x] SYS-6 workflow/org write paths PASS — Management overview accepts `workflow.read`/`organization.read`; UI starts instances + decides approvals; org/merchant/store create via existing APIs; see `SYS_6_ACCEPTANCE.md`.
- [x] SYS-4 content distributions UI PASS — Management `/m/content` registers pending-authorization channel distributions via existing API; see `SYS_4_ACCEPTANCE.md`.
- [x] SYS-4 workflow authoring UI PASS — Management `/m/workflows` create+publish via existing workflow APIs; see `SYS_4_ACCEPTANCE.md`.
- [x] SYS-4 RBAC role create UI PASS — Management `/m/roles-permissions` creates roles via existing RBAC API; see `SYS_4_ACCEPTANCE.md`.
- [x] SYS-6 Role matrix E2E Store Manager package PASS — menu+scope+scoped writes+owner denials closed loop; Management CRM gated off bare `customer.read`; see `SYS_6_ROLE_MATRIX_STORE_MANAGER_ACCEPTANCE.md`.
- [x] SYS-6 Role matrix Tenant Manager vs Owner chrome PASS — roles/settings + RBAC/settings APIs require `organization.manage` with `tenant.manage`; see `SYS_6_ROLE_MATRIX_TENANT_OWNER_ACCEPTANCE.md`.
- [x] SYS-6 Role matrix Channel/Circle/Platform packages PASS — `channel.read`/`channel.manage`, product isolation, scoped dashboards, platform tenant/suspend denials; see `SYS_6_ROLE_MATRIX_NETWORK_ACCEPTANCE.md`.
- [x] SYS-6 Role matrix Member Consumer journey PASS — store 「我的」anonymous denial + enroll continuity + memberCode/wallet proof; see `SYS_6_ROLE_MATRIX_MEMBER_ACCEPTANCE.md`.
- [x] SYS-7 Workflow versioning PASS — GET version steps, clone-from-published, publish v2, start with condition skip; see `SYS_7_WORKFLOW_VERSIONING_ACCEPTANCE.md`.
- [x] SYS-8 Cross-device Member resume PASS — resume API + Consumer 「我的」resume form (phone+memberCode+consent; no SMS OTP); see `SYS_8_MEMBER_RESUME_ACCEPTANCE.md`.
- [x] SYS-9 Management workflow version panel PASS — version list + step conditions + panel clone-publish; see `SYS_9_WORKFLOW_VERSION_PANEL_ACCEPTANCE.md`.
- [x] SYS-10 Workflow linear visual flow PASS — `@oneday/workflows` linear flow + Management visualization; see `SYS_10_WORKFLOW_LINEAR_FLOW_ACCEPTANCE.md`.
- [x] SYS-11 Platform provisioning failure trail PASS — honest failed/pending steps + fresh retry; see `SYS_11_PROVISIONING_FAILURE_TRAIL_ACCEPTANCE.md`.
- [x] SYS-12 Condition branch flow PASS — linear take/skip preview (not free-form drag graph); see `SYS_12_CONDITION_BRANCH_FLOW_ACCEPTANCE.md`.
- [x] SYS-13 Condition path preview PASS — sample-context apply/skip highlight (not free-form drag graph); see `SYS_13_CONDITION_PATH_PREVIEW_ACCEPTANCE.md`.
- [x] SYS-14 Draft authoring preview PASS — linear 上移/下移 + create-form live path preview (not free-form drag graph); see `SYS_14_DRAFT_AUTHORING_PREVIEW_ACCEPTANCE.md`.
- [x] SYS-15 Version panel linear reorder PASS — panel ↑↓ + clone-publish order (not free-form drag graph); see `SYS_15_VERSION_PANEL_REORDER_ACCEPTANCE.md`.
- [x] SYS-16 Linear flow JSON export PASS — honest linear serialize + clipboard (not free-form drag graph); see `SYS_16_LINEAR_FLOW_EXPORT_ACCEPTANCE.md`.
- [x] SYS-17 Structured Timeline Authoring — insert rails PASS — between-step「在此插入」+ duplicate (not free-form drag); see `SYS_17_INSERT_RAILS_ACCEPTANCE.md`.
- [x] SYS-18 Structured Timeline Authoring — condition card IA PASS — when-true/when-false equals-only cards (not free-form drag); see `SYS_18_CONDITION_CARD_ACCEPTANCE.md`.
- [x] SYS-19 Structured Timeline Authoring — start-context presets PASS — builtin + localStorage presets for path simulator (not free-form drag); see `SYS_19_START_CONTEXT_PRESETS_ACCEPTANCE.md`.
- [x] SYS-20 Structured Timeline Authoring — list DnD reorder PASS — spine list-native DnD (not free-form drag); see `SYS_20_LIST_DND_REORDER_ACCEPTANCE.md`.
- [x] SYS-21 Structured Timeline Authoring — closed-loop package PASS — 3-step conditional authoring on STA timeline (not free-form drag); see `SYS_21_STA_CLOSED_LOOP_ACCEPTANCE.md`.
- [x] SYS-22 ONE-CODE consumer landing PASS — `/c/one-code/[code]` resolve + delivery `landingPath`; see `SYS_22_ONE_CODE_LANDING_ACCEPTANCE.md`.
- [x] SYS-23 Management attribution menu discoverability PASS — `MANAGEMENT_MENU_CATALOG.attribution` → `/m/attribution`; see `SYS_23_ATTRIBUTION_MENU_ACCEPTANCE.md`.
- [x] SYS-24 Customer merge/transfer UX PASS — detail transfer/approve/merge via existing APIs; see `SYS_24_CUSTOMER_MERGE_TRANSFER_ACCEPTANCE.md`.
- [x] SYS-25 Generic external-actions catalog PASS — `/m/external-actions` list/create + menu IA; see `SYS_25_EXTERNAL_ACTIONS_ACCEPTANCE.md`.
- [x] SYS-26 Management orphan IA PASS — employee-process / AI / connectors / permission-audit in menu catalog; see `SYS_26_MANAGEMENT_ORPHAN_IA_ACCEPTANCE.md`.
- [x] SYS-27 S3 Role×IA depth PASS — Employee store-manager chrome package + desktop nav ≥700px; Platform product homes/switcher on `/p` `/ch` `/bc`; see `SYS_27_S3_ROLE_IA_ACCEPTANCE.md`.
- [x] SYS-28 Platform shell isolation PASS — channel/circle-only redirected off `/p/*`; honest no-platform-governance boundary; see `SYS_28_PLATFORM_SHELL_ISOLATION_ACCEPTANCE.md`.
- [x] SYS-29 AdminShell nav groups PASS — Management/Platform role-package section labels via menu `group`; see `SYS_29_ADMIN_NAV_GROUPS_ACCEPTANCE.md`.
- [x] SYS-30 Employee task inbox PASS — `/e/tasks` list via workbench API; menu 任务 deep-link; see `SYS_30_EMPLOYEE_TASK_INBOX_ACCEPTANCE.md`.
- [x] SYS-31 Employee customer directory PASS — scoped `/e/customers` list API+UI; menu 客户 deep-link; see `SYS_31_EMPLOYEE_CUSTOMER_DIRECTORY_ACCEPTANCE.md`.
- [x] SYS-32 External-actions lifecycle PASS — `PUT` update + `DELETE` soft-archive + Management edit/archive UX; see `SYS_32_EXTERNAL_ACTIONS_LIFECYCLE_ACCEPTANCE.md`.
- [x] SYS-33 Employee membership redeem PASS — `/e/memberships` first-class redeem + store-manager package deep-link; see `SYS_33_EMPLOYEE_MEMBERSHIP_REDEEM_ACCEPTANCE.md`.
- [x] SYS-34 Membership ledger + revoke PASS — Management ledger timeline + revoke API/UI; see `SYS_34_MEMBERSHIP_LEDGER_ACCEPTANCE.md`.
- [x] Phase-1 P1-A PASS — Batch-4 clean-tenant rehearsal extended with membership ledger/revoke chain; see `P1_A_COMMERCIAL_CLOSED_LOOP_ACCEPTANCE.md`.
- [x] Phase-1 P1-B PASS — `@oneday/session-client` SessionLogin promotion-grade baseline via `@oneday/ui`; see `P1_B_SESSION_LOGIN_ACCEPTANCE.md`.
- [x] Phase-1 P1-B ui-kit PASS — shared `@oneday/ui` `Table` + `Modal` primitives with token-based Design System CSS; adopted in Management `permission-audit` (dense audit list + evidence modal). Maps to matrix UI-01/UI-02/UI-03; typecheck+`pnpm build` 20/20, `pnpm test:unit` 8/8 files, Playwright `page-m-010` 2/2. See `evidence/P1-B-UI-KIT/ACCEPTANCE.md`.
- [x] Phase-1 P1-B consumer-shell PASS — shared `ConsumerStorefrontNav` in `@oneday/storefront-renderer` renders mobile-bottom + desktop-top nav from `--od-sf-nav-*` tokens (no raw hex); `ConsumerShell` deleted the per-page `consumer-shell.module.css` hex palette and reuses the shared renderer chrome for all Consumer routes. Maps to matrix UI-01/UI-02/C-02; typecheck+`pnpm build` 20/20, `pnpm test:unit` 9/9 files (43 tests), Playwright `p1-b-consumer-shell` 1/1 (390/768/1440) + `storefront-module-renderer` 1/1 regression. See `evidence/P1-B-CONSUMER-SHELL/ACCEPTANCE.md`.
- [x] Phase-1 P1-B employee-shell PASS — shared `EmployeeWorkNav` + `EmployeeNavItem` in `@oneday/ui` renders mobile-bottom + desktop-sidebar nav from `var(--od-*)` foundation tokens (no raw hex) and draws menu-DTO items/active/context/mode/store-manager; `EmployeeBottomNav` deleted the per-page `employee-bottom-nav.module.css` hex palette and all Employee routes inherit the shared shell. Maps to matrix UI-01/UI-02/E-02; typecheck+`pnpm build` 20/20, `pnpm test:unit` 10/10 files (45 tests), Playwright `p1-b-employee-shell` 1/1 (390/768/1440) + workbench 2/2 + membership-redeem 1/1 + consumer-shell 1/1 regressions. See `evidence/P1-B-EMPLOYEE-SHELL/ACCEPTANCE.md`.
- [x] Phase-1 P1-B management-shell PASS — shared `@oneday/ui` `AdminShell` chrome in `@oneday/design-tokens` foundation.css made fully token-driven (`var(--od-*)` + `color-mix`, no raw hex); Management + Platform (incl channel/circle product modes) shells inherit; nav groups + active link render across 390/768/1440. Maps to matrix UI-01/UI-02/M-01; typecheck+`pnpm build` 20/20, `pnpm test:unit` 11/11 files (47 tests), Playwright `p1-b-management-shell` 2/2 + `sys-29` 1/1 + `sys-28` 1/1 + `sys-27` 1/1 + `page-m-010` 2/2 regressions. See `evidence/P1-B-MANAGEMENT-SHELL/ACCEPTANCE.md`.
- [x] Phase-1 P1-B platform-shell PASS — retired the last raw-hex fallbacks in the Platform product shell chrome (`platform-shell.module.css` mode-switcher hover/active and `platform-product-home.module.css` `.boundary`/`.switcher`/`.actions`/color-mix) so the Platform admin shell draws its whole palette from the shared `var(--od-*)` foundation tokens / `color-mix()`, same single-source palette as Consumer/Employee/Management. Maps to matrix UI-01/UI-02/P-01; typecheck+`pnpm build` 20/20, `pnpm test:unit` 12/12 files (49 tests), Playwright `p1-b-platform-shell` 1/1 (390/768/1440). See `evidence/P1-B-PLATFORM-SHELL/ACCEPTANCE.md`.
- [x] Phase-1 P1-B sync-converge + content-chain PASS — content `approve()` now emits `content.published.v1` in the same transaction (was silent) closing the approve→place→Consumer event chain; Management 内容中心 subscribes the `content` sync topic via `useTenantSync` for live convergence (SY-01); per-item honest convergence line (已生效 / 已审批未投放 / 尚未发布, M-05/CT-02); page-builder surfaces `published_at` as publish-effectiveness evidence (M-03/SF-02). New `tests/p1-b-content-sync.test.mjs` 1/1 (fresh tenant: approve→content.published.v1→content topic→`/sync/changes`→place→Consumer readable); typecheck+`pnpm build` 20/20, `pnpm test:unit` 12/12, regressions batch-2-content-placement + sys-6-content-placements + matrix-sync-gateway 3/3. See `evidence/P1-B-SYNC-CONVERGE/ACCEPTANCE.md`.
- [x] Phase-1 G1-PACKAGING PASS — G1 packaging milestone closed: local HUMAN PILOT sandbox boot-verified at HEAD `6b2dad9` (API health 200 database ready, worker 200, four webs 200, DB `oneday_human_pilot` migrated); typecheck 20/20, build 20/20, unit 12/12 (49). G1 READY declared for owner local full test. Runbook + checklist + deployment + limitations + recovery + walkthrough present. Maps to CHARTER §8 G1. Not a product-owner auto-sign. See `evidence/G1-PACKAGING/ACCEPTANCE.md`.
- [x] G1 product bar locked — PC+H5 100% Meituan copy; only `/m/workflows` custom; inventory `MEITUAN_PC_H5_PARITY_INVENTORY.md` (W0).
- [x] **G1-W1** `G1-R-MEITUAN-PC-NAV-HOME` PASS — Management PC 美团商家端导航分组 + 商家中心工作台; see `evidence/G1-MEITUAN-PARITY/W1/ACCEPTANCE.md`.
- [x] **G1-W2** `G1-R-MEITUAN-H5-NEARBY-STORE` PASS — Consumer H5 附近/商家页对标美团 App; see `evidence/G1-MEITUAN-PARITY/W2/ACCEPTANCE.md`.
- [x] **G1-W3** `G1-R-MEITUAN-PC-STORE-GOODS` PASS (首刀) — Management 门店/商品美团文案+概况条; see `evidence/G1-MEITUAN-PARITY/W3/ACCEPTANCE.md`.
- [x] **G1-W4** `G1-R-MEITUAN-EMPLOYEE-WORKBENCH` PASS (首刀) — Employee 美团商家 App 工作台（今日经营概览条 + 常用功能宫格 + 任务区），真实 workbench 数据 + 既有路由深链; see `evidence/G1-MEITUAN-PARITY/W4/ACCEPTANCE.md`.
- [x] **G1-W5** `G1-R-MEITUAN-PC-COMMERCE-SKELETON` PASS (首刀) — Management PC 订单·评价·营销骨架（`/m/orders` `/m/reviews` `/m/marketing`，MPC-04/05/07）: migration 055 + `ManagementCommerce` 只读 API（tenant+store 隔离）+ 本地 seed；菜单新增 orders/reviews/marketing。typecheck 20/20、build 20/20、`page-m-commerce` L2 隔离 PASS、menu-dto 17/17、sys-29/sys-6 更新 8/8。见 `evidence/G1-MEITUAN-PARITY/W5/ACCEPTANCE.md`。
- [x] **G1-W6** `G1-R-CHANNEL-AGENT-GEO` PASS (首刀) — Platform PC 省市区代理（MP-01~03, R5）: migration 056 + `PlatformAgentService/Controller`（`/api/v1/platform/agents` 树/区域/代理归属 + `/p/agents` UI）; `/ch/dashboard` 代理商后台商户队列新增归属行。typecheck 20/20、build 20/20、`page-p-agents` L2 隔离 PASS、menu-dto 17/17、sys-6/sys-29/sys-28 7/7、page-p-004+channel-001 2/2。见 `evidence/G1-MEITUAN-PARITY/W6/ACCEPTANCE.md`。
- [x] **G1-W∞-1** `G1-R-AGENT-DEEP-OPS` PASS (首刀) — Platform PC 省市区代理深层运营（结算/配额/审批，MP-03 深层）: migration 057（agent_quotas/agent_settlements/agent_onboarding_approvals）+ `PlatformAgentService/Controller`（`POST /:id/quota`、`/:id/settlements`、`settlements/:id/finalize`、`/:id/approvals`、`approvals/:id/decide` 通过自动归属）+ `/p/agents` 深层运营区（配额/结算/审批面板 + 结算记录 + 审批记录）。typecheck 20/20、build 20/20、`page-p-agent-ops` L2 PASS、`page-p-agents` 回归 1/1、menu-dto 17/17 + platform-shell-tokens 2/2、sys-6/sys-29/sys-28/page-p-004/channel-001 9/9。见 `evidence/G1-MEITUAN-PARITY/WINF/ACCEPTANCE.md`。
- [x] **TOOL-PHASE-0** `TOOL-PHASE-0-ENTRY-FUNNEL` PASS — L0+L1+L2 entry_funnel_events + platform_visible_traffic + nearby visibility + saabei；废弃 consumer_orders WIP. See `evidence/TOOL-PHASE-0/ACCEPTANCE.md`.
- [x] **TOOL-PHASE-1** `TOOL-PHASE-1-CLIENT-EMIT-BOARD` PASS — Consumer emit visit/dwell/jump/share + Management `/m/entry-funnel` 模块命名看板 + 设置「全平台可见引流」. See `evidence/TOOL-PHASE-1/ACCEPTANCE.md`.
- [x] **TOOL-PHASE-2** TOOL-PHASE-2-CIRCLE-DUAL-IDENTITY PASS — 商圈单独页双身份：migration 059 + consumer /c/circles + management /m/circles 创建/邀约/申请. See evidence/TOOL-PHASE-2/ACCEPTANCE.md.
- [x] **TOOL-PHASE-3** TOOL-PHASE-3-L2-INDUSTRY-TEMPLATES PASS — L2 module_impression 去重曝光 + consult_click + 餐饮/美业/零售行业模板（只解读痕迹）. See evidence/TOOL-PHASE-3/ACCEPTANCE.md.
- [x] **TOOL-PHASE-4** TOOL-PHASE-4-DIY-INTERPRET PASS — DIY query + interpret-only AI（只解读 L0–L2）. See evidence/TOOL-PHASE-4/ACCEPTANCE.md.
- [x] **TOOL-PHASE-5** TOOL-PHASE-5-SAVED-VIEWS PASS — migration 060 saved DIY views + board save/load/delete. See evidence/TOOL-PHASE-5/ACCEPTANCE.md.
- [x] **TOOL-PHASE-6** TOOL-PHASE-6-L2-COMPLETENESS PASS — one-code/circle/share L2 emit + sharePairing. See evidence/TOOL-PHASE-6/ACCEPTANCE.md.
- [x] **G1-W∞-3** `G1-R-HANDOFF-CONFIRM` PASS — `/c/actions` 外链确认 densify（平台预览+诚实免责+jump_confirm surface）. See evidence/G1-MEITUAN-PARITY/WINF3/ACCEPTANCE.md.
- [x] **G1-W∞-4** `G1-R-ATTRIBUTION-DEEP` PASS — `/m/attribution` densify + entry-funnel cross-link. See evidence/G1-MEITUAN-PARITY/WINF4/ACCEPTANCE.md.
- [x] **G1-W∞-5** `G1-R-CIRCLES-DENSIFY` PASS — Consumer `/c/circles` 行业 chips+排序+双身份分区. See evidence/G1-MEITUAN-PARITY/WINF5/ACCEPTANCE.md.
- [x] **G1-W∞-6** `G1-R-CHANNEL-AGENT-DASH` PASS — `/ch/dashboard` filters + agent cross-link. See evidence/G1-MEITUAN-PARITY/WINF6/ACCEPTANCE.md.
- [x] **G1-W∞-7** `G1-R-SHARE-LANDING` PASS — `/c/share/[code]` densify. See evidence/G1-MEITUAN-PARITY/WINF7/ACCEPTANCE.md.
- [x] **G1-W∞-8** `G1-R-EMPLOYEE-SHARE` PASS — `/e/share` tool-path densify. See evidence/G1-MEITUAN-PARITY/WINF8/ACCEPTANCE.md.
- [x] **G1-W∞-9** `G1-R-CONSUMER-ENTRY` PASS — `/c/entry` densify. See evidence/G1-MEITUAN-PARITY/WINF9/ACCEPTANCE.md.
- [x] **G1-W∞-10** `G1-R-PROFILE-SEARCH` PASS — 「我的」+搜索 tool densify. See evidence/G1-MEITUAN-PARITY/WINF10/ACCEPTANCE.md.
- [x] **G1-W∞-11** `G1-R-DISCOVERY-NEARBY` PASS — `/c/discovery` densify. See evidence/G1-MEITUAN-PARITY/WINF11/ACCEPTANCE.md.
- [x] **G1-W∞-12** `G1-R-GROUP-BUY-MEMBERSHIP` PASS — group-buy+membership densify + /m/settings tool links. See evidence/G1-MEITUAN-PARITY/WINF12/ACCEPTANCE.md.
- [x] **G1-W∞-13** `G1-R-MENU-STORE-HOME` PASS — menu+store home densify. See evidence/G1-MEITUAN-PARITY/WINF13/ACCEPTANCE.md.
- [x] **G1-W∞-14** `G1-R-SERVICE-PROFILE` PASS — `/c/services/[id]` + store `/profile` densify（确认前往替换去购买；非本平台下单）. See evidence/G1-MEITUAN-PARITY/WINF14/ACCEPTANCE.md.
- [x] **G1-W∞-15** `G1-R-PROCESS-TASK-PATH` PASS — `/c/processes` 服务过程 + offer_compare 不在此下单 + `/e/tasks` 工具身份. See evidence/G1-MEITUAN-PARITY/WINF15/ACCEPTANCE.md.
- [x] **G1-W∞-16** `G1-R-EMPLOYEE-SURFACES` PASS — employee ME-03..07 densify + 第三方结果单号. See evidence/G1-MEITUAN-PARITY/WINF16/ACCEPTANCE.md.
- [x] **G1-W∞-17** `G1-R-WORKBENCH-COMMERCE` PASS — workbench/leads/nurture + `/m/orders|reviews|marketing` + circle detail densify. See evidence/G1-MEITUAN-PARITY/WINF17/ACCEPTANCE.md.
- [x] **G1-W∞-18** `G1-R-ADMIN-DASHBOARDS` PASS — Management/Platform 工作台 densify + `/c/profile` 工具身份. See evidence/G1-MEITUAN-PARITY/WINF18/ACCEPTANCE.md.
- [x] **G1-W∞-19** `G1-R-TOOL-PATH-GAPS` PASS — 车终剩的 `/m/offers`、`/m/stores` 「美团商家端 PC」眉标改挂推广员工具身份（商品/套餐入口、门店入口）+ 诚实无销售边界；全仓扫描确认无残留美团商家眉标。Text-only；typecheck+build 27 路由 PASS、G1-W∞ 17/17 PASS。见 `evidence/G1-MEITUAN-PARITY/WINF19/ACCEPTANCE.md`。
- [x] **G1-W∞-20** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·第三方平台命名一致性（扫呗/外链显式）：shared `@oneday/storefront-renderer` 增加 `storefrontPlatformName/MarkClass` + 扫呗 glyph + `--od-sf-platform-saabei` mark；`/c/stores` group-buy/menu `platformName`+徽标、`/c/services` `PlatformOffer.platformType` 含 `'saabei'` + `platformLabel` 扫呗显式。诚实边界全保留（不在此下单/非本平台下单）；仍无本平台下单。Text/copy+renderer，无 schema/DB。typecheck+build 20/20、`g1-winf*.test.mjs` 18/18、单测 47 passed（2 个 pre-existing token 失败照旧）。见 `evidence/G1-MEITUAN-PARITY/WINF20/ACCEPTANCE.md`。
- [x] **G1-W∞-21** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·工具身份收尾：① 管理端去「商家中心」货架经营痕迹（sidebar `product="推广员工具"` + 工作台/loading/forbidden + 快捷入口 desc + product-switcher 标签）；② `MANAGEMENT_MENU_CATALOG` 六项改挂入口/痕迹/工作流（门店管理→门店入口、商品管理→商品/套餐入口、订单中心→订单痕迹、店铺装修→入口页装修、商家设置→工具设置、经营建议→作业建议）；③ 消费者第三方命名一致性补漏（service/profile/process/group-buy/menu/会员/历史 `美团/抖音/扫呗` 显式，沿用 W∞-20）；④ 商圈仪表「订单」→「入口转化」、`/c/entry` 落地方案「成交在美团/抖音/扫呗等外部平台完成」。Honest no-native-checkout 全保留；无 schema/DB/API 变更。typecheck+build 20/20、`g1-winf*.test.mjs` 19/19、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。同步更新 W∞-12/10 断言 + SYS-26。见 `evidence/G1-MEITUAN-PARITY/WINF21/ACCEPTANCE.md`。
- [x] **G1-W∞-22** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·订单痕迹语裁定档：`/m/orders` 订单中心→订单痕迹（标题/eyebrow/loading/forbidden/error/empty 全对齐 W∞-21 菜单 label），汇总条原生收单/履约度量改诚实档案口径（档案记录数/状态为有效的记录/记录金额参考/涉及门店），补强不碰钱·不碰销售·非本平台下单边界。Text-only，无 schema/DB/API。typecheck+build 20/20、`g1-winf*.test.mjs` 25/25、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。随动更新 W∞-17 断言。见 `evidence/G1-MEITUAN-PARITY/WINF22/ACCEPTANCE.md`。
- [x] **G1-W∞-23** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·入口/档案页标题与状态口径对齐：`/m/offers` 页头/状态 `商品管理→商品/套餐入口`、`/m/stores` `门店管理→门店入口`（均对齐导航与 W∞-19 眉标）、`/m/marketing` `营销中心→营销活动`（对齐导航）、`/m/reviews` 导航+页头 `评价管理→评价档案`（`menu.ts` label 同步）。四页诚实无销售边界全保留（不在此售卖下单/不代替平台下单支付/不接第三方评价流/不接实时投放/非本平台成交）。Text/copy+导航 label，无 schema/DB/API。typecheck+build 20/20、`g1-winf*.test.mjs` 30/30、menu 相关 .test.mjs 11/11、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。随动更新 `tests/e2e/management-stores.spec.ts` forbidden 断言。见 `evidence/G1-MEITUAN-PARITY/WINF23/ACCEPTANCE.md`。
- [x] **G1-W∞-24** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·工具身份收尾·顾客跟进：`/m/customers` + `/m/customers/[id]`（MPC-06 顾客/CRM）去 store-ops-ownership 话术（eyebrow `客户资产→推广员工具 · 客户跟进`、title `用客户分层驱动每一次经营动作→按来源与分层组织推广跟进作业`、loading/forbidden/error/empty/back-link/aria 全改 `客户跟进`、去掉 `客户资产`/`客户经营链路`/`经营管理权限`），保留实名授权跟进/来源分层/归属与导出审批工具工作流；随动更新 `management-customers` + `commercial-ui-foundation` e2e 断言。Text/copy-only，无 schema/DB/API，不复活本平台下单/收单。typecheck+build 20/20、`g1-winf*.test.mjs` 34/34、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。见 `evidence/G1-MEITUAN-PARITY/WINF24/ACCEPTANCE.md`。
- [x] **G1-W∞-25** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·工具身份收尾·管理页眉标对齐：13 页残留 merchant/store-ops 眉标统一 `推广员工具 · <菜单label>`——入口页装修(page-builder)/营销内容(content)/来源归因漏斗(funnels[id])/角色权限(roles-permissions)/操作审计(permission-audit)/工具设置(settings)/连接配置(connectors)/员工管理(organization-employees)/作业建议(ai-suggestions)/工作流整合(workflows)/会员中心(memberships)/员工表现(employee-process-performance)/外链服务(external-actions)；`/m/funnels/[id]` 去 `经营漏斗/经营结果`、`/m/ai-suggestions` 去 `经营判断`、`/m/attribution` hint 去 `经营链路`。Text/copy/aria-only，无 schema/DB/API，不复活本平台下单/收单。新增 tests/g1-winf25-management-tool-eyebrow-alignment.test.mjs 5/5，随动更新 g1-winf12 + management-ai-suggestions + sys-25-external-actions 断言。typecheck+build 20/20（management-web 27 routes）、`g1-winf*.test.mjs` 39/39、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。见 `evidence/G1-MEITUAN-PARITY/WINF25/ACCEPTANCE.md`。
- [x] **G1-W∞-26** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·工具身份收尾·`/m/settings` 状态口径对齐：title/loading/forbidden/error/保存按钮/成功提示 `经营设置/经营规则/经营权限` → `工具设置/工具规则/工具授权`（`可审计经营规则→可审计工具规则`、`正在加载经营设置→工具设置`、`无权查看租户经营设置→工具设置`、`经营设置暂不可用→工具设置暂不可用`、`保存经营设置→保存工具设置`、`经营设置已保存→工具设置已保存`），对齐 W∞-25 眉标 `推广员工具 · 工具设置` 与菜单「工具设置」。诚实无销售边界全保留。Text/copy/aria-only，无 schema/DB/API，不复活本平台下单/收单。新增 tests/g1-winf26-settings-tool-state-copy.test.mjs 4/4，随动更新 tests/e2e/management-settings.spec.ts（heading+按钮）。typecheck+build 20/20（management-web 27 routes）、`g1-winf*.test.mjs` 42/42、menu 相关 4/4、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。见 `evidence/G1-MEITUAN-PARITY/WINF26/ACCEPTANCE.md`。
- [x] **G1-W∞-27** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·工具身份收尾·管理/员工「经营管理」状态口径对齐：残留 store-ops `经营管理/经营权限/经营数据/客户资产/门店管理` 全改挂 `推广员工具 · 工具权限/工具授权/工具数据/客户跟进/门店入口`（workflows/attribution/organization-employees/ai-suggestions/employee-process-performance/permission-audit/roles-permissions/entry-funnel/circles/memberships/external-actions/stores/content/page-builder 14 页 forbidden/loading 状态 + roles save note `具备工具授权` + `/m` 全局 forbidden/loading/error + 工作台门店快捷入口 `门店入口` + 员工核销空态 `推广员工具授权的账号` + API 概览建议 `客户跟进`）。Platform 渠道/商圈经营台按主人身份保留。Text/copy/aria-only，无 schema/DB/API，不复活本平台下单/收单。新增 tests/g1-winf27-tool-permission-state-copy.test.mjs 7/7，全仓扫描确认 management/employee App TSX 无 `经营管理` 残留。typecheck+build 20/20（management-web 27 routes）、`g1-winf*.test.mjs` 49/49、menu 相关 4/4、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。见 `evidence/G1-MEITUAN-PARITY/WINF27/ACCEPTANCE.md`。
- [x] **G1-W∞-28** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·工具身份收尾·残留 `经营` store-ops 语裁定档：管理/员工工具身份面残留 `经营` 店务话术统一推广员工具身份（`/m` 404 `经营页面/经营功能→工具页面/推广员工具功能`、`/m/attribution` `经营证据→入口证据`/`入口与经营承接→入口分流与承接`、`/m/ai-suggestions` `经营异常→入口异常`、`/m/page-builder` `经营频道→入口频道`、`/m/offers` `商户经营后台登记→商户后台登记`、`/m/roles-permissions` `查看/管理租户经营→查看/管理租户工具`、`/m/customers/[id]` `经营异常→跟进异常`；员工 `loading` `正在准备经营工作台→正在准备推广员工具工作台`、`nurture` `客户经营队列→客户跟进队列`、`notification` `经营提醒→工具提醒`、`share-codes` `进入经营入口→进入工具入口`/`消费者经营入口→消费者入口`、`employee-profile` `查看/管理租户经营→工具`、`/e/store` `门店经营首页→门店入口首页`/`店长经营能力→店长入口能力`）。商圈/渠道网络身份 `经营` 按主人边界保留。Text/copy/aria-only，无 schema/DB/API，不复活本平台下单/收单。新增 tests/g1-winf28-tool-residual-ops-copy.test.mjs 15/15，随动更新 batch-2-offers/sys-27 e2e + batch-2-offer-operations/matrix-mg-g 断言。typecheck+build 20/20、`g1-winf*.test.mjs` 64/64、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。见 `evidence/G1-MEITUAN-PARITY/WINF28/ACCEPTANCE.md`。
- [x] **G1-W∞-29** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·工具身份收尾·残留 `顾客` 客户语裁定档：管理 `menu.ts` `MENU_GROUP_LABELS.customer` `顾客→客户` + customers nav label `顾客管理→客户跟进`（对齐 W∞-24 `/m/customers` 眉标 `推广员工具 · 客户跟进`）；管理工作台 `/m`（page.tsx）5 处 `顾客`/`顾客管理`/`今日顾客`/`顾客总量`/`顾客总数`→`客户`/`客户跟进`/`今日客户`/`客户总量`/`客户总数`；员工工作台 `/e/customers` 快捷入口 `label 顾客→客户`（对齐 desc `客户档案`）。Text/copy/导航 label，无 schema/DB/API，不复活本平台下单/收单；商圈/渠道网络身份未触碰。新增 tests/g1-winf29-customer-tool-copy.test.mjs 4/4，随动更新 tests/e2e/sys-29-admin-nav-groups.spec.ts + p1-b-management-shell.spec.ts（顾客→客户、顾客管理→客户跟进）。grep 全仓确认工具身份面 UI TSX 无 `顾客` 残留。typecheck+build 20/20、`g1-winf*.test.mjs` 68/68、menu 相关 7/7、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。见 `evidence/G1-MEITUAN-PARITY/WINF29/ACCEPTANCE.md`。
- [x] **G1-W∞-30** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标细部·工具身份收尾·管理/员工工具面残留 ONEDAY / 眉标前缀去除（7 页 eyebrow/hero 统一 `推广员工具 ·` 模式；`/m/customers/[id]` 眉标 `客户跟进全链路→推广员工具 · 客户跟进`）。Platform/Consumer 网络身份 ONEDAY / 按边界保留。Text/copy-only。新增 tests/g1-winf30-oneday-eyebrow-copy.test.mjs 4/4，`g1-winf*.test.mjs` 72/72。见 `evidence/G1-MEITUAN-PARITY/WINF30/ACCEPTANCE.md`。
- [x] **G1-W∞-31** `G1-R-TOOL-PATH-EXPERIENCE` PASS — 体验对标·统一工作流·管理通知中心（MPC-13 消息/通知 GAP close）: `GET /api/v1/management/notifications`（tenant.manage, fail-closed, 只读聚合租户范围内待推进：跟进异常 overdue tasks / 待审批 customer_ownership_transfer_approvals / 进行中工作流 workflow_instances，category 筛选，deepLink → /m/customers · /m/workflows）+ `/m/notifications` 页（推广员工具 · 通知中心 眉标 + 概况条 + 类型筛选 + 诚实边界，loading/forbidden/error/empty 全状态）+ `MANAGEMENT_MENU_CATALOG.notifications`（工作台分组，tenant.manage）。只读不改读状态、无 schema/DB migration（复用既有表）、不碰钱/销售、不复活本平台下单/收单。新增 tests/management-notifications.test.mjs 1/1（401/跨租户 403/tenant.manage 聚合/category 筛选/非法 400/低权限 customer.read 403），随动更新 tests/menu-dto.vitest.ts。typecheck 20/20、build 20/20（management-web 含 /m/notifications）、单测 47 passed（2 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF31/ACCEPTANCE.md`。
- [x] **G1-W∞-32** `G1-R-MEITUAN-H5-NEARBY-STORE` PASS — Consumer H5 发现页视觉/IA densify toward 美团 App（sticky 黄顶栏定位+搜索、下划线 Tab、72px 商家卡列表、灰底白卡密度）；诚实边界保留。tests/g1-winf32 3/3。见 `evidence/G1-MEITUAN-PARITY/WINF32/ACCEPTANCE.md`。
- [x] **G1-W∞-33** `G1-R-MEITUAN-H5-NEARBY-STORE` PASS — Consumer H5 门店页视觉/IA densify toward 美团 App（sticky 黄顶栏+封面 hero+营业中+导航/电话/分享+sticky 分区 Tab 锚点 storefront modules）；诚实边界保留。tests/g1-winf33 4/4。见 `evidence/G1-MEITUAN-PARITY/WINF33/ACCEPTANCE.md`。
- [x] **G1-W∞-34** `G1-R-EMPLOYEE-WORKBENCH` PASS — Employee H5 工作台视觉/IA densify toward 美团商家端（sticky 黄顶栏+头像 hero+icon 功能格+白卡面板+紧凑任务列表）；诚实边界保留。tests/g1-winf34 4/4。见 `evidence/G1-MEITUAN-PARITY/WINF34/ACCEPTANCE.md`。
- [x] **G1-W∞-35** `G1-R-MANAGEMENT-WORKBENCH` PASS — Management PC 工作台视觉/IA densify toward 美团商家端 PC（黄顶栏+icon 功能格+白卡面板+自定义指标）；诚实边界保留。tests/g1-winf35 4/4。见 `evidence/G1-MEITUAN-PARITY/WINF35/ACCEPTANCE.md`。
- [x] **G1-W∞-36** `G1-R-PLATFORM-DASHBOARD` PASS — Platform PC 总览视觉/IA densify toward 美团平台端（黄顶栏+icon 功能格+白卡面板+自定义指标）；诚实边界保留。tests/g1-winf36 4/4。见 `evidence/G1-MEITUAN-PARITY/WINF36/ACCEPTANCE.md`。
- [x] **G1-W∞-37** `G1-R-CHANNEL-CIRCLE-DASHBOARD` PASS — Channel `/ch/dashboard` + Circle `/bc/dashboard` 视觉/IA densify（黄顶栏+icon 功能格+白卡面板）；诚实边界保留。tests/g1-winf37 4/4。见 `evidence/G1-MEITUAN-PARITY/WINF37/ACCEPTANCE.md`。
- [x] **G1-W∞-38** `G1-R-MANAGEMENT-STORES` PASS — Management `/m/stores` 视觉/IA densify（黄顶栏+灰底白卡门店卡+概况条）；诚实边界保留。tests/g1-winf38 3/3。见 `evidence/G1-MEITUAN-PARITY/WINF38/ACCEPTANCE.md`。
- [x] **G1-W∞-39** `G1-R-MANAGEMENT-OFFERS` PASS — Management `/m/offers` 视觉 densify；tests/g1-winf39 3/3。见 WINF39。
- [x] **G1-W∞-40** `G1-R-MANAGEMENT-CUSTOMERS-VISUAL` PASS — Management `/m/customers` + `/m/customers/[id]`（MPC-06 顾客/CRM）视觉/IA densify toward 美团商家端 PC：黄顶栏（`推广员工具 · 客户跟进` 列表 / `推广员工具 · 客户跟进 · <分层>` 明细）+ 灰底白卡 + heroCard 白卡（h1 标题 + 诚实描述）+ 白卡面板（筛选/批量归属/表格/操作/来源/归属/订单/任务/时间线）；移除页面级 AdminPageHeader/Card；保留全部工具身份与诚实边界（实名授权跟进、来源分层、归属与导出审批、非本平台下单）。无 schema/DB/API。tests/g1-winf40 6/6，随动更新 W∞-24/30 校验；typecheck+build PASS（management-web 28 routes）、`g1-winf*.test.mjs` 107/107、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF40/ACCEPTANCE.md`。
- [x] **G1-W∞-41** `G1-R-MANAGEMENT-MEMBERSHIPS-VISUAL` PASS — Management `/m/memberships`（MPC-08 会员/会员与权益）视觉/IA densify toward 美团商家端 PC：黄顶栏（`推广员工具 · 会员中心` + 刷新）+ 灰底白卡 + heroCard 白卡（h1 标题 + 诚实描述）+ 概况条 summary（在册会员/权益项）+ 白卡会员卡 panel（发放/吊销时间线 ledger）；移除页面级 AdminPageHeader/Card；保留全部工具身份与诚实边界（会员码核销、member_benefit_ledger 时间线、不伪造第三方投放或本平台成交、推广员工具授权范围）与全部 e2e hooks。无 schema/DB/API。新增 tests/g1-winf41-management-memberships-visual.test.mjs 4/4，随动更新 W∞-25（memberships 去 eyebrow 断言，改由顶栏承载）。typecheck+build PASS（management-web 28 routes）、`g1-winf*.test.mjs` 111/111、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF41/ACCEPTANCE.md`。
- [x] **G1-W∞-42** `G1-R-MANAGEMENT-COMMERCE-VISUAL` PASS — Management `/m/orders`（订单痕迹 MPC-04）+ `/m/reviews`（评价档案 MPC-05）+ `/m/marketing`（营销活动 MPC-07）视觉/IA densify toward 美团商家端 PC：黄顶栏 `topBar`（承载既有 eyebrow + 「刷新」）+ 灰底白卡（背景 #f5f5f5）+ heroCard 白卡（h1 标题 + 诚实描述）+ 白卡概况条 summaryStrip + 白卡 row 列表；移除页面级 AdminPageHeader/eyebrow=。继承 W∞-22/23 语裁定档（不接美团实时订单/评价/投放、不包含本平台收款、非本平台下单/成交、source=local），新增 e2e `data-testid`（management-orders/reviews/marketing）。无 schema/DB/API，不复活本平台下单/收单。新增 tests/g1-winf42-management-commerce-visual.test.mjs 4/4，随动更新 g1-winf22 + g1-winf23（订单/评价/营销 `eyebrow=`/`title=` prop → 顶栏 + `<h1>` 断言）。typecheck+build PASS（management-web 28 routes）、`pnpm build` 20/20、`g1-winf*.test.mjs` 115/115、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF42/ACCEPTANCE.md`。
- [x] **G1-W∞-43** `G1-R-MANAGEMENT-SETTING-PEOPLE-CONTENT-VISUAL` PASS — Management 员工·权限（MPC-10）`/m/organization-employees` + `/m/roles-permissions`、营销内容（MPC-11）`/m/content`、入口页装修（MPC-11）`/m/page-builder`、工具设置（MPC-12）`/m/settings` 视觉/IA densify toward 美团商家端 PC：黄顶栏 `topBar`（`推广员工具 · 员工管理/角色权限/营销内容/入口页装修/工具设置` + 刷新）+ 灰底白卡（heroCard h1 + 诚实描述）+ 白卡概况条 summaryStrip（数据列表页）+ 白卡面板；移除页面级 AdminPageHeader/Card/eyebrow=。保留全部工具身份与诚实边界（不另造第二套 API、高风险权限二次确认、渠道无授权不伪造发送、共用一套 Storefront 绑定、不碰销售成交、不含支付金额与第三方订单成功）与全部 e2e hooks/data-testid（management-organization-employees/roles-permissions/content/page-builder/settings）与关键交互（办理离职/查看与变更/创建草稿/进入装修/保存工具设置等）。无 schema/DB/API，不复活本平台下单/收单。新增 tests/g1-winf43-management-setting-people-content-visual.test.mjs 5/5，随动更新 g1-winf25（org/roles/content/builder/settings 去 `eyebrow=` 断言）+ g1-winf26（settings `eyebrow=` prop → `topBarTitle` + `<h1>` 断言）。typecheck+build PASS（management-web 28 routes）、`pnpm build` 20/20、`g1-winf*.test.mjs` 120/120、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF43/ACCEPTANCE.md`。
- [x] **G1-W∞-44** `G1-R-MANAGEMENT-ANALYTICS-DAILY-REPORT` PASS — Management 数据/经营分析（MPC-09 GAP→toward PARITY）美团经营日报密度：新增 `GET /api/v1/management/entry-funnel/daily-report?days=N`（`tenant.manage`，只读真实 L0–L2 `entry_funnel_events`）返回今日指标卡（观看/访问/跳转/停留/分享 + 模块曝光/咨询点击/跳转确认/分享发出码/进店率/出站率）+ `vsPrior` 今日对比前一窗环比 + `daily[]` 逐日时间序列 + 诚实 disclaimer；`/m/analytics` 美团商家端 PC 黄顶栏 `推广员工具 · 数据/经营分析` + 窗口 7/30/90 天 + 刷新 + 灰底白卡 heroCard + 概况条 summaryStrip（今日指标含环比）+ 白卡面板（漏斗 + L2 动作 + 逐日明细表）+ loading/forbidden/error/empty 全状态 + `data-testid="management-analytics"` + honest note 深链 `/m/entry-funnel` `/m/attribution`；菜单新增 `analytics`（`数据/经营分析`，`group: orders`，`requireAny: ['tenant.manage']`）。禁止假 BI：仅 L0–L2 入口痕迹叠加每日密度，不接美团实时、不含支付成交、不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf44-mpc-09-analytics-daily-report.test.mjs 6/6，随动更新 tests/menu-dto.vitest.ts（tenant.manage 列表加入 analytics）。typecheck PASS（api/contracts/management-web）、`pnpm build` 20/20（management-web 29 routes 含 /m/analytics）、`g1-winf*.test.mjs` 126/126、menu 相关 11/11、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF44/ACCEPTANCE.md`。
- [x] **G1-W∞-45** `G1-R-MANAGEMENT-COMMERCE-DEEP` PASS — Management 订单·评价·营销 真实数据深页密度 densify（MPC-04/05/07，禁止假 BI）承接 W∞-42(静态概况+行列表) 与 W∞-44：三页新增白卡分布面板，全部由已抓取真实档案行现场推导——`/m/orders`(订单痕迹 MPC-04) 状态分布(有效/待支付/已退款/已取消)+门店分布(按 store_name)+来源分布(按 source)；`/m/reviews`(评价档案 MPC-05) 评分分布(5★~1★)+门店分布；`/m/marketing`(营销活动 MPC-07) 状态分布(投放中/草稿/已暂停/已结束)+类型分布(优惠券/套餐Offer/内容投放)。宽度百分比 `b.value/orders.length` 由真实行推导，空数据「暂无记录/暂无评价/暂无活动」。共享 `_commerce.module.css` 新增`.panel/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty` 灰底白卡+黄渐变色条(线性 #ffd100→#f0a500)，≤900px 单列堆叠。诚实边界全保留(源 source=local，不接美团实时/不伪造第三方评分或成交/不包含本平台收款/非本平台下单)；`data-testid` + loading/forbidden/error/empty 全状态 + summaryStrip/honest 底注全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf45-management-commerce-deep.test.mjs 5/5。typecheck PASS、management build PASS、`pnpm build` 20/20、`g1-winf*.test.mjs` 131/131、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF45/ACCEPTANCE.md`。
- [x] **G1-W∞-46** `G1-R-MANAGEMENT-CUSTOMER-MEMBER-DEEP` PASS — Management 顾客·会员 真实数据深页密度 densify（MPC-06/08，禁止假 BI）承接 W∞-45(订单·评价·营销深页密度)：`/m/customers`(客户跟进 MPC-06) 新增白卡分布面板 `aria-label="客户跟进分布"`——分层分布(活跃/复购/沉睡，按 segment)+归属分布(按 owner name)+标签分布(跨客户 tags 频次降序)，宽度百分比 `b.value/customers.length` 由真实行推导，空数据「暂无记录/暂无标签」，分层标签与筛选下拉口径一致；`/m/memberships`(会员中心 MPC-08) 新增白卡分布面板 `aria-label="会员分布"`——门店分布(按 store_name，未绑定门店兜底)+入会时间分布(按 joined_at 年月升序)，宽度百分比 `b.value/enrollments.length` 由真实行推导，空数据「暂无记录」。两页各自 `page.module.css` 新增 `.panel/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty` 灰底白卡+黄渐变色条(线性 #ffd100→#f0a500)，≤900px 单列堆叠(与 W∞-45 共享视觉语言)。诚实边界全保留(源 source=local，不接美团实时/不伪造第三方评分或成交/不包含本平台收款/非本平台下单)；工具身份眉标+loading/forbidden/error/empty 全状态+e2e hooks+实名授权跟进/member_benefit_ledger 时间线全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf46-management-customer-member-deep.test.mjs 5/5。typecheck PASS、management build PASS、`pnpm build` 20/20、`g1-winf*.test.mjs` 136/136、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF46/ACCEPTANCE.md`。
- [x] **G1-W∞-47** `G1-R-MANAGEMENT-OFFERS-DEEP` PASS — Management 商品/套餐入口 真实数据深页密度 densify（MPC-03，禁止假 BI）承接 W∞-45/46：`/m/offers` 新增白卡分布面板 `aria-label="商品套餐分布"`——套餐可见分布(按 item.status)+门店分布(每门店套餐数)+平台入口分布(按 offer.platform 映射 美团/抖音/扫呗/直接外链)+Offer 状态分布(展示中/已停用)+价格带分布(按真实 offerPrice 分桶 ¥0-100/¥100-300/¥300+ 降序)，宽度百分比 `b.value/total` 由真实行推导，空数据「暂无记录」。`page.module.css` 新增 `.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty` 灰底白卡+黄渐变色条，≤900px 单列堆叠。诚实边界全保留(源 source=local，新增 honest 底注：不接美团/抖音实时价格·不伪造第三方评分或成交·不包含本平台收款·非本平台下单)；工具身份眉标+loading/forbidden/error 全状态+既有新建套餐/新增 Offer/停用启用交互全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf47-management-offers-deep.test.mjs 4/4，随动更新 g1-winf39(offers honest 边界 `本平台下单`→`非本平台下单`)。typecheck PASS、management build PASS(29 routes 含 /m/offers)、`pnpm build` 20/20、`g1-winf*.test.mjs` 140/140、单测 47 passed(2 个 pre-existing token 失败照旧)、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF47/ACCEPTANCE.md`。
- [x] **G1-W∞-48** `G1-R-MANAGEMENT-EMPLOYEES-DEEP` PASS — Management 员工管理 真实数据深页密度 densify（MPC-10，禁止假 BI）承接 W∞-45/46/47：`/m/organization-employees` 新增白卡分布面板 `aria-label="员工分布"`——员工状态分布(按 employee.status 在岗/已离岗·停用)+组织员工分布(按员工 organization_id 归属组织名，未归属组织兜底)+待办负载分布(按真实 open_task_count 分桶 无待办/轻负载1-5/重负载6+)+客户负载分布(按真实 active_customer_count 分桶 无客户/少量客户1-10/大量客户11+)+待接受邀请分布(按邀请 organization_id 归属组织名)，宽度百分比 `b.value/total` 由真实组织/员工/邀请档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条(线性 #ffd100→#f0a500)，≤900px 单列堆叠(与 W∞-45/46/47 共享视觉语言)。诚实边界全保留(源 source=local，新增 honest 底注 不接美团/抖音实时人事或绩效·不伪造第三方评分或成交·不包含本平台收款·非本平台下单)；工具身份眉标+heroCard+summaryStrip+loading/forbidden/error 全状态+既有创建组织/商户/门店/创建邀请/办理离职交互+`不另造第二套 API`/`租户工具授权范围` 全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf48-management-employees-deep.test.mjs 4/4。typecheck PASS、management build PASS(29 routes 含 /m/organization-employees)、`pnpm build` 20/20、`g1-winf*.test.mjs` 144/144、单测 47 passed(2 个 pre-existing token 失败照旧)、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF48/ACCEPTANCE.md`。
- [x] **G1-W∞-49** `G1-R-MANAGEMENT-ROLES-PERMISSIONS-DEEP` PASS — Management 角色权限 真实数据深页密度 densify（MPC-10，禁止假 BI）承接 W∞-45/46/47/48：`/m/roles-permissions` 新增白卡分布面板 `aria-label="角色权限分布"`——成员负载分布(按真实 role.member_count 分桶 无成员/轻量1-5/活跃6+)+权限规模分布(按真实 role.permissions.length 分桶 无权限/基础1-5/中等6-10/全量11+)+权限项分布(跨全部角色统计每个权限 code 被引用次数，按 permissionNames 映射中文名，频次降序)+高风险权限持有分布(仅统计 sensitive 集合内权限在各角色中的持有数)，宽度百分比 `b.value/total` 由真实角色档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条(线性 #ffd100→#f0a500)，≤900px 单列堆叠(与 W∞-45/46/47/48 共享视觉语言)。诚实边界全保留(源 source=local，新增 honest 底注 不接美团/抖音实时人事或绩效·不伪造第三方评分或成交·不包含本平台收款·非本平台下单)；工具身份眉标 `推广员工具 · 角色权限`+heroCard+summaryStrip+loading/forbidden/error 全状态+创建角色/查看与变更/高风险二次确认/审计写入全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf49-management-roles-permissions-deep.test.mjs 4/4。typecheck PASS、management build PASS(29 routes 含 /m/roles-permissions)、`pnpm build` 20/20、`g1-winf*.test.mjs` 148/148、单测 47 passed(2 个 pre-existing token 失败照旧)、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF49/ACCEPTANCE.md`。
- [x] **G1-W∞-50** `G1-R-MANAGEMENT-CONTENT-DEEP` PASS — Management 营销内容 真实数据深页密度 densify（MPC-11，禁止假 BI）承接 W∞-45/46/47/48/49（订单·评价·营销/顾客·会员/商品·套餐入口/员工管理/角色权限深页），把 /m/content 营销内容面补上「分布洞察」：`/m/content`(营销内容 MPC-11) 新增白卡分布面板 `aria-label="营销内容分布"`——内容状态分布(按真实 item.status 已审批/草稿/已发布)+内容类型分布(按真实 item.kind 图文/公告/未分类)+渠道分发登记分布(跨全部内容统计每个分发渠道 code 被登记次数，按 channelLabel 映射中文名，频次降序)+投放门店分布(跨全部内容统计每个 placements[].storeName 的投放次数，未绑定门店兜底)，宽度百分比 `b.value/total` 由真实内容/投放档案行推导，空数据「暂无记录/暂无登记/暂无投放」。`page.module.css` 新增 `.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条(线性 #ffd100→#f0a500)，≤900px 单列堆叠(与 W∞-45/46/47/48/49 共享视觉语言)。诚实边界全保留(源 source=local，新增 honest 底注 渠道分发仅登记待授权请求·未经第三方授权不伪造发送·不接美团/抖音实时投放·不包含本平台收款·非本平台下单)；工具身份眉标 `推广员工具 · 营销内容`+heroCard+summaryStrip+loading/forbidden/error 全状态+创建草稿/审批/登记渠道/投放到消费者门店全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf50-management-content-deep.test.mjs 4/4。typecheck PASS、management build PASS(29 routes 含 /m/content)、`pnpm build` 20/20、`g1-winf*.test.mjs` 152/152、单测 47 passed(2 个 pre-existing token 失败照旧)、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF50/ACCEPTANCE.md`。
- [x] **G1-W∞-51** `G1-R-MANAGEMENT-PAGE-BUILDER-DEEP` PASS — Management 入口页装修 真实数据深页密度 densify（MPC-11，禁止假 BI）承接 W∞-45/46/47/48/49/50（订单·评价·营销/顾客·会员/商品·套餐入口/员工管理/角色权限/营销内容深页），把 /m/page-builder 入口页装修面补上「分布洞察」：`/m/page-builder`(入口页装修 MPC-11) 新增白卡分布面板 `aria-label="入口页装修分布"`——模板目标分布(按真实 template.target 映射 消费者/员工/管理)+发布状态分布(由真实 live_version_id/published_version_id 推导 数字门店已发布/模板已发布未绑定/尚未发布)+行业模板分布(按真实 industry_config.family 映射 餐饮/美业/零售/未配置兜底「通用」，频次降序)+发布数字门店分布(仅统计有 live_version_id 的模板，按 store_name，未绑定门店兜底)，宽度百分比 `b.value/total` 由真实门店模板档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条(线性 #ffd100→#f0a500)，≤900px 单列堆叠(与 W∞-45/46/47/48/49/50 共享视觉语言)。诚实边界全保留(源 source=local，新增 honest 底注 模板目标/发布状态/行业模板/已发布数字门店·不接美团/抖音实时投放·不包含本平台收款·非本平台下单)；工具身份眉标 `推广员工具 · 入口页装修`+heroCard+summaryStrip+loading/forbidden/error 全状态+进入装修/创建装修草稿/保存草稿/生成手机/PC 预览/发布/回滚全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf51-management-page-builder-deep.test.mjs 4/4。typecheck PASS、management build PASS(29 routes 含 /m/page-builder)、`pnpm build` 20/20、`g1-winf*.test.mjs` 156/156、单测 47 passed(2 个 pre-existing token 失败照旧)、eslint+prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF51/ACCEPTANCE.md`。
- [x] **G1-W∞-52** `G1-R-PLATFORM-AGENTS-DEEP` PASS — Platform 省市区代理 真实数据深页密度 densify（平台面，禁止假 BI）承接 Management MPC 深页序列 W∞-45/46/47/48/49/50/51 深页波，把平台面 /p/agents 省市区代理补上「分布洞察」并视觉/IA densify toward 美团平台代理后台：`/p/agents` 移除页面级 AdminPageHeader，新增黄顶栏 topBar（推广员工具 · 省市区代理 + 右上「渠道商户队列」「刷新」）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 + 诚实描述）+ 白卡概况条 summaryStrip（区域/代理商/归属商户/待审批入驻）+ 白卡分布面板 `aria-label="代理运营分布"`——代理层级分布（按真实 agent.agentLevel 省级/市级/区县）+代理状态分布（按真实 agent.status 正常/已暂停）+区域层级分布（按真实 region.level 省级/市级/区县）+结算状态分布（按真实 settlement.settlementStatus 结算中/已结算）+入驻审批状态分布（按真实 approval.approvalStatus 待审批/已通过/已驳回），宽度百分比 `b.value/total`(barWidth) 由真实省市区代理档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.topBar/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠。诚实边界全保留（源 source=local，新增 honest 底注 结算/配额是代理运营账不是消费者成交·未接美团实时代理数据·不包含本平台收款·非本平台下单）；工具身份眉标+loading/forbidden/error 全状态+省市区代理树/建立区域/绑定代理商/商户入驻归属/入驻配额/周期结算/入驻开通审批全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单；平台代理运营账按主人授权边界保留。新增 tests/g1-winf52-platform-agents-deep.test.mjs 4/4。typecheck PASS（20/20）、platform build PASS（含 /p/agents）、`pnpm build` 20/20、`g1-winf*.test.mjs` 160/160、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF52/ACCEPTANCE.md`。
- [x] **G1-W∞-53** `G1-R-PLATFORM-TENANTS-DEEP` PASS — Platform 平台租户管理 真实数据深页密度 densify（平台面，禁止假 BI）承接 Management MPC 深页序列 W∞-45/46/47/48/49/50/51 + 平台面 `/p/agents`(W∞-52)，把平台面 /p/tenants 租户管理补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：`/p/tenants` 移除页面级 AdminPageHeader，新增黄顶栏 topBar（推广员工具 · 平台租户管理 + 右上「刷新」）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 + 诚实描述）+ 白卡概况条 summaryStrip（租户/开通中/已暂停/高风险）+ 白卡分布面板 `aria-label="平台租户运营分布"`——租户状态分布（按真实 status 开通中/已暂停）+套餐分布（按真实 plan 起步版/成长版/企业版）+风险等级分布（按真实 riskLevel 低风险/中风险/高风险）+逾期任务分布（按真实 overdueTasks 分桶 无逾期/轻负担1-5/重负担6+）+用户配额分布（按真实 quotas.users 分桶 用户配额 ≤10/11-50/51+），宽度百分比 `barWidth(items.length, b.value)` 由真实平台租户档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + /p/agents 共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 租户是工具开通与整合经济体·不包含本平台收款·非本平台下单·本地试点记录未接美团实时商户数据）；工具身份眉标+loading/forbidden/error 全状态+租户列表/生命周期（暂停恢复+SUSPEND/ACTIVATE 二次确认）/套餐/配额/风险等级编辑保存交互全继承，`data-testid="platform-tenants"`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf53-platform-tenants-deep.test.mjs 4/4，随动更新 tests/e2e/platform-tenants.spec.ts（页面 h1 断言 `租户开通、暂停与经营边界`→`租户开通、暂停与工具边界`）。typecheck PASS、platform build PASS（含 /p/tenants）、`pnpm build` 20/20、`g1-winf*.test.mjs` 164/164、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF53/ACCEPTANCE.md`。
- [x] **G1-W∞-54** `G1-R-PLATFORM-CHANNELS-DEEP` PASS — Platform 平台渠道管理 真实数据深页密度 densify（平台面，禁止假 BI）承接 Management MPC 深页序列 W∞-45/46/47/48/49/50/51 + 平台面 `/p/agents`(W∞-52) `/p/tenants`(W∞-53)，把平台面 /p/channels 渠道管理补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：`/p/channels` 移除页面级 AdminPageHeader，新增黄顶栏 topBar（推广员工具 · 平台渠道管理 + 右上「刷新」）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 + 诚实描述）+ 白卡概况条 summaryStrip（一级渠道/纳入商户/已就绪服务/商户池）+ 白卡分布面板 `aria-label="渠道运营分布"`——渠道服务状态分布（按真实 channel.serviceStatus 待确认/已就绪/服务降级/已阻断）+渠道规模分布（按真实渠道 merchants.length 分桶 未挂商户 0/精简规模 1-3/规模渠道 4+）+商户开通状态分布（跨全部渠道商户，按真实 merchant.onboardingStatus 已邀请/开通中/有效/已暂停）+商户服务状态分布（跨全部渠道商户，按真实 merchant.serviceStatus 待确认/已就绪/服务降级/已阻断）+渠道状态分布（按真实 channel.status 渠道开放），宽度百分比 `barWidth(data.channels.length, b.value)`/`barWidth(totalMerchants, b.value)` 由真实一级渠道与商户池档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + /p/agents /p/tenants 共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 渠道是工具开通与整合网络·不包含本平台收款·非本平台下单·本地试点记录未接美团实时商户数据）；工具身份眉标+loading/forbidden/error 全状态+建立一级渠道/可开通商户池/已配置渠道交互全继承，`data-testid="platform-channels"`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf54-platform-channels-deep.test.mjs 4/4。typecheck PASS、platform build PASS（含 /p/channels）、`pnpm build` 20/20、`g1-winf*.test.mjs` 168/168、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF54/ACCEPTANCE.md`。
- [x] **G1-W∞-55** `G1-R-PLATFORM-BUSINESS-CIRCLES-DEEP` PASS — Platform 平台商圈管理 真实数据深页密度 densify（平台面，禁止假 BI）承接 Management MPC 深页序列 W∞-45/46/47/48/49/50/51 + 平台面 `/p/agents`(W∞-52) `/p/tenants`(W∞-53) `/p/channels`(W∞-54)，把平台面 /p/business-circles 商圈管理补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：`/p/business-circles` 移除页面级 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 topBar（推广员工具 · 平台商圈管理 + 右上「刷新」）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 固定商圈、推荐商户与平台审批 + 诚实描述）+ 白卡概况条 summaryStrip（固定商圈/推荐商户/已批准/待审批）+ 白卡分布面板 `aria-label="商圈运营分布"`——商圈规模分布（按真实商圈 circle.merchants.length 分桶 未收拢 0/小规模 1-5/中规模 6-15/规模商圈 16+）+推荐审批状态分布（跨全部商圈推荐商户，按真实 merchant.approvalStatus 待审批/已批准/已退出）+商圈覆盖商户分布（跨全部商圈统计每户被推荐覆盖的商圈次数，按真实 merchant.name 频次降序）+推荐权益分布（跨全部商圈推荐商户按真实 merchant.benefits.length 分桶 未配置权益 0/基础权益 1-4/丰富权益 5+），宽度百分比 `barWidth(data.circles.length, b.value)`/`barWidth(totalRecalls, b.value)` 由真实平台商圈档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + /p/agents /p/tenants /p/channels 共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 商圈是商家联盟整合网络·不包含本平台收款·非本平台下单·本地试点记录未接美团实时商户数据）；工具身份眉标+loading/forbidden/error 全状态+创建商圈并提交推荐/可推荐商户池/固定商圈与审批队列/批准加入交互全继承，`data-testid="platform-business-circles"`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf55-platform-business-circles-deep.test.mjs 4/4，随动更新 tests/e2e/platform-business-circles.spec.ts（页面 h1 断言 显式推荐…→固定商圈、推荐商户与平台审批）。typecheck PASS、platform build PASS（含 /p/business-circles 路由）、`pnpm build` 20/20、`g1-winf*.test.mjs` 172/172、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF55/ACCEPTANCE.md`。
- [x] **G1-W∞-56** `G1-R-PLATFORM-OUTBOX-DEEP` PASS — Platform 平台投递队列 真实数据深页密度 densify（平台面 SYS-4，禁止假 BI）承接 Management MPC 深页序列 W∞-45/46/47/48/49/50/51 + 平台面 `/p/agents`(W∞-52) `/p/tenants`(W∞-53) `/p/channels`(W∞-54) `/p/business-circles`(W∞-55)，把平台面 /p/outbox 投递死信运维补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：`/p/outbox` 移除页面级 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 topBar（推广员工具 · 平台投递队列 + 右上「刷新」）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 及诚实描述）+ 白卡概况条 summaryStrip（死信记录/涉及租户/聚合对象/已达上限）+ 白卡分布面板 `aria-label="平台投递分布"`——事件类型分布（按真实 eventType 频次降序）+聚合对象分布（按真实 aggregateType 频次降序）+重试次数分布（按真实 attempts 分桶 首次失败 1/多次重试 2-5/已达上限 6+）+租户分布（按真实 tenantId 前缀匿名频次降序），宽度百分比 `barWidth(items.length, b.value)` 由真实平台投递死信档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + /p/agents /p/tenants /p/channels /p/business-circles 共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 Outbox 是平台投递与同步队列·重放不会调用美团/抖音实时·仅恢复本地投递状态·不包含本平台收款·非本平台下单）；工具身份眉标+loading/forbidden/error/empty 全状态+死信队列/重放/运维边界交互全继承，`data-testid="platform-outbox"`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf56-platform-outbox-deep.test.mjs 4/4。typecheck PASS、platform build PASS（含 /p/outbox 路由）、`pnpm build` 20/20、`g1-winf*.test.mjs` 176/176、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF56/ACCEPTANCE.md`。
- [x] **G1-W∞-57** `G1-R-PLATFORM-SECURITY-AUDIT-DEEP` PASS — Platform 平台安全审计 真实数据深页密度 densify（平台面，禁止假 BI）承接 Management MPC 真实数据深页序列 W∞-45~51 + 平台面 `/p/agents`(W∞-52) `/p/tenants`(W∞-53) `/p/channels`(W∞-54) `/p/business-circles`(W∞-55) `/p/outbox`(W∞-56 平台投递死信运维 SYS-4)，把平台面 `/p/security-audit` 平台安全审计（PAGE-P-008）补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：`/p/security-audit` 移除页面级 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 topBar（推广员工具 · 平台安全审计 + 右上「刷新审计」）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 风险信号、越权审计、连接器与安全事件 + 诚实描述）+ 白卡概况条 summaryStrip（风险信号/待处置/已确认处置/最高风险）+ 白卡分布面板 `aria-label="平台安全分布"`——严重度分布（按真实 risk.severity 经 businessLabel 中文，频次降序）+风险类型分布（按真实 risk.kind 经 businessLabel 中文，频次降序）+处置状态分布（按真实 risk.review_status 已确认处置/待处置）+事件类型分布（按真实 event.action 经 eventCopy 中文，频次降序）+资源类型分布（按真实 event.resource_type 经 businessLabel 中文，频次降序），宽度百分比 `barWidth(risks.length, b.value)`/`barWidth(events.length, b.value)` 由真实平台安全审计档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + /p/agents /p/tenants /p/channels /p/business-circles /p/outbox 共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 分布全部由已抓取平台安全审计档案行现场推导、处置仅记录本地审计与事件、连接器观察不会调用美团/抖音等外部平台、不包含本平台收款、非本平台下单）；工具身份眉标+loading/forbidden/error/empty 全状态+待审查风险信号/安全事件链/确认处置更新处置（高风险二次操作+审计/Outbox 写入）/安全边际交互全继承，`data-testid="platform-security-audit"`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf57-platform-security-audit-deep.test.mjs 4/4。typecheck PASS、platform build PASS（含 /p/security-audit）、`pnpm build` 20/20、`g1-winf*.test.mjs` 180/180、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF57/ACCEPTANCE.md`。
- [x] **G1-W∞-58** `G1-R-PLATFORM-CONNECTORS-DEEP` PASS — Platform 平台连接器 真实数据深页密度 densify（平台面 PAGE-P-007，禁止假 BI）承接 Management MPC 真实数据深页序列 W∞-45/46/47/48/49/50/51 + 平台面 `/p/agents`(W∞-52) `/p/tenants`(W∞-53) `/p/channels`(W∞-54) `/p/business-circles`(W∞-55) `/p/outbox`(W∞-56) `/p/security-audit`(W∞-57)，把平台面 /p/connectors 平台连接器补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：`/p/connectors` 移除页面级 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 topBar（推广员工具 · 平台连接器 + 右上「刷新目录」）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 + 诚实描述）+ 白卡概况条 summaryStrip（连接器/运行正常/已授权租户/健康观察）+ 白卡分布面板 `aria-label="平台连接器分布"`——授权方式分布（按真实 auth_mode 经 businessLabel 中文，频次降序）+健康状态分布（按真实 health_status 经 businessLabel 中文，频次降序）+租户授权分布（跨全部连接器 authorizations，按真实 status 经 businessLabel 中文、以其 count 加权，频次降序）+限流带宽分布（按真实 rate_limit_per_minute 分桶 基础带宽 ≤120/标准带宽 121-600/高频带宽 601+）+健康日志状态分布（跨全部连接器 logs，按真实 logs[].status 经 businessLabel 中文，频次降序），宽度百分比 `barWidth(items.length, b.value)`/`barWidth(authCounts.total, b.value)`/`barWidth(totalLogs, b.value)` 由真实平台连接器档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + /p/agents /p/tenants /p/channels /p/business-circles /p/outbox /p/security-audit 共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 分布全部由已抓取平台连接器档案行现场推导、连接器仅记录意图与健康观察、观察不会调用美团/抖音等外部平台、不包含本平台收款、非本平台下单）；工具身份眉标+loading/forbidden/error/empty 全状态+定义连接器/租户授权汇总/记录健康观察交互+`connector-delivery-boundary` 诚实投递边界 e2e hook 全继承，`data-testid="platform-connectors"`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf58-platform-connectors-deep.test.mjs 4/4，随动更新 tests/e2e/platform-connectors.spec.ts（页面 h1 断言 定义、租户授权…→连接器目录、租户授权与健康观察）。typecheck PASS、platform build PASS（含 /p/connectors）、`pnpm build` 20/20、`g1-winf*.test.mjs` 184/184、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF58/ACCEPTANCE.md`。
- [x] **G1-W∞-59** `G1-R-PLATFORM-TEMPLATES-DEEP` PASS — Platform 平台模板治理 真实数据深页密度 densify（平台面 PAGE-P-006，禁止假 BI）承接 Management MPC 真实数据深页序列 W∞-45/46/47/48/49/50/51 + 平台面 `/p/agents`(W∞-52) `/p/tenants`(W∞-53) `/p/channels`(W∞-54) `/p/business-circles`(W∞-55) `/p/outbox`(W∞-56) `/p/security-audit`(W∞-57) `/p/connectors`(W∞-58)，把平台面 /p/templates 平台模板治理补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：`/p/templates` 移除页面级 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 topBar（推广员工具 · 平台模板治理 + 右上「刷新目录」）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 + 诚实描述）+ 白卡概况条 summaryStrip（模板/目标页面/已发布/绑定数字门店）+ 白卡分布面板 `aria-label="平台模板分布"`——模板目标分布（按真实 target 映射 消费者/员工/管理，频次降序）+发布状态分布（由真实 live_version_id/published_version_id 推导 数字门店已发布/模板已发布未绑定/尚未发布）+行业配置分布（按真实 industry_config.industry 映射 餐饮/美业/零售，未配置行业兜底）+绑定数字门店分布（仅统计有 live_version_id 的模板，按真实 store_name，未绑定门店兜底）+版本演进分布（按真实 version 分桶 首版 1/演进 2-5/多次演进 6+），宽度百分比 `barWidth(templates.length, b.value)`/`barWidth(boundCount, b.value)` 由真实平台模板档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest/.head` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + /p/agents /p/tenants /p/channels /p/business-circles /p/outbox /p/security-audit /p/connectors 共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 分布全部由已抓取模板档案行现场推导、仅记录受控模板治理、未接美团/抖音实时投放、不包含本平台收款、非本平台下单）；工具身份眉标+loading/forbidden/error/empty 全状态+新建平台模板/已持久化模板/预览模块/实时预览与发布/发布当前版本交互全继承，`data-testid="platform-templates"`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf59-platform-templates-deep.test.mjs 4/4。typecheck PASS、platform build PASS（含 /p/templates）、`pnpm build` 20/20、`g1-winf*.test.mjs` 188/188、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF59/ACCEPTANCE.md`。
- [x] **G1-W∞-60** `G1-R-BC-DASHBOARD-DEEP` PASS — Circle 商圈联盟 真实数据深页密度 densify（商圈面 MP-04，禁止假 BI）承接 Management MPC 深页序列 W∞-45/46/47/48/49/50/51 + 平台面 `/p/agents`(W∞-52) `/p/tenants`(W∞-53) `/p/channels`(W∞-54) `/p/business-circles`(W∞-55) `/p/outbox`(W∞-56) `/p/security-audit`(W∞-57) `/p/connectors`(W∞-58) `/p/templates`(W∞-59)，把商圈面 /bc/dashboard 商圈联盟补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：`/bc/dashboard` 保留既有黄顶栏 topBar（推广员工具 · 商圈联盟 + 刷新）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 成员权益、内容、流量与入口转化 + 诚实描述），新增白卡概况条 summaryStrip（固定商圈/已批准商户/访问行为/入口转化）+ 白卡分布面板 `aria-label="商圈联盟分布"`——联盟规模分布（按真实 circle.merchants.length 分桶 未收拢商户 0/精简联盟 1-5/中型联盟 6-15/规模联盟 16+）+商户权益覆盖分布（跨全部已批准商户按真实 merchant.benefits.length 分桶 未配置权益 0/基础权益 1-4/丰富权益 5+）+内容密度分布（按真实 merchant.contentCount 分桶 未投内容 0/轻度内容 1-5/丰富内容 6+）+流量行为分布（按真实 merchant.trafficEvents 分桶 尚无行为 0/低活跃 1-9/中活跃 10-99/高活跃 100+）+入口转化分布（按真实 merchant.conversionOrders 分桶 未转化 0/少量转化 1-9/高转化 10+），宽度百分比 `barWidth(data?.circles.length ?? 0, b.value)`/`barWidth(merchantTotal, b.value)` 由真实商圈联盟档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + 平台面 /p/* 系列共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 分布全部由已抓取商圈联盟档案行现场推导、商圈是商家联盟整合网络、仅呈现聚合入口痕迹、不包含本平台收款、非本平台下单、本地试点记录未接美团实时商户数据）；工具身份眉标+loading/forbidden/error 全状态+常用功能格+商圈指标+固定商圈联盟明细（e2e hooks、`<dt>入口转化</dt>`）全继承。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf60-bc-dashboard-deep.test.mjs 4/4。typecheck PASS、platform build PASS（含 /bc/dashboard）、`pnpm build` 20/20、`g1-winf*.test.mjs` 192/192、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF60/ACCEPTANCE.md`。
- [x] **G1-W∞-61** `G1-R-PLATFORM-DASHBOARD-DEEP` PASS — Platform 平台总览 真实数据深页密度 densify（平台面，禁止假 BI）承接平台面 /p/agents(W∞-52) /p/tenants(W∞-53) /p/channels(W∞-54) /p/business-circles(W∞-55) /p/outbox(W∞-56) /p/security-audit(W∞-57) /p/connectors(W∞-58) /p/templates(W∞-59) + 商圈面 /bc/dashboard(W∞-60)，把平台主总览 /p/dashboard 补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台：API `platform-dashboard.service.ts` 的 `GET /api/v1/platform/dashboard`（requirePlatform + x-request-id 校验不变）在既有 metrics/risks/system 基础上新增返回真实档案行（仅查询既有表，零 schema/migration）——tenants[] `select t.status, coalesce(s.plan,'starter') plan, coalesce(s.risk_level,'low') risk_level from tenants t left join platform_tenant_settings s ...`（真实租户行→状态/套餐/风险等级）+ channels[] `select coalesce(platform,'(未指定)') platform, status from external_actions ...`（真实渠道行，经 businessLabel 映射中文）+ outbox[] `from outbox_events where status='needs_attention' ... limit 100`（真实待投递死信行）+ signals[] `select event_code as key, count(*)::int count from entry_funnel_events where occurred_at >= now()-interval '30 days' group by event_code`（L0–L2 入口痕迹聚合到平台面，仅观看/访问/跳转/停留/分享等入口行为，不碰成交金额）。`/p/dashboard` 保留既有黄顶栏 topBar（推广员工具 · 平台总览 + 刷新）+ 灰底白卡画布（背景 #f5f5f5）+ heroCard 白卡（h1 跨租户入口信号与系统状态 + 诚实描述）+ 常用功能格 + 平台指标 + 风险队列/系统状态，新增白卡概况条 summaryStrip（租户/渠道/30 天入口痕迹/Outbox 死信）+ 白卡分布面板 `aria-label="平台运营分布"`——租户状态分布（按真实 tenants[].status 开通中/已暂停）+套餐分布（按真实 plan 起步版/成长版/企业版，频次降序）+风险等级分布（按真实 risk_level 低/中/高）+渠道平台分布（按真实 channels[].platform 经 businessLabel 中文，频次降序）+入口痕迹分布（按真实 signals[] event_code 经 eventLabel 中文，仅 L0–L2，频次降序）+Outbox 死信状态分布（按真实 outbox[].eventType，未分类兜底，频次降序）+死信重试分布（按真实 outbox[].attempts 分桶 首次失败 1/多次重试 2-5/已达上限 6+），宽度百分比 `barWidth(data.tenants.length, b.value)`/`barWidth(channelTotal, b.value)`/`barWidth(signalTotal, b.value)`/`barWidth(outboxTotal, b.value)` 由真实平台档案行推导，空数据「暂无记录」。`page.module.css` 新增 `.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（线性 #ffd100→#f0a500），≤900px 单列堆叠（与 Management MPC 深页 + 平台面 /p/* 系列共享视觉语言）。诚实边界全保留（源 source=local，新增 honest 底注 分布全部由已抓取平台档案行现场推导、租户状态/套餐/风险等级由真实租户行映射、渠道平台由真实 external_actions 行经 businessLabel 映射、入口痕迹仅 L0–L2、Outbox 死信按真实待投递事件行统计、不含本平台收款、非本平台下单、本地试点记录未接美团实时商户数据）；工具身份眉标+loading/forbidden/error/empty 全状态+`data-testid="platform-dashboard"`+常用功能格+平台指标+风险队列/系统状态全继承。无 schema/DB migration（仅查询既有表），不复活 consumer_orders / 本平台下单/收单；入口痕迹不碰成交金额。新增 tests/g1-winf61-platform-dashboard-deep.test.mjs 4/4。typecheck PASS（api+platform-web）、`pnpm build` 20/20（包含 /p/dashboard）、`g1-winf*.test.mjs` 196/196（含 g1-winf36 平台总览回归）、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。见 `evidence/G1-MEITUAN-PARITY/WINF61/ACCEPTANCE.md`。
- [ ] **NEXT:** **W∞-62** 续 平台/商圈/渠道/员工 深度 densify（Management MPC 真实数据深页 W∞-45~51 + 平台面 `/p/agents` W∞-52 + `/p/tenants` W∞-53 + `/p/channels` W∞-54 + `/p/business-circles` W∞-55 + `/p/outbox` W∞-56 + `/p/security-audit` W∞-57 + `/p/connectors` W∞-58 + `/p/templates` W∞-59 + 商圈面 `/bc/dashboard` W∞-60 + 平台面 `/p/dashboard` W∞-61 已收；续商圈 `/bc/merchants` / 渠道 `/ch/*` / 员工 `/e/*` 剩余真实数据面下一处缺口）。
- [x] **G1-W∞-2** `G1-R-MEITUAN-H5-SEARCH` PASS (首刀) — Consumer H5 搜索（MH5-02）: `ConsumerDiscoveryService.search` + `GET /api/v1/consumer/search?tenant&q`（租户 fail-closed 按名 ILIKE 检索已发布商户，返回 local_pilot 评分/月售/距离 + 进店深链）+ `/c/search` 美团 App 搜索面 + `/c/discovery` 的搜索壳升级为可点击搜索入口。typecheck 20/20、build 20/20（consumer 路由新增 `/c/search`）、page-c-consumer-search L2 PASS、page-c-002 回归 PASS、resolve-consumer-tabs 3/3。见 `evidence/G1-MEITUAN-PARITY/WINF2/ACCEPTANCE.md`。
- [ ] G1 OWNER GATE — owner signs only after tool-identity + funnel waves pass re-test (`PRODUCT_OWNER_UI_ACCEPTANCE.md`). P1-C still blocked on lifting G + cloud inventory.
- [ ] HUMAN-PILOT-HANDOFF / product-owner UI acceptance — local sandbox refreshed through migration `054` + consult CTA bindings + walkthrough shots (Playwright 4/4); **human sign-off still required**; not auto-claimed as 全部商用. Phase-1 P1-C blocked until owner lifts G (deploy templates in `infra/deploy/`).

## Current product-owner acceptance

- [ ] CONSUMER-COMMERCIAL-HOME-V1 AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE - Consumer-only commercial storefront implemented and technically verified. The restaurant store now has a unified `首页 / 团购 / 菜单 / 会员 / 我的` shell, real store-scoped channels, source/share-code continuity and a consistent action-confirmation route before external hand-off; product, group-buy and action pages use the same navigation. Persisted package/platform prices, the LBS header, store-information card and product details remain in place. Final visual decision remains with the product owner. Evidence: `evidence/CONSUMER-COMMERCIAL-HOME-V1/ACCEPTANCE.md`.

## Audit hardening status (latest)

- [x] H-001 PASS - API startup fails closed without a safe authentication signing secret.
- [x] H-002 PASS - systemic shared session boundary: real employee, management and platform login/refresh/logout; 36 E/M/P business pages migrated from 54 direct token reads; public consumer entry requires explicit tenant and remains anonymous; real Playwright 6/6 PASS.
- [x] AUDIT-BATCH-2 PASS (`5c0ea50`) - commercial operating orchestration: public consumer behaviour atomically projects customer/source/ownership or lead-pool/task/reminder/audit/Outbox, with HTTP full-chain evidence.
- [x] AUDIT-BATCH-3 PASS (`3998a7d`) - Worker / Outbox consumption / reminder / overdue scheduling.
- [x] AUDIT-BATCH-4 PASS (207740e) - shared API pool, database-backed auth/public-write rate limits, strict CORS and production TLS/proxy/edge-rate-limit startup controls; real HTTP security acceptance and 180 repository tests passed.
- [x] AUDIT-BATCH-5 PASS (`aa50e0e`) - controlled local AI task commands, `manual_required` fallback, execution audit/Outbox receipts, and honest management/platform connector capability boundaries.
- [x] AUDIT-BATCH-6 PASS (`62f102b`) - real public consumer -> employee follow-up/result/evidence -> owner-management journey, with actual employee/owner/platform sessions and second-tenant/low-privilege API isolation denials.
- [x] AUDIT-BATCH-7 PASS (`d175f64`) - shared commercial-language presentation, anonymous-customer minimization, accurate public platform-entry copy and non-overlapping 390px employee result form, verified by real four-terminal Playwright and full quality gates.
- [x] AUDIT REMEDIATION STAGE PASS - A through G are complete; see `PROJECT_STATE/AUDIT_REMEDIATION_CLOSEOUT.md`.
- [x] PRE-PILOT-POLISH PASS (`268464d`) - completed only the eight approved pilot-experience/deterministic-defect items; acceptance is recorded in `PROJECT_STATE/PRE_PILOT_POLISH_ACCEPTANCE.md` and no Hardening expansion occurred.
- [ ] HUMAN-PILOT-HANDOFF ACCEPTANCE REQUIRED - an operator must complete `PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md` and `docs/PILOT_ACCEPTANCE_CHECKLIST.md` before any external pilot claim; no public commercial claim without that sign-off.
- [x] LOCAL HUMAN-PILOT-SANDBOX READY - isolated `oneday_human_pilot` database migrated through `054_channel_permissions`, published restaurant storefront bindings, `PILOT-CONSULT` store links, non-seed local accounts, six localhost services, machine preflight evidence and human runbook are ready. This is not public HTTPS, production acceptance or an external authorization.

## Final commercial acceptance status (final)

- [x] FINAL COMMERCIAL ACCEPTANCE PASS - all 69 indexed tasks, fresh-database release rehearsal, live readiness/recovery, browser acceptance, and repository quality gates verified.
- [ ] HUMAN PILOT HANDOFF - operator must provision live credentials/authorizations and sign the controlled-pilot checklist before customer enablement.

## Final commercial acceptance status (latest)

- [x] HARDENING-005 PASS - controlled pilot deployment, administrator, limitation and acceptance package verified.
- [ ] FINAL COMMERCIAL ACCEPTANCE IN PROGRESS - execute clean-database release rehearsal and final handoff report.

## Current hardening status (latest)

- [x] HARDENING-004 PASS — guarded PostgreSQL recovery clone and release/recovery rehearsal verified.
- [ ] HARDENING-005 NEXT — pilot delivery package and final commercial acceptance.

## Current hardening status (latest)

- [x] HARDENING-003 PASS — database-backed readiness and connector recovery reliability verified.
- [ ] HARDENING-004 NEXT — backup recovery and release rehearsal.

## Current hardening status (latest)

- [x] HARDENING-002 PASS — four commercial MVP HTTP chains and four-terminal browser evidence verified.
- [ ] HARDENING-003 NEXT — performance and reliability hardening.

## Current hardening status (latest)

- [x] HARDENING-001 PASS — persistent session validation, tenant isolation and private controller authorization contracts verified.
- [ ] HARDENING-002 NEXT — commercial MVP end-to-end acceptance.

## Current hardening status (latest)

- [x] CHANNEL / BUSINESS-CIRCLE PHASE ACCEPTED — full gates and evidence verified.
- [ ] HARDENING-001 NEXT — end-to-end permissions and tenant-isolation hardening.

## Channel phase status (latest — acceptance required)

- [x] CIRCLE-002 PASS — business-circle merchant invitation, dual approval, display control and exit verified.
- [ ] CHANNEL PHASE ACCEPTANCE — review CHANNEL-001, CHANNEL-002, CIRCLE-001 and CIRCLE-002 before HARDENING-001.

## Current task status (latest — CIRCLE-001 passed)

- [x] CIRCLE-001 PASS — fixed business-circle operations console verified.
- [ ] CIRCLE-002 NEXT — business-circle merchant management.

## Current task status (latest — CHANNEL-002 passed)

- [x] CHANNEL-002 PASS — channel merchant onboarding verified.
- [ ] CIRCLE-001 NEXT — fixed business-circle operations console.

## Current task status (latest — CHANNEL-001 passed)

- [x] CHANNEL-001 PASS — channel operations console verified.
- [ ] CHANNEL-002 NEXT — channel merchant onboarding.

## Current task status (latest — PAGE-P-008 passed)

- [x] PAGE-P-008 PASS — platform security audit verified.
- [ ] CHANNEL-001 NEXT — channel operations console.

## Current task status (latest)

- [x] PAGE-P-007 PASS — platform connectors verified.
- [ ] PAGE-P-008 NEXT — platform security audit.

## Current task status (previous)

- [x] PAGE-P-006 PASS — platform template components verified.
- [ ] PAGE-P-007 NEXT — platform connectors.

## Current task status (previous)

- [x] PAGE-P-005 PASS — fixed business-circle management verified.
- [ ] PAGE-P-006 NEXT — platform template components.

## Current task status (previous)

- [x] PAGE-P-004 PASS — channel management verified.
- [ ] PAGE-P-005 NEXT — business-circle management.

## Current task status (latest)

- [x] PAGE-P-003 PASS — tenant onboarding verified.
- [ ] PAGE-P-004 NEXT — channel management.

## Current task status (latest)

- [x] PAGE-P-002 PASS — tenant management verified.
- [ ] PAGE-P-003 NEXT — tenant onboarding wizard.

## Current task status (latest)

- [x] PAGE-P-001 PASS — platform overview verified.
- [ ] PAGE-P-002 NEXT — tenant management.

## Current task status (latest)

- [x] PAGE-M-016 PASS — tenant operating settings verified.
- [ ] PAGE-P-001 NEXT — platform overview.

## Current task status (latest)

- [x] PAGE-M-015 PASS — connector management verified.
- [ ] PAGE-M-016 NEXT — tenant operating settings.

## Current task status (latest)

- [x] PAGE-M-014 PASS — page decoration verified.
- [ ] PAGE-M-015 NEXT — connector management.

## Current task status (latest)

- [x] PAGE-M-013 PASS — content center verified.
- [ ] PAGE-M-014 NEXT — page decoration.

## Current task status (latest)

- [x] PAGE-M-012 PASS — source attribution verified.
- [ ] PAGE-M-013 NEXT — content center.

## Current task status (latest authoritative)

- [x] PAGE-M-011 PASS — employee process performance verified.
- [ ] PAGE-M-012 NEXT — source attribution.

## Current task status (authoritative)

- [x] PAGE-M-010 PASS — permission audit verified.
- [ ] PAGE-M-011 NEXT — employee process performance.

This section supersedes older duplicate task snapshots below.

## Current employee status (authoritative)

- [x] PAGE-E-001 PASS — employee-scoped workbench verified.
- [x] PAGE-E-002 PASS — employee task detail and evidence links verified.
- [x] PAGE-E-003 PASS — employee-related customer detail verified.
- [x] PAGE-E-004 PASS — employee follow-up records and next tasks verified.
- [x] PAGE-E-005 PASS — employee sharing codes, QR entry, expiry and source tracing verified.
- [x] PAGE-E-006 PASS — employee acquisition pool verified.
- [x] PAGE-E-007 PASS — employee nurture workbench verified.
- [x] PAGE-E-008 PASS — employee notifications verified.
- [x] PAGE-E-009 PASS — employee profile and tools verified.
- [x] PAGE-M-001 PASS — management overview verified.
- [x] PAGE-M-002 PASS — management funnel verified.
- [x] PAGE-M-003 PASS — customer assets verified.
- [x] PAGE-M-004 PASS — management customer detail verified.
- [x] PAGE-M-005 PASS — workflow center verified.
- [x] PAGE-M-006 PASS — AI suggestion center verified.
- [x] PAGE-M-007 PASS — store management verified.
- [x] PAGE-M-008 PASS — organization and employees verified.
- [x] PAGE-M-009 PASS — roles and permissions verified.
- [ ] PAGE-M-010 NEXT — permission audit.

## Current page status

- [x] PAGE-C-001 PASS — public consumer entry renders published template and actions with mobile state coverage.
- [x] PAGE-C-002 PASS — tenant-scoped channel recommendations, fixed business circles and LBS discovery are independently rendered and verified.
- [x] PAGE-C-003 PASS — consumer store detail, consultation trace, audit and Outbox verified.
- [x] PAGE-C-004 PASS — consumer service detail, benefits and tenant-scoped action trace verified.
- [x] PAGE-C-005 PASS — consumer external-action redirect, recovery and audit trail verified.
- [x] PAGE-C-006 PASS — consumer process/results, private access and recovery verified.
- [x] PAGE-C-007 PASS — consumer identity, membership, minimized data exposure and consent revocation verified.

## Employee status archive

The following current employee status is authoritative; the two legacy entries retained below it are superseded snapshots and must be ignored.

## Current employee status

- [x] PAGE-E-001 PASS — employee-scoped workbench, actionable tasks, due-signal opportunities and customer reminders verified.
- [x] PAGE-E-002 PASS — employee-scoped task detail, evidence links and self completion verified.
- [ ] PAGE-E-003 NEXT — employee customer detail.

- [x] PAGE-E-001 PASS — employee-scoped workbench, actionable tasks, due-signal opportunities and customer reminders verified.
- [ ] PAGE-E-002 NEXT — employee task detail.

## Latest core status

- [x] PAGE-C-001 PASS — public consumer entry renders published template and actions with mobile state coverage.
- [ ] PAGE-C-002 NEXT — consumer discovery page.

## Latest core status

- [x] CORE-002 PASS — employee invitations, memberships, lifecycle, audit and outbox verified.
- [ ] CORE-003 NEXT — role and permission management.

## Current core status

- [x] CORE-001 PASS — tenant, organization, merchant and store model; evidence and all applicable quality gates passed.
- [ ] CORE-002 NEXT — user, employee and membership model.

## Milestones

- [x] FOUNDATION MILESTONE PASS — FOUNDATION-001 至 FOUNDATION-010（10/69，基础阶段最终状态提交：239114e）

- [x] FOUNDATION-001 — 新仓库与 Monorepo 骨架
- [x] FOUNDATION-002 — 本地基础设施
- [x] FOUNDATION-003 — 共享配置与代码质量
- [x] FOUNDATION-004 — 数据库迁移与种子框架
- [x] FOUNDATION-005 — 认证与会话
- [x] FOUNDATION-006 — 租户上下文与数据隔离
- [x] FOUNDATION-007 — RBAC与数据范围
- [x] FOUNDATION-008 — 事件与Outbox
- [x] FOUNDATION-009 — 设计系统与应用壳
- [x] FOUNDATION-010 — 测试与证据框架
- [x] CORE-001 — 租户与组织模型
- [x] CORE-002 — 用户员工与成员关系
- [x] CORE-003 — 角色权限管理服务
- [x] CORE-004 — 客户主档与身份
- [x] CORE-005 — 来源归属与贡献
- [x] CORE-006 — 任务提醒与升级
- [x] CORE-007 — 证据与结果回收
- [x] CORE-008 — 页面模板与模块
- [x] CORE-009 — 入口插件与外部动作
- [x] CORE-010 — 标准工作流引擎
- [x] PAGE-C-001 — 消费者统一入口
- [ ] PAGE-C-002 — 消费者发现页
- [ ] PAGE-C-003 — 商户详情
- [x] PAGE-C-004 — 服务/权益详情
- [x] PAGE-C-005 — 外部动作中转
- [x] PAGE-C-006 — 过程与结果查询
- [ ] PAGE-C-007 — 消费者身份与会员
- [ ] PAGE-E-001 — 员工工作台
- [ ] PAGE-E-002 — 任务详情
- [ ] PAGE-E-003 — 客户详情
- [ ] PAGE-E-004 — 跟进记录
- [ ] PAGE-E-005 — 分享码与场景
- [ ] PAGE-E-006 — 获客池
- [ ] PAGE-E-007 — 养客工作台
- [ ] PAGE-E-008 — 消息与通知
- [ ] PAGE-E-009 — 个人与工具
- [ ] PAGE-M-001 — 经营总览
- [ ] PAGE-M-002 — 经营漏斗
- [ ] PAGE-M-003 — 客户资产
- [ ] PAGE-M-004 — 管理客户详情
- [ ] PAGE-M-005 — 流程中心
- [ ] PAGE-M-006 — AI建议中心
- [ ] PAGE-M-007 — 门店管理
- [ ] PAGE-M-008 — 组织与员工
- [ ] PAGE-M-009 — 角色权限
- [ ] PAGE-M-010 — 权限审计
- [ ] PAGE-M-011 — 员工过程绩效
- [ ] PAGE-M-012 — 来源归因
- [ ] PAGE-M-013 — 内容中心
- [ ] PAGE-M-014 — 页面装修
- [x] PAGE-M-015 — 插件连接器
- [ ] PAGE-M-016 — 租户经营设置
- [ ] PAGE-P-001 — 平台总览
- [ ] PAGE-P-002 — 租户管理
- [ ] PAGE-P-003 — 租户开通向导
- [ ] PAGE-P-004 — 渠道管理
- [ ] PAGE-P-005 — 固定商圈管理
- [ ] PAGE-P-006 — 平台模板组件
- [ ] PAGE-P-007 — 平台连接器
- [ ] PAGE-P-008 — 平台安全审计
- [ ] CHANNEL-001 — 渠道经营台
- [ ] CHANNEL-002 — 渠道商户开通
- [ ] CIRCLE-001 — 固定商圈经营台
- [ ] CIRCLE-002 — 商圈商户管理
- [ ] HARDENING-001 — 全链路权限与隔离加固
- [ ] HARDENING-002 — 商业MVP端到端验收
- [ ] HARDENING-003 — 性能与可靠性
- [ ] HARDENING-004 — 备份恢复与发布演练
- [ ] HARDENING-005 — 试点交付包
