# evidence/SYS-5

- result: SYS_5_VISUAL_PASS (after SYS_5_SCAFFOLD_PASS); banner + quick-actions paint extracted
- package: `@oneday/storefront-renderer` (+ `storefront.css`, chrome, tokens, `StorefrontBannerCarousel`, `StorefrontQuickActions`)
- unit: `tests/storefront-renderer.vitest.ts` 7/7
- contract: `tests/sys-5-storefront-renderer.test.mjs` 2/2
- acceptance: `PROJECT_STATE/SYS_5_ACCEPTANCE.md`
- note: Consumer store CSS hex retired to `--od-sf-*`. Member/Offers paints remain in Consumer. Not 全部商用.
