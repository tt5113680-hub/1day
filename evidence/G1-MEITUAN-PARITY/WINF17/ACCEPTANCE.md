# G1-W∞-17 Workbench / commerce / circle densify

- slice: `G1-R-WORKBENCH-COMMERCE`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. Employee `/e/workbench` `/e/leads` `/e/nurture` — promoter-tool framing; remove 美团商家/复购销售话术
2. Management `/m/orders` `/m/reviews` `/m/marketing` — 推广员工具档案 framing + 非本平台下单/成交
3. Consumer `/c/circles/[id]` — 商圈详情工具身份 + 不在此下单

## Explicit non-goals

- No native checkout (MH5-07/08 remain GAP)

## Verify

- `node --test tests/g1-winf17-workbench-commerce.test.mjs`
- employee + management + consumer typecheck/build
