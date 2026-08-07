# HARDENING-005 acceptance

- Added a controlled pilot delivery package: deployment guide, administrator guide, explicit commercial-MVP limitations, and an evidence-led pilot acceptance checklist.
- The deployment guide requires database-backed `GET /api/v1/health` readiness, strict origin configuration, controlled migrations, and secret handling. It distinguishes the local Docker configuration from a pilot environment.
- The administrator guide labels `admin@system.local` / `ChangeMe123!` as deterministic local seed data only and requires a unique pilot administrator credential. It documents role boundaries, tenant separation, audit review, and escalation.
- The limitations and checklist explicitly prevent unverified external delivery claims, list excluded payment/marketplace/OA/ERP capabilities, require tenant/RBAC negative cases, and require the guarded recovery rehearsal.
- `tests/hardening-005-pilot-contract.test.mjs` verifies the delivery documents retain their deployment, credential, limitation, and handoff safety contracts. Browser screenshot/accessibility gates are not applicable because this task delivers operational documentation; the four-terminal browser evidence is retained under HARDENING-002.
