# AUDIT-BATCH-6 acceptance - real multi-role commercial journey

## Delivered behavior

- The test-only Luckin-style commercial fixture now contains an explicit public consultation action and a second isolated restaurant tenant. The ordinary test employee receives only `task.read` and `task.manage`; server-side own-task checks remain the authorization boundary.
- An assigned employee can now record a result from the task detail itself. The controlled endpoint validates the current session's membership, assignment, task state and customer before atomically writing the result order, image evidence, task-evidence association, idempotency receipt, audit log and Outbox event.
- The employee task page uploads only PNG/JPEG/WebP evidence through `SessionApiClient`; it does not call an administrator endpoint or receive generic tenant-wide evidence permissions.

## Real browser acceptance

`pnpm.cmd exec playwright test --config playwright.audit-batch-6.config.ts` - PASS (1/1, 23.8s)

The browser test starts the actual API and all four web terminals, seeds only `oneday_v3_test`, and performs:

1. anonymous consumer public action with the assigned employee share code;
2. real employee login, follow-up recording, image result upload and task completion;
3. real owner login and management customer-trail inspection for source, completed task and result evidence;
4. second-tenant owner access rejection (`404`) for the Luckin customer;
5. unassigned Luckin employee task-read rejection (`404`); and
6. real platform login after the commercial journey.

The script saves the consumer, employee and management screenshots plus Playwright trace under `evidence/AUDIT-BATCH-6/`.

## Database receipts verified by the browser journey

- `consumer_operating_projections` uses `employee_share` assignment for the public action.
- The assigned task has one follow-up, one linked image evidence record, `completed` status, one `employee.task_result_recorded` audit log and one `employee.task.result_recorded.v1` Outbox event.

## Quality gates

- Targeted API and employee-web typechecks passed.
- Isolated test database was confirmed up to date before browser acceptance.
- Full repository gates passed: formatting, lint, 18-package typecheck, 18-package build, 183 repository tests across 18 package test tasks, and 73 evidence-contract checks.
