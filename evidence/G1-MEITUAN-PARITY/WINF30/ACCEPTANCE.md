# G1-W∞-30 Tool-path experience parity — residual `ONEDAY /` eyebrow prefix removed on management/employee tool surfaces

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·工具身份收尾·ONEDAY / 眉标前缀去除）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

W∞-25 aligned most Management page eyebrows to **`推广员工具 · <菜单label>`** without the legacy
`ONEDAY /` product prefix. A final sweep found **7 management/employee tool-identity surfaces** still
using `ONEDAY /` in eyebrows or hero `<p>` tags, inconsistent with the canonical promoter-tool chrome.

## Delivered (`ONEDAY /` → `推广员工具 ·` on tool surfaces)

| Surface | Old | New |
| ------- | --- | --- |
| `/m/attribution` eyebrow | ONEDAY / 推广员工具 · 来源归因 | 推广员工具 · 来源归因 |
| `/m/entry-funnel` eyebrow | ONEDAY / 推广员工具 · 入口痕迹 | 推广员工具 · 入口痕迹 |
| `/m/circles` eyebrow | ONEDAY / 推广员工具 · 商圈双身份 | 推广员工具 · 商圈双身份 |
| `/m/customers/[id]` eyebrow | ONEDAY / 客户跟进全链路 · {segment} | 推广员工具 · 客户跟进 · {segment} |
| `/e/share` hero | ONEDAY / 推广员工具 · 获客分享 | 推广员工具 · 获客分享 |
| `/e/tasks/[id]/follow-up` hero | ONEDAY / 任务跟进 | 推广员工具 · 任务跟进 |
| `/e/customers/[id]` hero | ONEDAY / 我的客户 | 推广员工具 · 我的客户 |

## Boundaries / deliberately NOT touched

- **Platform / channel / circle governance pages** (`/p/*`, `/ch/*`, `/bc/*`) keep `ONEDAY /` as platform identity chrome.
- **Consumer** landing stub (`apps/consumer-web/app/page.tsx`) unchanged.
- Loading state on `/m/customers/[id]` still says `正在加载客户跟进全链路` (W∞-24 honest state copy; not an eyebrow).
- No schema / DB / API / RBAC change. Text/copy/aria-only.

## Files changed

- `apps/management-web/app/m/attribution/page.tsx`
- `apps/management-web/app/m/entry-funnel/page.tsx`
- `apps/management-web/app/m/circles/page.tsx`
- `apps/management-web/app/m/customers/[id]/page.tsx`
- `apps/employee-web/app/e/share/share-codes.tsx`
- `apps/employee-web/app/e/tasks/[id]/follow-up/follow-up.tsx`
- `apps/employee-web/app/e/customers/[id]/customer-detail.tsx`
- `tests/g1-winf30-oneday-eyebrow-copy.test.mjs`（新增，4 用例）

## Verify

```text
node --test tests/g1-winf30-oneday-eyebrow-copy.test.mjs   # 4/4 PASS
node --test tests/g1-winf*.test.mjs                       # 72/72 PASS (W∞-3..30)
pnpm typecheck                                           # 20/20 PASS
pnpm build                                               # 20/20 PASS
```

Management + Employee `app/**/*.tsx` grep confirms **zero** `ONEDAY /` remnants on tool surfaces.
