# G1-W∞-36 Platform PC dashboard visual/IA densify toward Meituan platform PC (MP govern bar)

- slice: `G1-R-PLATFORM-DASHBOARD` densify（商用前提：完整对标）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering densify; platform govern surface toward PARITY; not owner G1 sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

| Change | Meituan platform PC habit |
| ------ | ------------------------- |
| Yellow `topBar` | 推广员工具 · 平台总览 + 刷新 |
| Gray `#f5f5f5` canvas | platform admin content density |
| White `panel` cards | 常用功能 / 平台指标 / 风险 / 系统 |
| `functionIcon` 4-col grid | 8 平台治理快捷入口 |
| Custom metric tiles | 租户 / 渠道 / 活跃 / 事件 |

## Boundaries preserved

- 推广员工具 · 平台总览 / 不含本平台收款
- PlatformProductHome role workspace retained
- No fake 美团平台 copy

## Verify

```text
node --test tests/g1-winf36-platform-dashboard-visual.test.mjs
node --test tests/g1-winf18-admin-dashboards.test.mjs
pnpm --filter @oneday/platform-web typecheck && build
```
