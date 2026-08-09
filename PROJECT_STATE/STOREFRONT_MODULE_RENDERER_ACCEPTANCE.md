# STOREFRONT MODULE RENDERER ACCEPTANCE

## Result

`STOREFRONT_MODULE_RENDERER_PASS`

## Delivered boundary

- Consumer store home renders from published `storefront.modules` order.
- Modules with `config.visible === false` are omitted from the Consumer DOM.
- Transitional hard-coded Banner/shortcut arrays are removed from the store home; `banner_carousel` and `quick_actions` render from module config + domain data.
- Fixed five-tab Consumer shell remains for the authorized transition; tabs are not driven by `operating_channels`.
- Management draft reorder/hide → publish continues to use the same Consumer renderer (preview and published).

## Verified evidence

- `tests/storefront-module-renderer.test.mjs`: 1/1 — published module order and visibility project into `storefront.modules`.
- `playwright.storefront-module-renderer.config.ts`: 1/1 — Consumer DOM order matches visible modules; hidden `banner_carousel` absent; screenshot in `evidence/STOREFRONT-MODULE-RENDERER/`.
- Workspace gates: `format:check`, `lint`, 18-workspace `typecheck`, 18-workspace `build`, repository `test`, and `evidence:check` verified before acceptance commit.

## Authorized continuation

Matrix gap close-out per authorization A, still without page-level patches or arbitrary low-code.
