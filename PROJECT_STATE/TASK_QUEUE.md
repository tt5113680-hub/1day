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
- [ ] **NEXT:** W∞-21 tool-path gaps（体验对标细部）— **不做** 本平台下单. Owner G1 re-test when ready.
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
