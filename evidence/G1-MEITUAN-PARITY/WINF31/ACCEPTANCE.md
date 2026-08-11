# G1-W∞-31 Management PC 通知中心（MPC-13 消息/通知 GAP close）

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·统一工作流·通知中心 MPC-13）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

美团商家端 PC 对标清单（`MEITUAN_PC_H5_PARITY_INVENTORY.md`）中 **MPC-13 消息/通知 为 `GAP`**：
管理端缺少一个租户级的「要处理什么」通知面。员工端已有私有的 `/e/notifications`，但老板/管理者
在 `/m` 只能看到工作台首页的局部「待办与异常」。缺少一个独立、可筛选、只读的租户范围工作流通知中心，
与「统一入口 / 统一工作流」的推广员工具身份对齐。

## Delivered

| 项 | 说明 |
| -- | ---- |
| 后端只读接口 | `GET /api/v1/management/notifications`（要求 `tenant.manage`），租户隔离 fail-closed，聚合租户范围内**待推进**的工作流事件：跟进异常（overdue tasks）、待审批（客户归属转移）、进行中工作流（active workflow_instances）；支持 `category` 筛选；deepLink 指向 `/m/customers` / `/m/workflows` 管理入口 |
| 前端页面 | `/m/notifications` 通知中心：`推广员工具 · 通知中心` 眉标 + 概况条（待办总数/跟进异常/待审批/进行中工作流）+ 类型筛选 + 诚实边界说明；loading/forbidden/error/empty 全状态；复用 `@oneday/ui` `AdminPageHeader/AppStatePanel/Button/StatusBadge` 与 `_commerce.module.css` |
| 菜单 | `MANAGEMENT_MENU_CATALOG` 新增 `notifications → 通知中心`（工作台分组，`tenant.manage`） |
| 契约测试 | `tests/management-notifications.test.mjs`：401 / 跨租户 403 / `tenant.manage` 正常聚合 / `category` 筛选 / 非法 category 400 / 低权限（仅 `customer.read`）403 |

## Files changed

- `apps/api/src/management-notification.service.ts`（新增）
- `apps/api/src/management-notification.controller.ts`（新增）
- `apps/api/src/app.module.ts`（注册 controller/service）
- `packages/contracts/src/menu.ts`（`notifications` menu item）
- `apps/management-web/app/m/notifications/page.tsx`（新增）
- `apps/management-web/app/m/notifications/module.css`(复用 `../_commerce.module.css`)
- `tests/management-notifications.test.mjs`（新增，1 测试）
- `tests/menu-dto.vitest.ts`（tenant.manage 列表加入 `notifications`）

## Boundaries / deliberately NOT touched

- **只读聚合**：不持久化、不标记已读、不改第三方状态；deepLink 跳转到既有管理工具页，不在本页做任何写操作。
- **不碰钱 / 不碰销售 / 不碰管理**：仅工作流待办与跟进异常；页面文案明确「不含支付金额与第三方订单履约态」。
- **无 schema / DB migration**：复用现有 `tasks` / `customer_ownership_transfer_approvals` / `workflow_instances`，零迁移。
- **不复活本平台下单/收单**；仍为本地试点（非美团实时）。

## Verify

```text
node --test tests/management-notifications.test.mjs          # 1/1 PASS (L2 API+DB + 隔离)
node --test tests/sys-29-admin-nav-groups.test.mjs tests/sys-26-management-orphan-ia.test.mjs  # PASS
npx vitest run tests/menu-dto.vitest.ts                       # 17/17 PASS
pnpm typecheck                                               # 20/20 PASS
pnpm build                                                   # 20/20 PASS (含 /m/notifications 路由)
pnpm test:unit                                               # 47 passed / 2 pre-existing token failures
npx eslint <changed files>                                   # clean
npx prettier --check <changed files>                         # clean
```

`pnpm test:unit` 的 2 个失败仍是已记录的 **pre-existing** 设计令牌陈旧断言
（`tokens.vitest.ts`、`storefront-renderer.vitest.ts`），与本切片无关；本切片未触碰 design tokens。

## Integrity note

本切片关闭 MPC-13 GAP，是「统一工作流」管理入口的分立只读通知面；不引入新的数据表、不移交接位、
不改既有读状态，全部复用既有租户工作流/跟进/审批数据。诚实边界与推广员工具身份保持一致。
