# COMMERCIAL UI FOUNDATION visual evidence

Status: Batch 1 in progress; this directory records a verified visual subsystem, not a Batch 1 acceptance result.

The common shell and primitive CSS is projected from `packages/design-tokens/foundation.css`; `packages/ui/foundation.css` is retained solely as the application compatibility import.

## Capture contract

- Consumer storefront at 390px and 1440px; its primary navigation is present and the 390px document does not overflow horizontally.
- Employee workbench at 390px; its five-item operating navigation and Mobile Shell session control are present.
- Management and Platform dashboards at 1440px; each has the role-specific Admin Shell, visible navigation, and integrated top-bar session control.
- Management customer assets at 1440px; the page uses the common Admin header, Button, StatusBadge and recovery states.

## Reproduction

Run `pnpm.cmd exec playwright test --config playwright.commercial-ui-foundation.config.ts` from the repository root. The configuration starts isolated API and web servers on ports 3210-3214 against the local human-pilot database and writes the five PNG files in this directory.

Result recorded on 2026-08-09: 3/3 Playwright tests passed.
