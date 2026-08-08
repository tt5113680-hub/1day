# Human pilot manual test

## Purpose and boundary

Use this guide with [PILOT_ACCEPTANCE_CHECKLIST.md](PILOT_ACCEPTANCE_CHECKLIST.md) to record a controlled human-pilot rehearsal. It does not approve a production release and does not replace a named pilot owner's sign-off.

Do not use local seed credentials, local-only secrets, browser storage exports, or any personal/customer data in source-controlled captures. Record evidence in the pilot's approved evidence location with the operator, timestamp, tenant, request or audit identifier, and outcome.

## Four terminals

The pilot operator supplies the approved HTTPS origins below before testing. The paths are the verified application routes; do not substitute a different host or an unpublished tenant.

| Terminal              | Pilot URL                                                    | Local rehearsal reference                                 | Required identity                                    |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------- |
| Consumer public entry | `${CONSUMER_WEB_ORIGIN}/c/entry?tenant=${PILOT_TENANT_SLUG}` | `http://127.0.0.1:3171/c/entry?tenant=luckin-oneday-test` | Anonymous consumer; no employee-style sign-in        |
| Employee workbench    | `${EMPLOYEE_WEB_ORIGIN}/e/login`                             | `http://127.0.0.1:3172/e/login`                           | Named pilot employee with least-privilege membership |
| Management console    | `${MANAGEMENT_WEB_ORIGIN}/login`                             | `http://127.0.0.1:3173/login`                             | Named tenant administrator/manager                   |
| Platform console      | `${PLATFORM_WEB_ORIGIN}/login`                               | `http://127.0.0.1:3174/login`                             | Separately controlled platform administrator         |

`*_ORIGIN` and `PILOT_TENANT_SLUG` are deployment-time values, not repository configuration. The `127.0.0.1` entries are development rehearsal references only and must not be presented as pilot endpoints.

## Required account and authorization preparation

1. Record the deployment revision, migration revision, approved pilot domains, environment owner, and the selected pilot tenant before any browser test.
2. Issue unique, non-seed credentials to the platform administrator, tenant administrator/manager, and employee. Apply the minimum role permissions; do not grant tenant personnel platform-wide permission for convenience.
3. Verify `GET /api/v1/health` returns HTTP 200 with `status: "ok"` and `database: "ready"` on the approved environment.
4. Obtain the customer's authorization, account ownership confirmation, required verification codes, and any paid third-party subscription before enabling a corresponding external connector. Do not claim delivery, publication, or contact without the third party's recorded receipt.
5. Assign a pilot owner and security owner. The product owner, not this document, signs the final handoff decision.

## Human test procedure

1. **Public consumer entry.** Open the consumer URL without logging in. Confirm the entry remains public, the primary navigation routes to real existing pages/actions, and discovery cards only link to published tenant-scoped public entries. Retain the selected entry URL and timestamp.
2. **Consumer-to-operation loop.** Complete one approved consumer action. In the same tenant, confirm the source/scenario, customer identification or creation, ownership under the configured existing rule, follow-up task, audit record, and Outbox record are visible. Repeat the same submitted action only where the scenario permits, and record that the result remains idempotent.
3. **Employee work.** Sign in with the named employee account. Confirm only assigned/authorized work is visible, complete the follow-up, and attach the permitted outcome evidence. Do not use a platform or manager credential to simulate an employee.
4. **Management review.** Sign in with the named tenant manager. Confirm the customer, source/attribution, task, follow-up result, and evidence are visible in the correct tenant. For AI suggestions, record `executed/create_task` only when the UI says that a follow-up task was created; record `manual_required` as unexecuted and direct the operator to the existing business flow.
5. **Platform review.** Sign in with the separately controlled platform administrator and open the platform root. Confirm it reaches the dashboard. Review only authorized platform audit/connector information; do not use elevated access to disclose tenant data.
6. **Boundary checks.** Retain one invalid/revoked-session 401, one least-privilege 403, and one cross-tenant rejection with associated audit/request context. Stop and escalate any unexpected data exposure.
7. **Connector honesty.** Where an external connector is not authorized or has no receipt, record the action as prepared/degraded/manual as shown. An Outbox record or local command is not proof of an external send.
8. **Recovery and decision.** Complete the controlled recovery rehearsal required by [RELEASE_AND_RECOVERY.md](RELEASE_AND_RECOVERY.md), then complete every applicable item in [PILOT_ACCEPTANCE_CHECKLIST.md](PILOT_ACCEPTANCE_CHECKLIST.md). The named pilot owner determines PASS or HOLD and signs outside this repository.

## Escalation

Hold the pilot and preserve evidence if health/readiness fails, an access or tenant-isolation boundary is bypassed, an external result is represented without a receipt, or a required customer authorization/account is absent. Follow the operating boundaries in [PILOT_LIMITATIONS.md](PILOT_LIMITATIONS.md) and the security escalation path in [PILOT_ADMIN_GUIDE.md](PILOT_ADMIN_GUIDE.md).
