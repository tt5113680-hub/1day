# G1-W∞-35 Management PC workbench visual/IA densify toward Meituan merchant PC (MPC-01 commercial bar)

- slice: `G1-R-MANAGEMENT-WORKBENCH` densify（商用前提：完整对标）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering densify; MPC-01 still PARTIAL→toward PARITY; not owner G1 sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

| Change | Meituan merchant PC habit |
| ------ | ------------------------- |
| Yellow `topBar` | 推广员工具 · 管理工作台 + 刷新 |
| Gray `#f5f5f5` canvas | merchant PC content density |
| White `panel` cards | 今日概况 / 常用功能 / 作业数据 / 待办 |
| `functionIcon` 7-col grid | 14 快捷入口 icon tiles |
| Custom metric tiles | 客户 / 服务档案 / 完成 / 待办 |
| Yellow inset `todayStrip` | 6 项今日概况 |

## Boundaries preserved

- 推广员工具 · 管理工作台 / 不含支付金额
- 近30日服务档案（非本平台下单）
- No 美团商家端 PC · 商家中心 copy

## Verify

```text
node --test tests/g1-winf35-management-workbench-visual.test.mjs
node --test tests/g1-winf18-admin-dashboards.test.mjs
node --test tests/g1-winf21-tool-path-experience.test.mjs
pnpm --filter @oneday/management-web typecheck && build
```
