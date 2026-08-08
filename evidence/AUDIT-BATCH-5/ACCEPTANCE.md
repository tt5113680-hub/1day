# AUDIT-BATCH-5 acceptance - controlled AI commands and connector capability boundaries

## Delivered behavior

- AI suggestion acceptance records a distinct execution status and result. Only whitelisted, complete local task commands execute; `create_follow_up` reuses the source task's tenant-scoped assignee and customer context, validates the source task, and creates the task inside the suggestion transaction.
- Every executed command writes `task.created_from_ai_suggestion` audit evidence and an `employee.task.created.v1` Outbox event. Unsupported or incomplete suggestions become `manual_required`; they cannot infer a task, notify a customer, or call an external provider.
- Management connector authorization remains an intent-only record with a secret fingerprint. Management and platform connector APIs expose `not_available` external delivery capability; platform catalog/health records remain observations, not delivery receipts.
- Management UI exposes the actual execution status for accepted suggestions. `docs/PILOT_LIMITATIONS.md` makes the same AI and connector boundary explicit for pilot communications.

## Real process acceptance

`node --test tests/audit-batch-5-ai-connector.test.mjs` - PASS (1/1)

The test builds and launches the actual API against `oneday_v3_test`, then verifies:

1. a complete `create_follow_up` suggestion produces exactly one local task with the source task's tenant-scoped ownership context;
2. that task has exactly one AI-origin audit record and one employee-task Outbox event;
3. an unsupported `review_tasks` suggestion is accepted as `manual_required`, with no invented command;
4. connector authorization never returns the submitted secret and declares the required manual external receipt; and
5. platform connector capability also states that external delivery is unavailable and authorization is intent-only.

## Quality gates

- Migration `045_ai_suggestion_execution:Up` applied to the isolated test database.
- Targeted API process acceptance passed (1/1).
- Repository format, lint, typecheck, build, test, and evidence gates are recorded after final verification.
