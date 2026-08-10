# P1-B Platform shell — retire raw-hex in the Platform product shell chrome

- slice: `p1-b-platform-shell`
- branch: `hardening/COMMERCIAL-COMPLETION`
- date: 2026-08-10 Asia/Shanghai
- goal: Retire the last raw-hex fallbacks in the **Platform product shell chrome** (`apps/platform-web/app/platform-shell.module.css` and `apps/platform-web/app/platform-product-home.module.css`) so the Platform admin shell draws its whole palette from the shared `var(--od-*)` foundation tokens / `color-mix()` — the same single-source palette used by the Consumer / Employee / Management shells (CHARTER §1.2 no page-level hex stack, §2 four-shell IA/data density, §6 design tokens + shared kit, §7.1 AdminShell product modes).

## Scope (no PRD deviation; config-driven shared kit, no arbitrary low-code)

1. `apps/platform-web/app/platform-shell.module.css` — removed the hard-coded `#1f4d2e` fallback from the mode-switcher hover/active states: `var(--od-brand-800, #1f4d2e)` → `var(--od-brand-800)`. The file now carries **no raw hex**.
2. `apps/platform-web/app/platform-product-home.module.css` — removed the `#1f4d2e` fallback from `.boundary`, `.switcher a[aria-current]`, and `.actions a` (→ `var(--od-brand-800)`), and replaced the raw `#fff` inside a `color-mix()` with the `--od-surface` token. The file now carries **no raw hex**.
3. `tests/platform-shell-tokens.vitest.ts` — new token-contract test: asserts the Platform shell + product-home chrome CSS project via `var(--od-*)` / `color-mix()` and carry **no raw hex** (same assertion shape as the P1-B consumer/employee/admin shell token tests).
4. `tests/e2e/p1-b-platform-shell.spec.ts` + `playwright.p1-b-platform-shell.config.ts` — L3 browser journey over the real Platform admin login → `/p/dashboard`, asserting the shared token-driven AdminShell chrome (平台治理 nav group, active link) and the product-home card render across 390 / 768 / 1440.

## Matrix mapping

| ID | Pri | Assertion | Evidence |
| -- | --- | --------- | -------- |
| UI-01 | P1 | Shared Design System token/component consistency; no raw hex in the Platform shell chrome | `tests/platform-shell-tokens.vitest.ts` (no-hex assertion over both Platform shell chrome CSS) |
| UI-02 | P1 | Responsive Platform admin shell: desktop sidebar → tablet rail → mobile across 390/768/1440 | Playwright `p1-b-platform-shell.spec.ts` 1/1 + screenshots `platform-shell-desktop-1440.png`, `platform-shell-tablet-768.png`, `platform-shell-mobile-390.png` |
| P-01 | P0 | Platform admin reaches `/p/dashboard` under the token-driven shared shell | same Playwright (real admin login, 平台治理 group visible) |

## L1–L4 selves / gates

| Gate | Result |
| ---- | ------ |
| L1 typecheck | `pnpm typecheck` 20/20 PASS |
| L1 build | `pnpm build` 20/20 PASS (four webs + packages; platform-web rebuilt from source) |
| L1 unit | `pnpm test:unit` 12 files / 49 PASS (incl. new `platform-shell-tokens.vitest.ts` 2) |
| L3 Playwright | `pnpm exec playwright test --config playwright.p1-b-platform-shell.config.ts` 1/1 PASS (platform-admin `/p/dashboard` 390/768/1440) |
| Evidence contract | `pnpm evidence:check` 74/74 PASS |
| Lint | `eslint` on added spec + config + token test: clean |
| Anthropomorphic | Real platform-owner login (tenant `00000000-0000-4000-8000-000000000001`, `admin@system.local` on the isolated `oneday_v3_test` DB) → `/p/dashboard` product home + shared admin sidebar → 390/768/1440. CHARTER §5.2 #4 (平台) path. The change is design-token-only; no product-owner UI auto-sign. |
| Honest boundary | No business-data/model change; chrome is design-token / menu-DTO driven; no HTML/script injection; no fake third-party delivery |

## Screenshots

- `platform-shell-desktop-1440.png`
- `platform-shell-tablet-768.png`
- `platform-shell-mobile-390.png`
- (Playwright trace in `playwright-output/`)

## Commit scope

`apps/platform-web/app/platform-shell.module.css`, `apps/platform-web/app/platform-product-home.module.css`, `tests/platform-shell-tokens.vitest.ts`, `tests/e2e/p1-b-platform-shell.spec.ts`, `playwright.p1-b-platform-shell.config.ts`, `evidence/P1-B-PLATFORM-SHELL/`, state files.

Note: marks the `p1-b-platform-shell` milestone PASS in `PHASE1_PROGRESS.json`. Not 全部商用; no product-owner UI auto-sign.
