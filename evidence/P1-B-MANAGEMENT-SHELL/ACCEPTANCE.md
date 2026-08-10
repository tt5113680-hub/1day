# P1-B Management/Platform shell — shared token-driven AdminShell chrome

- slice: `p1-b-management-shell`
- branch: `hardening/COMMERCIAL-COMPLETION`
- date: 2026-08-10 Asia/Shanghai
- goal: Retire the last raw-hex copies in the shared `@oneday/ui` **AdminShell** navigation chrome (the desktop sidebar + topbar used by **Management** and **Platform**), so the Management/Platform admin shells draw the whole shell palette from the same `var(--od-*)` foundation tokens / `color-mix()` used by the Consumer/Employee shells (CHARTER §1.2 no page-level hex stacking, §2 four-shell IA/data density, §6 design tokens + shared kit; BLUEPRINT Admin Shell §4.2).

## Scope (no PRD deviation; config-driven shared kit, no page-level patches)

1. `packages/design-tokens/foundation.css` — remapped every raw hex/rgb literal in the shared `.od-admin-shell*` chrome block (sidebar text, brand mark, product label, nav-group label, nav link/hover/active, context, topbar) to `var(--od-*)` tokens / `color-mix()`. **No raw hex remains in the admin-shell chrome.** Both Management (`apps/management-web/.../management-shell.tsx` → `AdminShell`) and Platform (`apps/platform-web/.../platform-shell.tsx` → `AdminShell`, incl. channel/circle product modes) inherit this cleaned shared shell automatically.
2. `tests/admin-shell-tokens.vitest.ts` — new contract test: `AdminShell` is a shared primitive; the `.od-admin-shell*` block projects into `foundation.css` via `var(--od-*)` + `color-mix()` and carries **no raw hex** (same assertion shape as the P1-B employee/consumer shell token tests).
3. `tests/e2e/p1-b-management-shell.spec.ts` + `playwright.p1-b-management-shell.config.ts` — L3 browser journey over the shared AdminShell: Management at 1440 (nav groups + active link), 768 (sidebar rail), 390 (mobile shell) and Platform `/p/dashboard` (平台治理 group + active link).
4. Regressions: `sys-29` (Management AdminShell nav groups), `sys-28` (Platform shell isolation / channel-only redirect), `sys-27` (Platform product homes + Employee chrome), `page-m-010` (Management permission-audit) — all PASS.

## Matrix mapping

| ID | Pri | Assertion | Evidence |
| -- | --- | --------- | -------- |
| UI-01 | P1 | Shared Design System token/component consistency; no raw hex in the AdminShell chrome | `tests/admin-shell-tokens.vitest.ts` (foundation.css projection + no-hex assertion over the `.od-admin-shell` block) |
| UI-02 | P1 | Responsive Management/Platform admin shells: desktop sidebar → tablet rail → mobile, active state across 390/768/1440 | Playwright `p1-b-management-shell.spec.ts` 2/2 + screenshots `management-shell-mobile-390/tablet-768/desktop-1440.png`, `platform-shell-desktop-1440.png` |
| M-01 | P0 | Tenant Manager/Owner Management menu + API by scope; front-end hide not a substitute for API reject (shell renders role IA) | Management journey at `/` — nav groups 经营运营/组织与权限 + `客户资产` deep link; `sys-29` regression |

## L1–L4 selves / gates

| Gate | Result |
| ---- | ------ |
| L1 typecheck | `pnpm typecheck` 20/20 PASS |
| L1 build | `pnpm build` 20/20 PASS (four webs + packages) |
| L1 unit | `pnpm test:unit` 11 files / 47 PASS (incl. new `admin-shell-tokens.vitest.ts` 2) |
| L3 Playwright | `pnpm exec playwright test --config playwright.p1-b-management-shell.config.ts` 2/2 PASS (Management 390/768/1440 + Platform 1440) |
| Regression | `sys-29` 1/1, `sys-28` 1/1, `sys-27` 1/1, `page-m-010` 2/2 — all PASS |
| Anthropomorphic | Real tenant-owner login → Management home with dense role IA (nav groups + deep customer link) → same shared shell across 1440/768/390; Platform admin reaches `/p/dashboard` 平台治理 group. CHARTER §5.2 #3 (老板) and #4 (平台) paths. No product-owner UI auto-sign. |
| Honest boundary | No business-data model change; chrome is design-token / menu-DTO driven from the shared kit; no HTML/script injection; no fake third-party delivery |

## Screenshots

- `management-shell-desktop-1440.png`
- `management-shell-tablet-768.png`
- `management-shell-mobile-390.png`
- `platform-shell-desktop-1440.png`
- (Playwright trace in `playwright-output/`)

## Commit scope

This slice commits: `packages/design-tokens/foundation.css` (`od-admin-shell` tokenization), `tests/admin-shell-tokens.vitest.ts`, `tests/e2e/p1-b-management-shell.spec.ts`, `playwright.p1-b-management-shell.config.ts`, `evidence/P1-B-MANAGEMENT-SHELL/`, state files.

Note: marks the `p1-b-management-shell` milestone PASS in `PHASE1_PROGRESS.json`; the same shared-admin-shell cleanup also benefits `p1-b-platform-shell` (its separate Polish milestone tracked separately). Not 全部商用; no product-owner UI auto-sign.
