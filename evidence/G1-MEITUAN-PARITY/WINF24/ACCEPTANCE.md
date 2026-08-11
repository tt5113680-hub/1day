# G1-W∞-24 Tool-path experience parity — Management customer-CRM reframed to promotion-tool follow-up identity

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·工具身份收尾·顾客跟进）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

W∞-19..23 reframed the Management commerce/entry surfaces (门店/商品/订单/评价/营销) to the
推广员工具 identity. But the remaining `顾客 / CRM` surface (`/m/customers`, MPC-06) still carried
store-ops-ownership wording:

- Page title `用客户分层驱动每一次经营动作` — implied the promotion tool "drives every business
  action" of the store (crosses charter boundary 不碰经营 / 不碰管理).
- Eyebrow `客户资产` — implied the tool "owns" the store's customer asset base.
- Forbidden/loading/error/back-link used `客户资产` / `客户经营链路` / `返回客户资产`.
- Forbidden permission copy `具备经营管理权限` — implied the tool grants store business-management
  rights.

This contradicted the tool identity: **统一入口 / 统一工作流 / 痕迹分析**，成交在美团/抖音/扫呗等第三方，
不碰经营销售管理。

## Boundaries

- No native checkout / no order fulfillment / no payments (MH5-07/08 stay external hand-off GAP).
- Text/copy only; **no schema, no DB migration, no API change**.
- Legitimate promotion-tool customer **follow-up / attribution / workflow** features are
  preserved (实名授权跟进、来源分层、导出与归属审批) — only the store-ops-ownership *language* is reframed.
- The learn-source label `顾客 / CRM`（MPC-06）and nav entry 顾客管理 stay (customer relationship is within
  tool follow-up scope); only the page's own headings/states are corrected to honest followed-up framing.

## Delivered

`/m/customers` (list):
- eyebrow `客户资产 → 推广员工具 · 客户跟进`
- title `用客户分层驱动每一次经营动作 → 按来源与分层组织推广跟进作业`
- loading `正在加载客户资产 → 正在加载客户跟进`
- forbidden `无权查看客户资产 → 无权访问客户跟进`；desc `经营管理权限 → 客户跟进范围`
- error `客户资产暂不可用 → 客户跟进暂不可用`
- empty `沉淀新的客户资产 → 沉淀新的客户跟进与归属`
- table `aria-label 客户资产列表 → 客户跟进列表`
- description aligned to honest follow-up/attribution (来源、标签与归属筛选 + 实名授权跟进 + 审批审计).

`/m/customers/[id]` (detail):
- loading `正在加载客户全链路 → 正在加载客户跟进全链路`
- eyebrow `客户全链路 → 客户跟进全链路`
- forbidden desc `经营管理权限 → 客户跟进范围`
- error desc `客户经营链路未能完成加载 → 客户跟进记录未能完成加载`
- back-link `← 返回客户资产 → ← 返回客户跟进`

Dependent-test updates (consistent with new copy):
- `tests/e2e/management-customers.spec.ts` heading `按来源与分层组织推广跟进作业`，forbidden `无权访问客户跟进`.
- `tests/e2e/commercial-ui-foundation.spec.ts` heading `按来源与分层组织推广跟进作业`.

No JSON/DTO/API/RBAC change: the follows-up feature (来源分层、归属审批、导出审批、会员证明) is intact.

## Verify

```text
node --test tests/g1-winf24-customer-followup-identity.test.mjs    # 3/3 PASS
node --test tests/g1-winf*.test.mjs                                # 34/34 PASS (W∞-3..24)
pnpm typecheck                                                     # 20/20 packages PASS
pnpm build                                                         # 20/20 packages PASS (management-web 27 routes)
pnpm test:unit                                                     # 47 passed / 2 failed (pre-existing design-token)
npx eslint <changed files>                                         # clean
```

`pnpm test:unit` 的 2 个失败仍是已记录的 **pre-existing** 设计令牌陈旧断言
（`tokens.vitest.ts`、`storefront-renderer.vitest.ts` 对照已退休的绿色品牌），与本切片无关。
本切片未触碰 design tokens。

## Integrity note

本切片为纯文案/命名对齐，未改 schema/DB/API，不复活本平台下单/收单。全仓代码扫描确认
`apps/` 中 ONEDAY 自身的顾客页面不再残留 `客户资产 / 用客户分层驱动每一次经营动作 /
客户经营链路 / 返回客户资产`；剩余出现均为历史证据/文档/学习源清单（MPC-06 `顾客 / CRM`），
属预期保留。`具备经营管理权限` 仍保留在其它工具自身的权限/审计/组织/设置等页面的 forbidden 状态，
作为通用的工具权限提示词，不在本切片范围。
