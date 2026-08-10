# P1-B Consumer Shell — shared token-driven navigation chrome

- slice: `p1-b-consumer-shell`
- branch: `hardening/COMMERCIAL-COMPLETION`
- date: 2026-08-10 Asia/Shanghai
- goal: Consolidate the Consumer navigation chrome (mobile bottom tabs + desktop top bar) onto the shared `@oneday/storefront-renderer` token system so the Consumer storefront **modules and navigation draw from ONE design-token palette**, and E/M/P admin shells share the same `@oneday/ui` token foundation (CHARTER §2 four-shell IA, §6 design tokens + shared kit, §7.1 menu DTO + tokens; BLUEPRINT storefront renderer).

## Scope (no PRD deviation; no page-level hex patches)

1. `packages/storefront-renderer/src/tokens.ts` — added a `nav` token group (inactive / accent / active-ink / active-icon-bg / glass / desktop-border / invert-text) so the Consumer chrome is data-driven, not hard-coded page colours.
2. `packages/storefront-renderer/storefront.css` — added `.od-consumer-nav--bottom` / `--desktop` / `__link` / `--active` primitives. All colour derives from `var(--od-sf-nav-*)` aliases of existing storefront tokens / `var(--od-*)` foundation tokens — **no raw hex in the new chrome**.
3. `packages/storefront-renderer/src/nav.tsx` — added a shared `ConsumerStorefrontNav` component that renders identical bottom + desktop nav from the same tab list + active key.
4. `packages/storefront-renderer/src/types.ts` — added `ConsumerNavTab`.
5. `packages/storefront-renderer/src/index.ts` — exported `ConsumerStorefrontNav` and `ConsumerNavTab`.
6. `apps/consumer-web/app/c/consumer-shell.tsx` — `ConsumerShell` now renders the shared `ConsumerStorefrontNav` and imports the shared `storefront.css`; **removed the per-page `consumer-shell.module.css`** whose raw hex duplicated the storefront palette (CHARTER §1.2: no page-level hex patch stacking).
7. All other Consumer routes that use `ConsumerShell` (`service`, `action`, `channel`) inherit the shared token nav automatically.

## Matrix mapping

| ID | Pri | Assertion | Evidence |
| -- | --- | --------- | -------- |
| UI-01 | P1 | Shared Design System token/component consistency; no raw hex in new chrome primitives | `tests/storefront-shell-tokens.vitest.ts` (token palette + storefront.css projection, no-hex assertion); shared `ConsumerStorefrontNav` used by all Consumer routes |
| UI-02 | P1 | Responsive: mobile bottom nav → tablet centred → desktop sticky top nav with active state across 390/768/1440 | Playwright `p1-b-consumer-shell.spec.ts` + screenshots `consumer-shell-mobile-390/tablet-768/desktop-1440.png` |
| C-02 | P1 | Same Consumer app stores identical nav semantics across phone / tablet / PC | Playwright nav presence + `aria-current=page` active state at three viewports; store page + module renderer verified together |

## L1–L4 selves / gates

| Gate | Result |
| ---- | ------ |
| L1 typecheck | `pnpm typecheck` 20/20 PASS |
| L1 build | `pnpm build` 20/20 PASS (four webs + packages) |
| L1 unit | `pnpm test:unit` 9 files / 43 PASS (incl. new `storefront-shell-tokens.vitest.ts` 3) |
| L3 Playwright | `pnpm exec playwright test --config playwright.p1-b-consumer-shell.config.ts` 1/1 PASS (390 / 768 / 1440) |
| Regression | `pnpm exec playwright test --config playwright.storefront-module-renderer.config.ts` 1/1 PASS (module order + hidden still correct) |
| Anthropomorphic | Fresh tenant provisioned → owner login → page-templates → published storefront read on the real Consumer store page (消费者 3 秒懂门店 / 可操作导航 path, CHARTER §3.4 / §5.2 #1 baseline) |
| Honest boundary | No fake third-party live pricing; no new business data model; no HTML/script injection; chrome is data/token-driven from the shared renderer |

## Screenshots

- `consumer-shell-mobile-390.png`
- `consumer-shell-tablet-768.png`
- `consumer-shell-desktop-1440.png`
- (Playwright trace in `playwright-output/`)

## Commit scope

This slice commits: `packages/storefront-renderer` (`src/tokens.ts`, `src/nav.tsx`, `src/types.ts`, `src/index.ts`, `storefront.css`), `apps/consumer-web/app/c/consumer-shell.tsx` (+ deleted `consumer-shell.module.css`), `tests/storefront-shell-tokens.vitest.ts`, `tests/e2e/p1-b-consumer-shell.spec.ts`, `playwright.p1-b-consumer-shell.config.ts`, `evidence/P1-B-CONSUMER-SHELL/`, state files.
