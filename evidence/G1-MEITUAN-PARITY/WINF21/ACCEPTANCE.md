# G1-W∞-21 Tool-path experience parity — promoter-tool identity close-out

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·工具身份收尾）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

After W∞-18/19/20 turned page eyebrows and third-party platform naming toward the
**团购推广员工具** identity, residual store-ops framing and naming inconsistencies
persisted in four clusters: ① the persistent Management sidebar still branded the
whole product as **商家中心**（`AdminShell product` + loading/forbidden/hero copy +
`menu.ts` product-switcher label）; ② six `MANAGEMENT_MENU_CATALOG` nav labels still
framed native store-sales ops（门店管理/商品管理/订单中心/店铺装修/商家设置/经营建议）even
though their pages are honest entry/trace surfaces; ③ several Consumer hand-off
copies still said「美团/抖音等」without naming the strategy-preferred third party
扫呗（inconsistent with W∞-20's discovery/search/circles）; ④ the circle dashboard
per-merchant row still read「订单」instead of the honest entry-conversion metric.

## Boundaries

- No native checkout / no order fulfillment / no payments (MH5-07/08 stay external hand-off GAP).
- Text/copy + nav-label only; **no schema, no DB migration, no API change**.
- 扫呗 stays an external hand-off entry, never a first-party checkout.

## Delivered

1. **Management terminal — drop 商家中心 store-ops identity.**
   - `apps/management-web/app/management-shell.tsx`: `AdminShell product="推广员工具"`
     (renders sidebar brand + `aria-label "推广员工具 主导航"`); context default
     `'推广员工具 · 工作台'`.
   - `apps/management-web/app/page.tsx`: loading `正在加载推广员工具工作台`, forbidden
     `无法进入推广员工具工作台`, hero eyebrow `推广员工具 · 管理工作台`; workbench shortcut
     descs `店铺装修→入口页装修`, `商家设置→工具设置`.
   - `packages/contracts/src/menu.ts`: management product-switcher label `商家中心→推广员工具`.

2. **`MANAGEMENT_MENU_CATALOG` six nav labels reframed to entry / trace / workflow:**
   `门店管理→门店入口`、`商品管理→商品/套餐入口`、`订单中心→订单痕迹`、`店铺装修→入口页装修`、
   `商家设置→工具设置`、`经营建议→作业建议`.

3. **Consumer third-party naming consistency (扫呗 explicit), following W∞-20:**
   - `service.tsx` 成交经确认页跳转美团/抖音/扫呗等第三方
   - `channel.tsx` group-buy subtitle / menu 下单前往 / 会员不替代 / 服务历史不代表 — 全部补 `美团/抖音/扫呗`
   - `profile.tsx` 不代表美团/抖音/扫呗等第三方订单
   - `process.tsx` 不是美团/抖音/扫呗等第三方订单履约
   - `entry/consumer-entry.tsx` 成交在美团/抖音/扫呗等外部平台完成

4. **Honest metric label:** `platform-web/app/bc/dashboard/page.tsx` per-merchant row
   `订单 → 入口转化`（与同页「已确认入口转化」口径一致；不含本平台成交）.

## Verify

```text
node --test tests/g1-winf21-tool-path-experience.test.mjs    # 4/4 PASS
node --test tests/g1-winf*.test.mjs                          # 19/19 PASS (W∞-3..21)
node --test tests/sys-26-management-orphan-ia.test.mjs       # PASS (label 作业建议)
pnpm typecheck                                               # 20/20 packages PASS
pnpm build                                                   # 20/20 packages PASS
pnpm test:unit                                               # 47 passed
npx eslint <changed files>                                   # clean
```

`node --test --test-concurrency=1 tests/*.test.mjs` → 290 pass / 5 fail. The 5 failures
are the documented **pre-existing** ones, unchanged by this slice:
- `tests/tokens.vitest.ts`, `tests/sys-5-storefront-renderer.test.mjs` — stale
  design-token assertions against the retired green brand `#f3f8f4` (Meituan-yellow theme) — not touched here.
- `tests/hardening-001-security-contract`, `tests/hardening-002-e2e`,
  `tests/page-c-002-api`, `tests/sys-22-one-code-landing` — live-stack integration tests
  requiring a running API+DB at localhost, not started in this unattended turn.

`pnpm test:unit` → 47 passed, 2 failed (the same two pre-existing design-token failures).

## Dependent-test updates (consistent with new copy)

- `tests/g1-winf12-group-buy-membership.test.mjs` — `不替代美团/抖音会员` → `不替代美团/抖音/扫呗会员`.
- `tests/g1-winf10-profile-search.test.mjs` — `不代表美团/抖音等第三方订单` → `不代表美团/抖音/扫呗等第三方订单`.
- `tests/g1-winf18-admin-dashboards.test.mjs` — hero `推广员工具 · 商家中心` → `推广员工具 · 管理工作台`.
- `tests/sys-26-management-orphan-ia.test.mjs` + `tests/e2e/sys-26-...spec.ts` — `经营建议` → `作业建议`.
- `tests/e2e/p1-b-management-shell.spec.ts` + `tests/e2e/sys-29-admin-nav-groups.spec.ts` — sidebar
  `商家中心 主导航` → `推广员工具 主导航`.

## Integrity note

During the turn the scheduled local unattended daemon mutated
`evidence/MATRIX-GAP-WAVE-4/recovery-report.json` (a live DB recovery evidence artifact,
unrelated to this slice). It was reverted to HEAD and **not** committed.
