# G1-R-BOSS-HOME Acceptance

- slice_id: `G1-R-BOSS-HOME`
- recorded_at: 2026-08-10 23:10 Asia/Shanghai
- claim: Management home rebuilt as Meituan-merchant-style **工作台** (shortcuts + today store/employee metrics + CRM). Not full Meituan pixel clone of every deep page.

## Owner direction

- 100% Meituan UI/IA/interaction/functional-chain direction
- Boss home: quick entries + today store/employee work data + CRM

## Delivered

| Area | Change |
| ---- | ------ |
| API | `ManagementDashboardService` adds today metrics: customersToday, openTasksToday, completedTasksToday, overdueTasks, stores, activeAssignees |
| UI | `/` and `/m/dashboard`: 常用功能 shortcuts, 今日数据, 客户与经营, 待办/经营提醒 |
| Menu | Overview label → `工作台` |
| E2E | Expects `工作台` + `常用功能` + `客户` |

## Verify

- `pnpm --filter @oneday/api typecheck` PASS
- `pnpm --filter @oneday/management-web typecheck` PASS
- `pnpm --filter @oneday/api build` PASS
- `pnpm --filter @oneday/management-web build` PASS

## Boundaries

- Does not finish employee home (R3), consumer discovery shell (R4), or channel geo (R5)
- Does not auto-sign product-owner acceptance
