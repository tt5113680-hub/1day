# G1-W∞-28 Tool-path experience parity — residual store-ops `经营` copy aligned to promoter-tool identity

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·工具身份收尾·残留 `经营` store-ops 语裁定档）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

W∞-21..27 aligned Management eyebrows, nav labels, `/m/settings`, `/m/customers` and the forbidden/loading/error
states to the promoter-tool identity. A final sweep, however, found residual standalone `经营` store-ops wording
(not the `经营管理` phrase already retired in W∞-27) still describing tenant tool access/follow-up/entry on
Management and Employee tool-identity surfaces, contradicting the tool identity.

## Delivered (management-layer residual sweep)

| Page | Old (store-ops) | New (tool identity) |
| ---- | --------------- | ------------------- |
| `/m` 404 | 没有找到经营页面 / 经营功能 | 没有找到工具页面 / 推广员工具功能 |
| `/m/attribution` loading | 员工贡献与经营证据 | 员工贡献与入口证据 |
| `/m/attribution` disclaimer | 描述入口与经营承接 | 描述入口分流与承接 |
| `/m/ai-suggestions` empty | 当经营异常或可优化信号… | 当入口异常或可优化信号… |
| `/m/page-builder` legend | 经营频道（最多 3 个） | 入口频道（最多 3 个） |
| `/m/offers` default priceSource | 商户经营后台登记 | 商户后台登记 |
| `/m/roles-permissions` perm names | 查看租户经营 / 管理租户经营 | 查看租户工具 / 管理租户工具 |
| `/m/customers/[id]` anomaly | aria-label="经营异常" | aria-label="跟进异常" |

## Delivered (employee-layer residual sweep)

| Page | Old (store-ops) | New (tool identity) |
| ---- | --------------- | ------------------- |
| `/e` global loading | 正在准备经营工作台 | 正在准备推广员工具工作台 |
| `/e/nurture` error | 客户经营队列未能完成加载 | 客户跟进队列未能完成加载 |
| `/e/notifications` loading | 任务与经营提醒 | 任务与工具提醒 |
| `/e/share` revoke msg | 后续扫码不会进入经营入口 | 后续扫码不会进入工具入口 |
| `/e/share` create hint | 默认进入消费者经营入口 | 默认进入消费者入口 |
| `/e/profile` perm names | 查看租户经营 / 管理租户经营 | 查看租户工具 / 管理租户工具 |
| `/e/store` heading | 门店经营首页 | 门店入口首页 |
| `/e/store` empty note | 店长经营能力需要门店任命后才会出现 | 店长入口能力需要门店任命后才会出现 |
| `/e/store` section | aria-label="店长经营能力包" | aria-label="店长入口能力包" |

## Boundaries / deliberately NOT touched

- **商圈/渠道网络身份按主人边界保留**：`apps/management-web/app/m/circles` 页的「经营者/经营自己的商圈」措辞、
  consumer `apps/consumer-web` 商圈 `本店经营`、channel「返回经营首页」——这些属 W∞-27 明确的商圈/渠道网络身份保留面，
  不在本切片「推广员工具工具身份面」范围内。
- No native checkout / no order fulfillment / no payments（MH5-07/08 仍为外链 hand-off GAP）。
- Text/copy/aria-only；**无 schema、无 DB migration、无 API 变更**，无 RBAC/permission 变更。
- 诚实无销售边界全保留（不碰钱/不碰销售/不碰管理；全平台可见引流 · 不碰销售成交）。

## Files changed

- `apps/management-web/app/not-found.tsx`
- `apps/management-web/app/m/{attribution,ai-suggestions,page-builder,offers,roles-permissions}/…`
- `apps/management-web/app/m/customers/[id]/page.tsx`
- `apps/employee-web/app/loading.tsx`
- `apps/employee-web/app/e/{nurture,notifications,share,profile,store}/*.{tsx,tsx}`
- `tests/e2e/batch-2-offers.spec.ts`, `tests/e2e/sys-27-s3-role-ia.spec.ts`（随动断言）
- `tests/batch-2-offer-operations.test.mjs`, `tests/matrix-mg-g-depth.test.mjs`（断言输入 `商户后台登记`）
- `tests/g1-winf28-tool-residual-ops-copy.test.mjs`（新增，15 用例）

## Verify

```text
node --test tests/g1-winf28-tool-residual-ops-copy.test.mjs  # 15/15 PASS
node --test tests/g1-winf*.test.mjs                          # 64/64 PASS (W∞-3..28)
pnpm typecheck                                              # 20/20 packages PASS
pnpm build                                                  # 20/20 packages PASS
pnpm test:unit                                              # 47 passed / 2 pre-existing token failures
npx eslint <changed files>                                  # clean
```

`pnpm test:unit` 的 2 个失败仍是已记录的 **pre-existing** 设计令牌陈旧断言
（`tokens.vitest.ts`、`storefront-renderer.vitest.ts` 对照已退休的绿色品牌），与本切片无关。
本切片未触碰 design tokens。

## Integrity note

本切片为纯文案 / aria / 状态标题对齐，未改 schema/DB/API，不复活本平台下单/收单。
`grep` 级扫描确认 `apps/employee-web` 全量 TSX 无 `经营` 残留；`apps/management-web` 工具身份面
（not-found/attribution/ai-suggestions/page-builder/offers/roles-permissions/customers）无 `经营` 残留；
唯一保留 `经营` 的是商圈/渠道网络身份页（`m/circles`）与 consumer 商圈，符合 W∞-27 边界。
