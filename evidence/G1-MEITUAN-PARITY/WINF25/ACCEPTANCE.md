# G1-W∞-25 Tool-path experience parity — Management page headings aligned to promoter-tool identity

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·工具身份收尾·管理页眉标对齐）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

W∞-19..24 reframed the Management commerce/entry surfaces (门店/商品/订单/评价/营销/顾客) to the
推广员工具 identity and aligned their page headings (eyebrow/title/state) to the menu labels. But the
remaining Management tool pages still carried the generic legacy merchant/org eyebrow prefix
`ONEDAY / 商户…` or store-ops phrasing that did not name the promotion-tool identity, or diverged
from their own menu label:

| Route | Menu label (W∞-21) | Old eyebrow | Issue |
| ----- | ------------------ | ----------- | ----- |
| `/m/page-builder` | 入口页装修 | `ONEDAY / 数字门店装修与发布` | store-ops 「门店装修」 vs 菜单「入口页装修」 |
| `/m/content` | 营销内容 | `ONEDAY / 商户内容中心` | 商户 prefix |
| `/m/funnels/[id]` | (归因漏斗) | `ONEDAY / 商户经营漏斗` | store-ops 「经营漏斗/经营结果」 |
| `/m/roles-permissions` | 角色权限 | `ONEDAY / 商户角色与权限` | 商户 prefix |
| `/m/permission-audit` | 操作审计 | `ONEDAY / 平台安全 · 商户权限审计` | 商户 prefix |
| `/m/settings` | 工具设置 | `ONEDAY / 推广员工具 · 经营设置` | 不匹配菜单「工具设置」 |
| `/m/connectors` | 连接配置 | `ONEDAY / 商户连接器授权` | 商户 prefix |
| `/m/organization-employees` | 员工管理 | `ONEDAY / 商户组织与员工` | 商户 prefix |
| `/m/ai-suggestions` | 作业建议 | `ONEDAY / 商户经营智能建议` | 商户 prefix + store-ops 「经营判断」 |
| `/m/workflows` | 工作流整合 | `ONEDAY / 商户运营流程` | 商户 prefix |
| `/m/memberships` | 会员中心 | `ONEDAY / MEMBER OPERATIONS` | English legacy |
| `/m/employee-process-performance` | 员工表现 | `ONEDAY / 员工过程绩效` | 不匹配菜单「员工表现」 |
| `/m/external-actions` | 外链服务 | `ONEDAY / 外链动作目录` | 不匹配菜单「外链服务」 |

This continued the W∞-21/23/24「title/status alignment」theme: page headings must name the 推广员工具
identity and align to the menu labels, and must not imply the tool runs the merchant's commerce/store ops.

## Boundaries

- No native checkout / no order fulfillment / no payments (MH5-07/08 stay external hand-off GAP).
- Text/copy/aria-only; **no schema, no DB migration, no API change**, no RBAC/permission change.
- Honest no-native-checkout / no-third-party-live-claim disclaimers preserved on every page.
- `具备经营管理权限` generic permission prompt retained as a general tool-authorization phrase
  (out of scope, consistent with W∞-24 note).
- `priceSource '商户经营后台登记'` data-provenance field value left intact (not UI framing).

## Delivered

Eyebrows reframed to `推广员工具 · <menu label>`, matching each page's menu label:

- `/m/page-builder` → `推广员工具 · 入口页装修`
- `/m/content` → `推广员工具 · 营销内容`
- `/m/funnels/[id]` → `推广员工具 · 来源归因漏斗`（title `从来源到复购，确认每一步的经营结果` →
  `从来源到进店承接，跟踪每一步的入口分流`；states/loading/forbidden/error + `aria-label` 去 `经营漏斗`
  → `来源归因漏斗`；口径说明 `当作经营结果 → 当作入口分流结果`）
- `/m/roles-permissions` → `推广员工具 · 角色权限`
- `/m/permission-audit` → `推广员工具 · 操作审计`
- `/m/settings` → `推广员工具 · 工具设置`
- `/m/connectors` → `推广员工具 · 连接配置`
- `/m/organization-employees` → `推广员工具 · 员工管理`
- `/m/ai-suggestions` → `推广员工具 · 作业建议`（title `把经营判断变成可确认的下一步` →
  `把入口痕迹解读成可确认的下一步`）
- `/m/workflows` → `推广员工具 · 工作流整合`
- `/m/memberships` → `推广员工具 · 会员中心`
- `/m/employee-process-performance` → `推广员工具 · 员工表现`
- `/m/external-actions` → `推广员工具 · 外链服务`
- `/m/attribution`：hint `初次进入经营链路 → 初次进入入口分流链路`、
  `等待新的入口经营链路形成 → 等待新的入口分流链路形成`

Dependent test updates (consistent with new copy):

- `tests/g1-winf12-group-buy-membership.test.mjs`：settings eyebrow `推广员工具 · 经营设置` →
  `推广员工具 · 工具设置`.
- `tests/e2e/management-ai-suggestions.spec.ts`：heading `把经营判断变成可确认的下一步` →
  `把入口痕迹解读成可确认的下一步`（2 处）.
- `tests/e2e/sys-25-external-actions.spec.ts`：nav link `外链动作目录` → 当前菜单 label `外链服务`
  （对齐已存在的 `MANAGEMENT_MENU_CATALOG` label）.

No JSON/DTO/API/RBAC change. All craft/workflow/entry/trace features functionally intact.

## Verify

```text
node --test tests/g1-winf25-management-tool-eyebrow-alignment.test.mjs # 5/5 PASS
node --test tests/g1-winf*.test.mjs                                    # 39/39 PASS (W∞-3..25)
node --test tests/*menu*.test.mjs tests/g1-winf*.test.mjs              # 41/41 PASS
pnpm typecheck                                                         # 20/20 packages PASS
pnpm build                                                             # 20/20 packages PASS (management-web 27 routes)
pnpm test:unit                                                         # 47 passed / 2 pre-existing token failures
npx eslint <changed files>                                             # clean
```

`pnpm test:unit` 的 2 个失败仍是已记录的 **pre-existing** 设计令牌陈旧断言
（`tokens.vitest.ts`、`storefront-renderer.vitest.ts` 对照已退休的绿色品牌），与本切片无关。
本切片未触碰 design tokens。

## Integrity note

本切片为纯文案 / aria / 标题对齐，未改 schema/DB/API，不复活本平台下单/收单。全仓代码扫描确认
`apps/management-web/app/m/` 不再残留 `eyebrow="ONEDAY / 商户…"`、`数字门店装修与发布`、
`MEMBER OPERATIONS`、`入口经营链路` 等旧 merchant/store-ops 眉标；剩余出现均为历史证据 / 文档 /
学习源清单（MPC-06 `顾客 / CRM`），属预期保留。`商户经营后台登记` 作为 Offer `priceSource` 的数据
来源溯源字段值保留不动（非页面框架文案）。
