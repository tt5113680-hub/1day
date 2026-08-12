# G1-W∞-65 Employee 客户目录 真实数据深页密度 densify（ME-03）

- slice: `G1-R-EMPLOYEE-CUSTOMERS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 员工面 `/e/customers` 真实数据深页分布 toward 美团商家 App 顾客密度)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 `/e/tasks`（W∞-64）后，本刀把员工面客户目录 `/e/customers` 补上「分布洞察」并视觉/IA densify。全部分布由既有 `GET /api/v1/employee/customers` 返回的**真实 customers 行**现场推导，禁止假 BI，无 schema/DB/API 变更：

- **`/e/customers`（客户目录 ME-03）**：黄顶栏 sticky `topBar`（`推广员工具 · 客户目录` + 获客池/刷新）+ 灰底白卡画布(#f5f5f5) + heroCard + summaryStrip（客户记录/归属中/协作中/有待办）+ 分布面板 `aria-label="客户跟进分布"`——归属/状态/待办负载/建档窗口，`barWidth` 由真实行推导。
- **诚实边界**：source=local、不含第三方订单履约、不代履约美团/抖音、非本平台下单、不宣称跨店导出。

## Files

- `apps/employee-web/app/e/customers/customer-directory.tsx`
- `apps/employee-web/app/e/customers/customer-directory.module.css`
- `tests/g1-winf65-employee-customers-deep.test.mjs`（4/4）

## Verify

```text
node --test tests/g1-winf65-employee-customers-deep.test.mjs   # 4/4
node --test tests/g1-winf16-employee-surfaces.test.mjs         # 1/1
node --test tests/g1-winf*.test.mjs                            # 212/212
pnpm --filter @oneday/employee-web typecheck && build          # PASS
```

Not an owner product-owner UI sign-off.
