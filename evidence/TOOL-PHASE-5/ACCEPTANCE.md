# TOOL-PHASE-5 Saved DIY funnel views

- slice: `TOOL-PHASE-5-SAVED-VIEWS`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. Migration `060_entry_funnel_saved_views` — tenant-scoped saved DIY query configs (no deal/payment fields)
2. API: `GET/POST /api/v1/management/entry-funnel/saved-views` + `POST .../saved-views/:id/delete` (upsert by name)
3. `/m/entry-funnel` — save / load / delete DIY views

## Verify

- `pnpm db:migrate` → `060_entry_funnel_saved_views:Up`
- `node --test tests/tool-phase-5-saved-views.test.mjs`
- `pnpm --filter @oneday/api typecheck` + `build`
- `pnpm --filter @oneday/management-web typecheck` + `build`

## Next

- TOOL-PHASE-6 L2 completeness (circle / one-code / share pairing)
