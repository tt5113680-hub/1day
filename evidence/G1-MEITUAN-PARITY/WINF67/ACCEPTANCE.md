# G1-W∞-67 Employee 会员核销 真实数据深页密度 densify（ME-05）

- slice: `G1-R-EMPLOYEE-MEMBERSHIPS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

`/e/memberships` 黄顶栏 sticky + 灰底白卡 + heroCard + 核销表单保留 + summaryStrip + 会员核销分布（权益动作/权益项/门店/行为月份/会员状态），由真实 `member_benefit_ledger` + `membership_enrollments` 行经新只读 API `GET /api/v1/employee/memberships/overview`（store scope）推导。诚实边界：source=local、不替代美团/抖音会员、不代履约、非本平台下单、不含支付金额；空态保留「推广员工具授权的账号发放门店权益」。

## Files

- `apps/api/src/membership-commercial.controller.ts` / `.service.ts`（overview）
- `apps/employee-web/app/e/memberships/membership-redeem.tsx` / `.module.css`
- `tests/g1-winf67-employee-memberships-deep.test.mjs`（5/5）

## Verify

```text
node --test tests/g1-winf67-employee-memberships-deep.test.mjs  # 5/5
node --test tests/g1-winf27-tool-permission-state-copy.test.mjs # PASS（空态文案）
pnpm --filter @oneday/api typecheck
pnpm --filter @oneday/employee-web typecheck && build
```

Not an owner product-owner UI sign-off.
