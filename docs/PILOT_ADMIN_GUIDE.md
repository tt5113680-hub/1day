# Pilot administrator guide

## Accounts and roles

The seed command creates `admin@system.local` with password `ChangeMe123!` for a local demonstration database only. It is deterministic test data, not a deployable customer account. Never use it in a shared, hosted, or customer-facing environment; issue a unique first administrator credential through the controlled onboarding process and rotate it before any handoff.

The platform administrator manages the platform tenant, first-level channels, connector definitions, templates, and platform audit signals. A tenant administrator manages only that tenant's organization, stores, employees, roles, customer operations, and evidence. Keep those roles separate: tenant administrators must not be given platform-wide access merely to solve a local support request.

## First-pilot setup

1. Sign in with the controlled platform administrator account.
2. In the channel onboarding flow, create the pilot tenant, its first organization and store, and the tenant's named administrator. Confirm the issued credential through the approved secure channel.
3. Configure roles with the minimum permissions needed for each employee. Staff creation requires `employee.manage`; tenant configuration requires `tenant.manage`; platform operations require `platform.manage`.
4. Create or assign the tenant's page template and operational plan. Review the preview before publication.
5. Configure external connector metadata only after the pilot owns the relevant third-party account and has granted real authorization. Record connector health and errors in the platform security-audit view.

## Daily operating loop

1. Review customer actions and resulting employee tasks.
2. Have staff complete follow-up and attach the required outcome evidence (order number, screenshot, verification code, or manual confirmation as appropriate).
3. Review management dashboards for task exceptions, conversion/funnel signals, attribution, and employee process visibility.
4. Review privileged changes and connector degradation in `/p/security-audit`; acknowledge or resolve them through the recorded, versioned action rather than informal edits.
5. When membership, ownership, or business-circle decisions need approval, use the applicable approval flow. Do not bypass its role and version checks with direct database changes.

## Access and data safety

- Confirm the current tenant before searching, exporting, or changing records. The API enforces tenant context and RBAC; a 401 means the session is invalid and a 403 means the active role lacks permission.
- Do not put customer personal data, connector secrets, or authentication tokens into task titles, browser captures, or source-controlled evidence.
- Disable a departing employee's membership/session promptly and review its related audit trail.
- Investigate a health failure or connector degradation before retrying an external operation. Do not claim an external delivery, post, or message succeeded unless the recorded outcome evidence proves it.

## Escalation

For a service availability issue, use the readiness and recovery runbooks. For access, tenant-isolation, or audit concerns, stop the affected action, preserve evidence, and escalate to the pilot security owner. A platform administrator may not use its elevated access to disclose one tenant's operational data to another tenant.
