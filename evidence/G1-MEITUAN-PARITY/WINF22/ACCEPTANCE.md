# G1-W∞-22 Tool-path experience parity — Management orders-page trace framing

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·订单痕迹语裁定档）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

After W∞-19/20/21 turned page eyebrows, nav labels, and third-party naming toward
the **团购推广员工具** identity, one residual store-ops surface remained: the
Management `/m/orders` page (`apps/management-web/app/m/orders/page.tsx`). W∞-21
changed the `MANAGEMENT_MENU_CATALOG` label to **订单痕迹**, but the page itself still
branded itself **订单中心**（title）and presented **native payment / fulfillment
metrics** in the summary strip — `订单数`、`已支付/核销`、`本列表金额` — implying the
tool owns/native-orders/payments, which conflicts with the charter "不碰钱、不碰销售、
不碰订单履约" boundary and the promotion-tool identity.

## Boundaries

- No native checkout / no order fulfillment / no payments (MH5-07/08 stay external hand-off GAP).
- Text/copy + IA metric-label reframing only; **no schema, no DB migration, no API change**.
- The existing `customer_orders` archive rows stay untouched; only their on-page framing is
  relabelled honestly as staged third-party/trace records.

## Delivered

`apps/management-web/app/m/orders/page.tsx`:

1. **Title + header aligned to trace / menu label.**
   - `title 订单中心 → 订单痕迹`（matches W∞-21 menu label `订单痕迹`）.
   - `eyebrow 推广员工具 · 订单档案 → 推广员工具 · 订单痕迹`.
   - `description` reframed: "第三方成交/跳转档案（本地试点，租户隔离）…不包含本平台收款，不代表第三方订单履约."
   - loading `正在加载订单痕迹`, forbidden `无权查看订单痕迹`, error `订单痕迹暂不可用`,
     empty `暂无订单痕迹` / "接入渠道跳转/结算源后可在此聚合第三方成交痕迹".

2. **Summary metrics reframed from native payment/fulfillment to honest archive counts.**
   - `订单数 → 档案记录数`
   - `已支付/核销 → 状态为有效的记录`
   - `本列表金额 → 记录金额参考`
   - `门店 → 涉及门店`

3. **Honest no-native boundary strengthened.**
   - honest note now reads: "订单痕迹为本地试点档案（source=local）。推广员工具只留档案痕迹；
     不接美团实时订单，不伪造第三方成交，不包含本平台收款，非本平台下单。"

## Verify

```text
node --test tests/g1-winf22-order-trace.test.mjs    # 3/3 PASS
node --test tests/g1-winf*.test.mjs                 # 25/25 PASS (W∞-3..22)
pnpm typecheck                                      # 20/20 packages PASS
pnpm build                                          # 20/20 packages PASS
pnpm test:unit                                      # 47 passed
npx eslint <changed files>                          # clean
```

Full `node --test --test-concurrency=1 tests/*.test.mjs` → 292 pass / 6 fail. The 6 failing
test files are the documented **pre-existing** live-stack/design-token ones, unchanged by this
slice:
- `hardening-001-security-contract`, `hardening-002-e2e`, `page-c-002-api`,
  `page-c-consumer-search`, `sys-22-one-code-landing` — live-stack integration tests
  requiring a running API+DB at localhost (ECONNREFUSED), not started this unattended turn.
- `sys-5-storefront-renderer` (2) — stale design-token assertions vs the retired green brand.

## Dependent-test updates (consistent with new copy)

- `tests/g1-winf17-workbench-commerce.test.mjs` — orders eyebrow `推广员工具 · 订单档案` → `推广员工具 · 订单痕迹`.

## Integrity note

During the turn the scheduled local unattended daemon again mutated
`evidence/MATRIX-GAP-WAVE-4/recovery-report.json` (a live DB recovery evidence artifact,
unrelated to this slice). It was reverted to HEAD and **not** committed.
