# P1-B UI Kit — shared Table + Modal slice acceptance

- slice: `p1-b-ui-kit`
- branch: `hardening/COMMERCIAL-COMPLETION`
- date: 2026-08-10 Asia/Shanghai
- goal: extend `@oneday/ui` with dense **Table** and accessible **Modal** primitives so Management/Platform dense views converge on the design system (CHARTER §2 desktop table+filter; §4 data density; §7 config-driven; BLUEPRINT §4.1 "按钮、输入、选择、表格、状态徽标、空态…弹层、抽屉").

## Scope (no PRD deviation; no page-level hex patches)

1. `packages/ui/src/components.tsx` — added generic `Table<T>` (columns/rows/rowKey/empty) with dense scan-friendly rendering, and `Modal` (backdrop + `role="dialog"` + `aria-modal` + close button + footer).
2. `packages/ui/src/index.ts` — exported `Table`, `Modal`, `TableColumn`, `TableProps`, `ModalProps`.
3. `packages/design-tokens/foundation.css` — added token-based `.od-table*` and `.od-modal*` styles (no raw hex; uses `var(--od-*)`).
4. `apps/management-web/app/m/permission-audit/page.tsx` — adopted the shared `Table` for the dense audit list and the shared `Modal` for the evidence detail (replacing bespoke page-level list markup).
5. `tests/ui-kit.vitest.ts` — design-system contract test (component exports, dense-list/dialog types, token CSS projection).
6. `tests/e2e/management-permission-audit.spec.ts` — Playwright asserts the shared `Table` (`permission-audit-table`) and `Modal` (`permission-audit-modal`) render and evidence opens.

## Matrix mapping

| ID | Pri | Assertion | Evidence |
| -- | --- | --------- | -------- |
| UI-01 | P1 | Shared Design System token/component consistency; no raw hex in new primitives | `tests/ui-kit.vitest.ts`; foundation.css projection; `permission-audit-table` DOM assertion |
| UI-02 | P1 | Dense admin list render; 1440px desktop audit list scans | Playwright `management-permission-audit-desktop-v3-table-modal.png` |
| UI-03 | P1 | Loading/empty/error/forbidden + confirm/detail feedback | Shared Modal evidence detail; AppStatePanel retained; forbidden recovery test |

## Gates

| Gate | Result |
| ---- | ------ |
| L1 typecheck | `pnpm typecheck` 20/20 PASS |
| L1 build | `pnpm build` 20/20 PASS (all four webs + packages) |
| L1 unit | `pnpm test:unit` 8 files / 40 tests PASS (incl. `ui-kit.vitest.ts` 3 tests) |
| L3 Playwright | `pnpm exec playwright test --config playwright.page-m-010.config.ts` 2/2 PASS |
| Honest boundary | No fake third-party live pricing; no new business data model; no HTML/script injection; components are config/token-driven |

## Screenshots

- `../PAGE-M-010/management-permission-audit-desktop-v3-table-modal.png`

## Commit scope

This slice commits: `packages/ui`, `packages/design-tokens`, `apps/management-web/app/m/permission-audit`, `tests/ui-kit.vitest.ts`, `tests/e2e/management-permission-audit.spec.ts`, `evidence/PAGE-M-010`, state files.
