# G1-W∞-27 Tool-path experience parity — Management/Employee operational-state copy aligned to promoter-tool identity

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·工具身份收尾·管理/员工「经营管理」状态口径对齐）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

W∞-21..26 aligned Management eyebrows, nav labels, `/m/settings` and `/m/customers` to the promoter-tool
identity (`推广员工具`), but the remaining **forbidden / error / loading / save** operational states across
Management and Employee still described access via the legacy store-ops phrase `经营`（`经营管理权限` /
`经营权限` / `经营数据` / `客户资产` / `门店管理` 等），contradicting the tool identity.

## Delivered (management-layer tool-identity sweep)

| Page | Old (store-ops) | New (tool identity) |
| ---- | --------------- | ------------------- |
| `/m/workflows` forbidden | 请使用具备经营管理权限的账号。 | 请使用具备推广员工具权限的账号。 |
| `/m/attribution` forbidden | 请使用具备经营管理权限的账号。 | 请使用具备推广员工具权限的账号。 |
| `/m/organization-employees` forbidden | 请使用具备经营管理权限的账号。 | 请使用具备推广员工具权限的账号。 |
| `/m/ai-suggestions` forbidden | 请使用具备经营管理权限的账号。 | 请使用具备推广员工具权限的账号。 |
| `/m/ai-suggestions` loading | 正在校验建议来源、执行状态与经营权限。 | 正在校验建议来源、执行状态与工具授权。 |
| `/m/employee-process-performance` forbidden | 请使用具备经营管理权限的账号。 | 请使用具备推广员工具权限的账号。 |
| `/m/permission-audit` forbidden | 请使用具备经营管理权限的账号。 | 请使用具备推广员工具权限的账号。 |
| `/m/roles-permissions` forbidden | 请使用具备经营管理权限的账号。 | 请使用具备推广员工具权限的账号。 |
| `/m/roles-permissions` save note | 角色未创建，请确认编码唯一且具备经营管理权限。 | 角色未创建，请确认编码唯一且具备工具授权。 |
| `/m/entry-funnel` forbidden | 请使用具备租户经营管理权限的账号。 | 请使用具备租户推广员工具权限的账号。 |
| `/m/circles` forbidden | 请使用具备租户经营管理权限的账号。 | 请使用具备租户推广员工具权限的账号。 |
| `/m/memberships` forbidden | 需要经营管理或门店范围的 tenant.read。 | 需要推广员工具授权或门店范围的 tenant.read。 |
| `/m/external-actions` forbidden | 需要经营管理或 action.read / action.manage 权限。 | 需要推广员工具授权或 action.read / action.manage 权限。 |
| `/m/stores` forbidden | 请使用具备经营管理权限的账号登录。 | 请使用具备推广员工具权限的账号登录。 |
| `/m/content` forbidden | 请使用具备内容经营权限的账号。 | 请使用具备内容工具权限的账号。 |
| `/m/page-builder` forbidden | 请使用具备模板经营权限的账号。 | 请使用具备模板工具权限的账号。 |
| `/m` forbidden fallback | 当前角色没有经营权限 / 请返回经营总览… | 当前角色没有工具访问权限 / 请返回推广员工具工作台… |
| `/m` loading (global) | 正在整理经营数据 / 经营信息 | 正在整理工具数据 / 工具信息 |
| `/m` error (global) | 经营数据暂时不可用 / 经营操作 | 工具数据暂时不可用 / 工具操作 |
| Management workbench 门店 shortcut desc | 门店管理 | 门店入口（对齐 W∞-19/23 菜单 label） |
| Employee `/e/memberships` redeem empty note | 请先由经营管理发放门店权益 | 请先由推广员工具授权的账号发放门店权益 |
| API `management-dashboard` suggestion reason | 可从客户资产与内容投放… | 可从客户跟进与内容投放…（对齐 W∞-24 客户跟进） |

## Boundaries / deliberately NOT touched

- **Platform 渠道经营台 / 商圈经营台**（`apps/platform-web/app/ch/*`、`bc/*`、`p/channels`）——主人授权身份的
  `CHANNEL-001 渠道经营台` / `CIRCLE-001 固定商圈经营台` 为平台侧角色面，`经营` 措辞保留，不在本切片范围内。
- No native checkout / no order fulfillment / no payments（MH5-07/08 仍为外链 hand-off GAP）。
- Text/copy/aria-only；**无 schema、无 DB migration、无 API 变更**，无 RBAC/permission 变更。
- 诚实无销售边界全保留（不碰钱/不碰销售/不碰管理；全平台可见引流 · 不碰销售成交）。

## Files changed

- `apps/management-web/app/m/{workflows,attribution,organization-employees,ai-suggestions,employee-process-performance,permission-audit,roles-permissions,entry-funnel,circles,memberships,external-actions,stores,content,page-builder}/page.tsx`
- `apps/management-web/app/{forbidden,loading,error,page}.tsx`
- `apps/employee-web/app/e/memberships/membership-redeem.tsx`
- `apps/api/src/management-dashboard.service.ts`
- `tests/g1-winf27-tool-permission-state-copy.test.mjs`（新增，7 用例）

## Verify

```text
node --test tests/g1-winf27-tool-permission-state-copy.test.mjs  # 7/7 PASS
node --test tests/g1-winf*.test.mjs                              # 49/49 PASS (W∞-3..27)
node --test tests/*menu*.test.mjs                                # 4/4 PASS
pnpm typecheck                                                  # 20/20 packages PASS
pnpm build                                                      # 20/20 packages PASS (management-web 27 routes)
pnpm test:unit                                                  # 47 passed / 2 pre-existing token failures
npx eslint <changed files>                                      # clean
```

`pnpm test:unit` 的 2 个失败仍是已记录的 **pre-existing** 设计令牌陈旧断言
（`tokens.vitest.ts`、`storefront-renderer.vitest.ts` 对照已退休的绿色品牌），与本切片无关。
本切片未触碰 design tokens。

## Integrity note

本切片为纯文案 / aria / 状态标题对齐，未改 schema/DB/API，不复活本平台下单/收单。
`rg` 级扫描确认 `apps/management-web`、`apps/employee-web` 的 App TSX 不再残留 `经营管理`；
全局 `客户资产`/工作台 `门店管理` 快捷入口也已对齐工具身份。
Platform 渠道/商圈经营台措辞按主人身份保留。
