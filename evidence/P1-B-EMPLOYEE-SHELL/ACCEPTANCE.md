# P1-B Employee Shell — shared token-driven work navigation chrome

- slice: `p1-b-employee-shell`
- branch: `hardening/COMMERCIAL-COMPLETION`
- date: 2026-08-10 Asia/Shanghai
- goal: Consolidate the Employee work-shell navigation chrome (mobile bottom tabs + desktop sidebar) onto the shared `@oneday/ui` token system so the Employee shell draws from the **same design-token palette** as Consumer/Management/Platform (`@oneday/ui` foundation), no longer carrying per-page raw hex (CHARTER §1.2 no page-level hex patches, §2 four-shell IA, §6 design tokens + shared kit; BLUEPRINT Mobile Shell Work mode §4.2).

## Scope (no PRD deviation; no page-level hex patches)

1. `packages/ui/src/components.tsx` — added a shared `EmployeeWorkNav` component (mobile bottom tabs + desktop sidebar) driven by the menu-DTO `EmployeeNavItem[]` (`key`/`href`/`label`/`group`) + `activeKey` + `context` + `mode` + `storeManagerMode`; renders `.od-employee-nav--bottom` and `.od-employee-nav--desktop` surfaces (CHARTER §7.1 menu DTO roles, §4.2 Mobile Shell Work mode).
2. `packages/ui/src/index.ts` — exported `EmployeeWorkNav` and type `EmployeeNavItem`.
3. `packages/design-tokens/foundation.css` — added `.od-employee-nav--bottom` / `--desktop` / `__link` / `__link--active` / `__brand` / `__mode` / `__list` / `__context` primitives. **All colour derives from `var(--od-*)` foundation tokens / `color-mix` — no raw hex in the new chrome.**
4. `apps/employee-web/app/e/employee-bottom-nav.tsx` — now renders the shared `EmployeeWorkNav` and computes the active key from the pathname (customers, tasks, notifications, profile, store, workbench direct-match rules preserved); still loads the role menu via `/api/v1/me/menu?product=employee`; **removed the per-page `employee-bottom-nav.module.css` whose raw hex duplicated the brand palette** (CHARTER §1.2).
5. Deleted `apps/employee-web/app/e/employee-bottom-nav.module.css` (10 raw hex/rgb values retired; the shared chrome now owns that styling).
6. All other Employee routes that use the shared `MobileShell` + `EmployeeBottomNav` (workbench, tasks, customers, leads, memberships, notifications, nurture, profile, share, store) inherit the shared token nav automatically.

## Matrix mapping

| ID | Pri | Assertion | Evidence |
| -- | --- | --------- | -------- |
| UI-01 | P1 | Shared Design System token/component consistency; no raw hex in new employee-nav chrome primitives | `tests/employee-shell-tokens.vitest.ts` (foundation.css projection + no-hex assertion over `.od-employee-nav` block); shared `EmployeeWorkNav` used by Employee shell |
| UI-02 | P1 | Responsive: mobile bottom nav → tablet/desktop sticky sidebar with active state across 390/768/1440 | Playwright `p1-b-employee-shell.spec.ts` + screenshots `employee-shell-mobile-390/tablet-768/desktop-1440.png` |
| E-02 | P1 | Mobile-first Employee work nav with real task entry + store-manager route reachable across breakpoints | Playwright nav presence + `aria-current=page` at three viewports; workbench + membership-redeem regressions |

## L1–L4 selves / gates

| Gate | Result |
| ---- | ------ |
| L1 typecheck | `pnpm typecheck` 20/20 PASS |
| L1 build | `pnpm build` 20/20 PASS (four webs + packages) |
| L1 unit | `pnpm test:unit` 10 files / 45 PASS (incl. new `employee-shell-tokens.vitest.ts` 2) |
| L3 Playwright | `pnpm exec playwright test --config playwright.p1-b-employee-shell.config.ts` 1/1 PASS (390 / 768 / 1440) |
| Regression | `playwright.page-e-001` (employee workbench 2/2), `playwright.sys-33-employee-membership-redeem` 1/1, `playwright.p1-b-consumer-shell` 1/1 — all PASS |
| Anthropomorphic | Fresh tenant employee login → sees workbench task (workbench full journey) → native task nav → `/e/memberships` store-manager redeem reachable under the shared nav (CHARTER §5.2 #2 Employee path) |
| Honest boundary | No business-data model change; nav is token/menu-DTO driven from the shared kit; no HTML/script injection; no fake third-party delivery |

## Screenshots

- `employee-shell-mobile-390.png`
- `employee-shell-tablet-768.png`
- `employee-shell-desktop-1440.png`
- (Playwright trace in `playwright-output/`)

## Commit scope

This slice commits: `packages/ui/src/components.tsx`, `packages/ui/src/index.ts`, `packages/design-tokens/foundation.css`, `apps/employee-web/app/e/employee-bottom-nav.tsx` (+ deleted `employee-bottom-nav.module.css`), `tests/employee-shell-tokens.vitest.ts`, `tests/e2e/p1-b-employee-shell.spec.ts`, `playwright.p1-b-employee-shell.config.ts`, `evidence/P1-B-EMPLOYEE-SHELL/`, state files.
