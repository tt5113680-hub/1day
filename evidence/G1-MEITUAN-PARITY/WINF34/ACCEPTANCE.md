# G1-W∞-34 Employee H5 workbench visual/IA densify toward Meituan merchant app (ME-01 commercial bar)

- slice: `G1-R-EMPLOYEE-WORKBENCH` densify（商用前提：完整对标）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering densify; ME-01 still PARTIAL→toward PARITY; not owner G1 sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

| Change | Meituan merchant app habit |
| ------ | -------------------------- |
| Sticky yellow `topBar` | 推广员工具 · 工作台 + 刷新 |
| `heroCard` | avatar initial + compact greeting |
| White `panel` cards on `#f5f5f5` | merchant app list density |
| `functionIcon` 3-col grid | 常用功能 icon tiles |
| Custom metric tiles | 今日任务 / 客户提醒 / 行动机会 |
| Task/opportunity/reminder cards | compact gray inset cards |

## Boundaries preserved

- 推广员工具 · 工作台 / 不含第三方订单履约
- No 美团商家 / 经营概览 store-ops copy
- API + complete task flow unchanged

## Verify

```text
node --test tests/g1-winf34-employee-workbench-visual.test.mjs
node --test tests/g1-winf17-workbench-commerce.test.mjs
pnpm --filter @oneday/employee-web typecheck && build
```
