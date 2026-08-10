# G1-W1 Meituan merchant PC nav + workbench

- slice: `G1-R-MEITUAN-PC-NAV-HOME`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner G1 sign-off)

## What changed

1. `MANAGEMENT_MENU_CATALOG` reordered/relabeled to 美团商家端 PC IA:
   - groups: 工作台 / 店铺 / 商品 / 顾客 / 营销 / 员工 / 设置 / **工作流整合(CUSTOM)**
2. Shell product chrome: **商家中心**
3. Management home (`/`)：今日概况条 + 美团式常用功能快捷入口 + 经营数据/待办（诚实：订单/评价页未造假，标为下一波）

## Verification

- `pnpm --filter @oneday/contracts build` PASS
- `pnpm --filter @oneday/management-web build` PASS
- `vitest tests/menu-dto.vitest.ts` 17/17
- `node --test tests/sys-26-management-orphan-ia.test.mjs tests/sys-29-admin-nav-groups.test.mjs` 4/4
- `node --test tests/sys-23-attribution-menu.test.mjs` 1/1

## Honest boundary

- Not full Meituan PC pixel parity yet; W1 = nav IA + workbench density.
- Do not auto-sign `PRODUCT_OWNER_UI_ACCEPTANCE.md`.
- Next: W2 Consumer H5 (美团 App 附近/商家主页) per inventory.
