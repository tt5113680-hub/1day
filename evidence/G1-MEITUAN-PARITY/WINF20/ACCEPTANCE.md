# G1-W∞-20 Third-party platform-naming consistency (saabei/external)

- slice: `G1-W∞-20` tool-path gaps — 体验对标细部（仍不做本平台下单）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Problem

Across the Consumer aggregation surfaces the strategy-mandated preferred self-op
third party **扫呗 (saabei)** was never named: it collapsed to the generic
「其他平台」 label, the fallback 「荐」 glyph and the `external` mark colour — even though
`StoreDetail.platformOffers.externalLinks` accept `platformType: 'saabei'` and the
product strategy (`PRODUCT_DUAL_TRACK_STRATEGY.md` §0/§1) states 自营 = 第三方、首选
扫呗小程序 + 收银. The service detail page also typed platform offers as
`'meituan' | 'douyin' | 'external'` despite the API returning any
`external_actions.platform` (can be `saabei`).

## Delivered (text/copy + shared renderer, no data-model change)

1. **Shared `@oneday/storefront-renderer`** (`src/paint.tsx`): added
   `storefrontPlatformName` (美团团购/抖音团购/扫呗平台/其他平台·外链), `storefrontPlatformMarkClass`
   (saabei keeps its own mark, not folded into external), and `storefrontPlatformGlyph('saabei') → '扫'`.
   Exported all three from `src/index.ts`.
2. **`storefront.css`**: added `--od-sf-platform-saabei` token and
   `.od-sf-platform-mark--saabei` so the shared OfferCompare marks 扫呗 distinctly.
3. **`/c/stores/[id]` group-buy + menu channel** (`channel.tsx`): `platformName()` now names
   扫呗/外链; badge glyphs in the platform legend and package rows render `扫` for saabei.
4. **`/c/services/[id]` service detail** (`service.tsx`): widened `PlatformOffer.platformType`
   to include `'saabei'` (matches API) and `platformLabel()` names 扫呗 explicitly.

Honest boundary retained: every touched surface still states 不在此下单 / 非本平台下单;
扫呗 is presented as 第三方外链, **not** as an ONEDAY checkout.

## Boundaries

- No native checkout / no order fulfillment (MH5-07/08 remain external hand-off GAP).
- Copy/render consistency only; no migrations, no API schema, no DB change.
- 扫呗 stays an external hand-off entry, not a first-party payment.

## Verify

```text
node --test tests/g1-winf20-platform-naming.test.mjs          # 1/1 PASS
node --test tests/g1-winf19-tool-path-gaps.test.mjs           # 1/1 regression PASS
node --test tests/g1-winf*.test.mjs                           # 18/18 PASS (W∞-3..20)
pnpm typecheck                                               # 20/20 packages PASS
pnpm build                                                   # 20/20 packages PASS
pnpm test:unit                                               # 47 passed
npx eslint <changed files>                                   # clean
```

`pnpm test:unit` still reports the 2 documented **pre-existing** design-token failures
(`tests/tokens.vitest.ts`, `tests/storefront-renderer.vitest.ts` asserting the retired
green brand `#f3f8f4` against the Meituan-yellow `#fffbea` introduced in G1 parity work).
This slice does not touch design tokens and introduced no new failures.
