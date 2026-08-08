# V3.1 design-system debt

AUDIT-BATCH-7 found no remaining pilot-blocking UI defect in the verified consumer-to-employee-to-management journey. The following deliberately do not block the controlled pilot because they do not alter task completion, evidence capture, tenant isolation, or session boundaries.

- Extract a shared cross-application navigation and logout shell so consumer, employee, management, and platform terminal chrome have a single visual standard.
- Establish product-wide content governance for merchant-authored titles and names, including multilingual fallback rules. The current journey removes system-generated identifiers while retaining intentional merchant content.
- Promote the audited mobile task-result composition into reusable form/action primitives and extend viewport visual regression coverage beyond the critical 390px flow.
