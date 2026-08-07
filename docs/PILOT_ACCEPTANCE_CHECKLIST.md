# Pilot acceptance checklist

Use this checklist on the selected pilot environment. Each item needs a named operator, timestamp, and retained evidence; unchecked items mean the environment is not ready for handoff.

## Environment and security

- [ ] Deployment revision, migration revision, environment owner, and approved pilot domains are recorded.
- [ ] Secrets are supplied outside the repository; local seed credentials and `oneday_local_only` are not used in the pilot environment.
- [ ] `GET /api/v1/health` returns HTTP 200 with `status: "ok"` and `database: "ready"`.
- [ ] An invalid or revoked session is rejected with 401; a valid user without the required permission is rejected with 403.
- [ ] A cross-tenant request is rejected and the result is retained with its audit context.
- [ ] Privileged changes and connector degradation are visible to the authorized platform security-audit user only.

## Commercial demonstration chains

- [ ] A consumer action records its source/scenario, creates the appropriate employee task, and appears with evidence in management review.
- [ ] A lead receives follow-up, order/outcome evidence, and an observable repurchase/follow-up state without fabricating an external result.
- [ ] A business-circle merchant decision completes the required approval path and updates attribution/display state while unauthorized users cannot approve it.
- [ ] A first-level channel onboards a merchant tenant, organization, store, named administrator, and staff-management permission; the new tenant cannot view another tenant's records.

## Operations and recoverability

- [ ] The tenant administrator can create/disable staff and assign minimum roles without receiving platform-wide permissions.
- [ ] Audit records, correlation/trace context, and outcome evidence can be reviewed for a selected pilot action.
- [ ] A fresh controlled recovery clone was rehearsed and its verified record counts were recorded according to [RELEASE_AND_RECOVERY.md](RELEASE_AND_RECOVERY.md).
- [ ] The operator reviewed [PILOT_LIMITATIONS.md](PILOT_LIMITATIONS.md) with the customer and documented any external-account prerequisites.
- [ ] The four browser terminals and applicable API flows were exercised with no unresolved high-severity security issue.

## Handoff decision

- [ ] PASS: every item above has evidence, the operator accepts the documented limitations, and the pilot owner signs the handoff record.
- [ ] HOLD: any missing readiness, tenant-isolation, authorization, recovery, or required external-account item remains open. Do not represent the pilot as available until it is resolved.
