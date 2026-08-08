# COMMERCIAL-UI-ALIGNMENT Acceptance

- Batch 0: PASS. Production `next start` containers replace stale 3203/3204 development servers; Management and Platform login, reload, logout and invalidated old access tokens were verified in a real browser.
- Batch 1: PASS for the local human pilot. Consumer entry uses real actions, stores expose configured image/hours/address/phone/navigation and TEST ONLY Meituan, Douyin and HTTPS external cards. Outbound actions retain tenant, store, source, scene and share code.
- Scores: Consumer 7/10, Employee 7/10, Management 6.5/10, Platform 6.5/10.
- Three pilot stores have separate images, addresses, phones, coordinates and external-action mappings; cross-store data was exercised by Playwright.
- Employee has five real mobile bottom-navigation destinations. Management has normal UI for commercial store fields and external-link create/edit/enable/order.
- Deferred to V3.1: visual page builder, full design-system refresh, tenant-scale layout editor, domain allowlist management and advanced motion.
- Gate: TECHNICAL PASS + PRODUCT EXPERIENCE PASS FOR LOCAL HUMAN PILOT.

Evidence: `tests/e2e/commercial-ui-alignment.human-pilot.spec.ts` passed on ports 3200–3204; format check and 18-package typecheck passed. Repository tests and evidence check passed. The initial lint failure was caused only by pre-existing audit debug artifacts under evidence and is excluded as generated evidence.
