# G1-W∞-38 Management stores visual/IA densify toward Meituan merchant PC (MPC-02)

- slice: `G1-R-MANAGEMENT-STORES` densify（商用前提：完整对标）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering densify; MPC-02 still PARTIAL→toward PARITY; not owner G1 sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

| Change | Habit |
| ------ | ----- |
| Yellow `topBar` | 推广员工具 · 门店入口 + 刷新 |
| Gray `#f5f5f5` canvas | merchant PC density |
| Hero + summary strip | 门店数/营业中/待跟进/入口打开 |
| White store cards | 负责人/资料/第三方入口编辑保留 |

## Boundaries preserved

- 不代替平台下单/支付；不含第三方订单履约
- No 门店管理 copy
- CRUD APIs unchanged

## Verify

```text
node --test tests/g1-winf38-management-stores-visual.test.mjs
node --test tests/g1-winf23-nav-heading-alignment.test.mjs
pnpm --filter @oneday/management-web typecheck && build
```
