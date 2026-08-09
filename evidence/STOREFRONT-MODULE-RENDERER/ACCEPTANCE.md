# STOREFRONT-MODULE-RENDERER acceptance

## Result

`STOREFRONT_MODULE_RENDERER_PASS`. See `PROJECT_STATE/STOREFRONT_MODULE_RENDERER_ACCEPTANCE.md`.

## Verified commands

1. `pnpm --filter @oneday/api build`
2. `DATABASE_URL=postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test ONEDAY_ALLOW_TEST_DATABASE=1 pnpm db:test:prepare`
3. `DATABASE_URL=postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test pnpm --filter @oneday/database seed`
4. `node --test --test-concurrency=1 tests/storefront-module-renderer.test.mjs` — PASS (1/1)
5. `npx playwright test --config=playwright.storefront-module-renderer.config.ts` — PASS (1/1)

## Browser evidence

- `consumer-modules.png` — Consumer store home after Management publish with content_feed before quick_actions and banner_carousel hidden
