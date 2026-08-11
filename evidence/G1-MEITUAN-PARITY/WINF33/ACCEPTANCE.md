# G1-W∞-33 Consumer H5 store visual/IA densify toward Meituan App (MH5-03 commercial bar)

- slice: `G1-R-MEITUAN-H5-NEARBY-STORE` densify（商用前提：完整对标）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering densify; MH5-03 still PARTIAL→toward PARITY; not owner G1 sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner commercial bar: Consumer H5 must fully align to 美团 App 到店浏览. W2/W∞-13 delivered merchant bar copy + tool identity; this slice densifies **visual IA** on `/c/stores/[id]`.

## Delivered

| Change | Meituan App habit |
| ------ | ----------------- |
| Sticky yellow `storeTopBar` | back + centered store name + search pill |
| Cover hero `storeCover` | 118px banner + glyph fallback |
| Identity block | 营业中 badge + address + hours |
| Action row | 导航 / 电话 / 分享 icon buttons |
| Sticky `storeSubTabs` | 推荐 / 比价 / 活动 / 门店信息 anchors from module types |
| Gray canvas + white header card | matches W∞-32 discovery density |

## Boundaries preserved

- 推广员工具 · 商家入口页 / 不在此下单 / merchantToolNote
- Funnel bind, outbound navigation/phone, sync, storefront modules unchanged
- No native checkout

## Files changed

- `apps/consumer-web/app/c/stores/[id]/store.tsx`
- `apps/consumer-web/app/c/stores/[id]/store.module.css`
- `tests/g1-winf33-store-visual-parity.test.mjs`（新增，4 用例）

## Verify

```text
node --test tests/g1-winf33-store-visual-parity.test.mjs
node --test tests/g1-winf13-menu-store-home.test.mjs
pnpm --filter @oneday/consumer-web typecheck
pnpm --filter @oneday/consumer-web build
```

## Remaining to PARITY

Real rating/review row, coupon strip, category shortcuts, richer offer card grid before MH5-03 → inventory `PARITY`.
