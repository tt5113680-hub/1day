# G1-W∞-66 Employee 门店入口 真实数据深页密度 densify（ME-04）

- slice: `G1-R-EMPLOYEE-STORE-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS**
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

`/e/store` 黄顶栏 sticky + 灰底白卡 + heroCard + summaryStrip + 门店授权分布（授权门店/数据范围类型/会话角色/范围标签），由真实 `managed-stores` 与 `me/menu` scopes 行推导。保留店长能力包与诚实边界（不碰钱、本页不含支付金额、非本平台下单、source=local）。

## Verify

```text
node --test tests/g1-winf66-employee-store-deep.test.mjs  # 4/4
pnpm --filter @oneday/employee-web typecheck && build     # PASS
```

Not an owner product-owner UI sign-off.
