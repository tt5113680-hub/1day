# G1-W∞-29 Tool-path experience parity — residual `顾客` customer terminology aligned to the promoter-tool identity

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·工具身份收尾·顾客→客户）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

W∞-24 aligned the `/m/customers` pages (list + `[id]` detail) to the promoter-tool identity
**`客户跟进` / `客户`**. A final sweep found the **navigation catalog and tool workbench surfaces** still used
the ambiguous store-ops **`顾客`** terminology for the exact same customer surface, contradicting the tool
identity and the canonical `客户跟进` page eyebrow:

- Management nav item pointed to `/m/customers` but was labelled `顾客管理`, and the nav group header was `顾客`.
- Management workbench dashboard (`/m` home hero) called the same surface `顾客`/`顾客管理`/`顾客总数`.
- Employee workbench shortcut to `/e/customers` was labelled `顾客` while its description already said `客户档案`.

## Delivered (tool-identity `顾客` → `客户`/`客户跟进` alignment)

| Surface | Old (store-ops 顾客) | New (tool identity) |
| ------- | -------------------- | ------------------- |
| `packages/contracts/src/menu.ts` `MENU_GROUP_LABELS.customer` | 顾客 | 客户 |
| `packages/contracts/src/menu.ts` `MANAGEMENT_MENU_CATALOG` customers item | 顾客管理 | 客户跟进 |
| `apps/management-web/app/page.tsx` shortcut | label 顾客 / desc 顾客管理 | label 客户 / desc 客户跟进 |
| `apps/management-web/app/page.tsx` workbench loading | 正在汇总今日门店、顾客与待办 | …、客户与待办 |
| `apps/management-web/app/page.tsx` today strip | 今日顾客 | 今日客户 |
| `apps/management-web/app/page.tsx` 作业数据 link | 顾客管理 → | 客户跟进 → |
| `apps/management-web/app/page.tsx` metric card | hint 顾客总量 / label 顾客总数 | 客户总量 / 客户总数 |
| `apps/employee-web/app/e/workbench/workbench.tsx` shortcut | label 顾客 / desc 客户档案 | label 客户 / desc 客户档案 |

## Boundaries / deliberately NOT touched

- **No schema / DB migration / API / RBAC change.** Pure Text/copy + nav-label alignment.
- **`apps/management-web/app/m/circles`、consumer 商圈、channel/`/p`/`/bc` 网络身份** keep their `顾客`-free
  network identity wording as before; this slice did not touch circle/channel pages.
- Honest no-sales boundary preserved everywhere（`非本平台下单`/`不在此下单`/`成交以第三方平台为准` unchanged）.
- No native checkout / no order fulfillment / no payments revived.

## Files changed

- `packages/contracts/src/menu.ts`（group label + customers nav label）— icon/library only, no runtime data shape change.
- `apps/management-web/app/page.tsx`（workbench dashboard copy, 5 spots）
- `apps/employee-web/app/e/workbench/workbench.tsx`（customer shortcut label）
- `tests/e2e/sys-29-admin-nav-groups.spec.ts`（`顾客`→`客户`, `顾客管理`→`客户跟进`）
- `tests/e2e/p1-b-management-shell.spec.ts`（`顾客管理`→`客户跟进`）
- `tests/g1-winf29-customer-tool-copy.test.mjs`（新增，4 用例）

## Verify

```text
node --test tests/g1-winf29-customer-tool-copy.test.mjs   # 4/4 PASS
node --test tests/g1-winf*.test.mjs                       # 68/68 PASS (W∞-3..29)
node --test tests/sys-6-menu-dto.test.mjs tests/sys-29-admin-nav-groups.test.mjs \
  tests/g1-winf13-menu-store-home.test.mjs tests/g1-winf12-group-buy-membership.test.mjs # 7/7 PASS
pnpm typecheck                                           # 20/20 PASS
pnpm build                                               # 20/20 PASS
pnpm test:unit                                           # 47 passed / 2 pre-existing token failures
npx eslint <changed files>                                # clean
```

`pnpm test:unit` 的 2 个失败仍是已记录的 **pre-existing** 设计令牌陈旧断言
（`tokens.vitest.ts`、`storefront-renderer.vitest.ts` 对照已退休的绿色品牌），与本切片无关。
本切片未触碰 design tokens。

## Integrity note

本切片为纯文案 / aria / 导航 label 对齐，未改 schema/DB/API，不复活本平台下单/收单。
仓库级 `grep` 确认工具身份面的 UI TSX 不再出现 `顾客`（唯一残留为 `scripts/generate-commercial-fixtures.mjs` /
`tests/page-m-commerce.test.mjs` 的 **SQL 种子数据字符串**，标注 TEST ONLY，非 UI copy，未触碰）。
管理端客户导航（客户跟进）与页面眉标（推广员工具 · 客户跟进）现已一致。
