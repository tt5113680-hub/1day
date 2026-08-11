# G1-W∞-32 Consumer H5 discovery visual/IA densify toward Meituan App (MH5-01 commercial bar)

- slice: `G1-R-MEITUAN-H5-NEARBY-STORE` densify（商用前提：完整对标）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering densify; MH5-01 still PARTIAL→toward PARITY; not owner G1 sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Premise

Owner 2026-08-11 21:47: **完整对标是商用前提。** Consumer H5 must fully align to 美团 App 到店浏览.
Prior W2/W∞-11 delivered shell + tool-identity copy; this slice densifies **visual IA** so discovery no longer reads as a generic enterprise white panel.

## Delivered

| Change | Meituan App habit |
| ------ | ----------------- |
| Sticky yellow top bar | locate chip + white search pill |
| Underline tabs 附近/推荐/商圈 | replace pill chips |
| Tab panels (`hidden`) | one feed at a time |
| Merchant cards | 72px thumb + name / score / 月售 / km / address / tags |
| Gray page `#f5f5f5` + white cards | App list density |
| Compact disclaimer | remove oversized display H1 |
| Sort chips 距离/好评/人气 | under tabs |

## Boundaries preserved

- 不在此下单 / 全平台可见引流 / 本地试用提示 / 推广员工具 eyebrow
- No native checkout / no live Meituan rating API
- Funnel bind + merchant open tracking unchanged

## Verify

```text
node --test tests/g1-winf32-discovery-visual-parity.test.mjs
node --test tests/g1-winf11-discovery-nearby.test.mjs tests/g1-winf5-circles-densify.test.mjs
pnpm --filter @oneday/consumer-web typecheck
pnpm --filter @oneday/consumer-web build
```

## Remaining to PARITY

Need further densify (filters/categories row, real store images, filter drawer) before MH5-01 can flip to inventory `PARITY`.
