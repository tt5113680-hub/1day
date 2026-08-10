# G1-R-EMP-HOME Acceptance

- slice_id: `G1-R-EMP-HOME`
- recorded_at: 2026-08-10 23:15 Asia/Shanghai
- claim: Employee workbench home = Meituan-style **常用功能 shortcuts + CRM metrics + today tasks**.

## Delivered

- Shortcuts: 任务 / 客户 / 线索 / 获客 / 核销 / 我的
- CRM strip: 客户提醒 + 行动机会 counts with link to `/e/customers`
- Retained today task list, opportunities, reminders
- Membership redeem moved into shortcuts (核销)

## Verify

- `pnpm --filter @oneday/employee-web typecheck` PASS
- `pnpm --filter @oneday/employee-web build` PASS
