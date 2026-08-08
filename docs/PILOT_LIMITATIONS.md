# Pilot limitations and operating boundaries

## Included pilot capability

The commercial MVP supports tenant and role administration; consumer, employee, management, platform, channel, and fixed-business-circle flows; page/template configuration and preview; customer source, ownership, follow-up, order and repurchase records; task, evidence, audit, and operational dashboard flows; and controlled connector/action configuration with recorded outcomes.

The demonstrated operating loop is: consumer action -> source/scenario recording -> employee task -> follow-up and evidence -> management review -> controlled next action. Channel onboarding and business-circle merchant decisions are also persisted, permission-checked, and auditable.

## Explicit exclusions

- This MVP is not a full self-built marketplace, payment, cashier, call-center, OA, ERP, or replacement CRM.
- It does not provide multi-level agent revenue sharing, withdrawals, invoicing, complex financial settlement, OEM/white-label delivery, private deployment productization, an open third-party plugin marketplace, a generic low-code platform, or a large industry-template catalog.
- It does not automatically send direct messages, publish social posts, or perform third-party platform actions without the pilot's real API authorization and an auditable outcome.
- A prepared external delivery state is not proof that an external platform received, published, or completed the action.

## AI and connector execution boundary

- Accepting an AI suggestion executes only a reviewed, whitelisted local command with complete required fields. The current commands create a follow-up task inside the tenant transaction and write task, audit, and Outbox evidence.
- Suggestions without an explicit supported command or complete payload are retained as `manual_required`; they do not create an inferred task, contact a customer, or invoke an external system.
- The current AI pilot surface is limited to management-side, controlled, whitelisted local operating commands. Consumer, employee, and channel AI recommendation surfaces are explicitly deferred to V3.1; this pilot does not present CMS content as model-generated advice.
- Connector authorization is an auditable intent record. Connector catalog and health observations do not provide external delivery; a real third-party outcome requires a separately authorized integration and its external receipt.

## Pilot operating constraints

- The repository's Docker configuration and seed credentials are local-development aids, not production infrastructure.
- Recovery cloning is deliberately limited to safe `oneday_v3_test*` controlled databases. It is a rehearsal tool and never overwrites or deletes a database.
- API readiness is database-backed. A 503 readiness response means the pilot is unavailable until the database dependency is restored and readiness is rechecked.
- External accounts, verification codes, paid subscriptions, and third-party approvals remain customer/operator responsibilities. They are required before activating the corresponding real external connector capability.

## Honest customer communication

Demo only what has been verified in the controlled pilot environment. Label manual confirmations as manual, label prepared external actions as prepared, and state the responsible party and evidence required for every outcome. Do not market any excluded capability as available.
