# TOOL-PHASE-6 L2 completeness (circle / one-code / share)

- slice: `TOOL-PHASE-6-L2-COMPLETENESS`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. Consumer `/c/one-code/[code]` emits `visit` on `one_code` surface after resolve
2. Management `/m/circles` emits `circle_invite` / `circle_apply` via authenticated `POST .../management/entry-funnel/events`
3. Employee share create/open writes `share` / `share_open` into `entry_funnel_events` (server-side; no payment fields)
4. Summary `sharePairing` (sent / opened / paired distinct codes) + board metric cards

## Verify

- `node --test tests/tool-phase-6-l2-completeness.test.mjs`
- `pnpm --filter @oneday/api typecheck` + `build`
- `pnpm --filter @oneday/consumer-web typecheck` + `build`
- `pnpm --filter @oneday/management-web typecheck` + `build`

## Boundaries

- No native checkout / order fulfillment (不碰销售)
- Pairing is share_code open↔sent only; never third-party deal success
