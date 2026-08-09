# ONEDAY V3 Autonomous Commercial Execution

## Current mandate

- Task: `ONEDAY-V3-COMMERCIAL-COMPLETION`
- Branch: `hardening/COMMERCIAL-COMPLETION`
- Current gate: `BATCH_1_IN_PROGRESS`
- Delivery rule: component, page, local test, or intermediate commit is internal progress only. Do not declare a batch result until its complete acceptance gate has been evaluated.

## Execution order

1. Finish Batch 1 UI foundation: shared tokens, shells, role-specific core views, canonical system states, responsive behavior, deprecation record, visual evidence, and full repository regression.
2. If a Batch 1 check is repairable, fix it and re-run the affected and full gates without pausing.
3. On `BATCH_1_PASS`, continue automatically to Batch 2, then Batch 3 and Batch 4 according to the frozen commercial blueprint.
4. Stop only for a non-repairable technical, access, or product blocker. Record it in `PROJECT_STATE/BLOCKED_REPORT.md` with reproducible evidence.

## Evidence discipline

Every batch gate records the exact commit, commands, role/session fixture, tenant context, visual captures, and any remaining limitation. Status files may state only verified facts.
