# SYSTEMIC CONSTRUCTION PLAN — SYS waves

- recorded_at: 2026-08-10 Asia/Shanghai
- rule: no page-level patches; no 全部商用 claim; Tencent Cloud out of scope (G)

## Status

SYS-1…SYS-17 PASS (through STA insert rails).

## Recommended authoring direction (owner 2026-08-10)

**Not** free-form drag canvas. See `WORKFLOW_AUTHORING_UX_RECOMMENDATION.md`:

**Structured Timeline Authoring (STA)** — vertical spine + condition cards + path simulator + insert rails.

Next engineering slices if continuing auto-construction:

1. **SYS-18** — condition card IA（when-true / when-false readout bound to existing equals API）
2. **SYS-19** — start-context presets for path simulator

## Queue

- Product-owner UI sign-off (human) — parallel gate
- SYS-18…19 STA slices (preferred over free-form drag)
- Free-form DAG canvas — deferred; needs PRODUCT_FREEZE + engine capability

## Honest day boundary

External commercial claims blocked without human sign-off. STA continues the honest linear model already proven in SYS-10…17.
