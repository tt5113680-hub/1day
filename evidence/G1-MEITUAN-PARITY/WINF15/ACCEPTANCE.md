# G1-W∞-15 Process + task-path densify (MH5 process / ME-02)

- slice: `G1-R-PROCESS-TASK-PATH`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. `/c/processes/[id]` — promoter-tool 门店服务过程；服务编号/已登记；诚实免责（非第三方订单履约）
2. Store home `offer_compare` hint — 「经确认页跳转（不在此下单）」；content meta 本地试用
3. Employee `/e/workbench` 宫格「任务待办」+ `/e/tasks` 工具身份 densify
4. `/c/one-code` loading copy — 推广员工具 + 不在此下单

## Explicit non-goals

- No native checkout / order fulfillment (MH5-07/08 remain GAP)

## Verify

- `node --test tests/g1-winf15-process-task-path.test.mjs`
- `pnpm --filter @oneday/consumer-web typecheck` + `build`
- `pnpm --filter @oneday/employee-web typecheck` + `build`
