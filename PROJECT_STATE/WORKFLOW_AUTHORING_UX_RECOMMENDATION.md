# WORKFLOW AUTHORING UX — recommended direction (not free-form drag)

- recorded_at: 2026-08-10 Asia/Shanghai
- branch: `hardening/COMMERCIAL-COMPLETION`
- baseline: SYS-10…SYS-20 PASS
- rule: no page-level patches; no 全部商用 claim; Tencent Cloud out of scope (G)

## Verdict

**Do not build a free-form drag-and-drop node canvas** as the next workflow authoring investment.

Prefer a **structured vertical timeline + condition cards + path simulator** model (already partially landed). That fits ONEDAY’s design bar better: information architecture clarity, config-driven honesty, closed-loop traceability, and low learning cost for store/ops owners.

## Why free-form drag is the wrong default here

| Risk | Why it hurts ONEDAY |
| ---- | ------------------- |
| Ambiguous edges | Operators invent cycles / orphan nodes; runtime still only supports ordered steps + equals conditions |
| High UX tax | Canvas pan/zoom/align is a product of its own; distracts from commercial pilot |
| Honesty breach | UI would imply DAG power the API does not have (`condition.key/equals` only) |
| Multi-week cost | Layout engine, collision, undo stack, mobile Management — outsized vs P0 already COVERED |

Free-form canvas remains a **possible later phase** only after product-owner UI sign-off and an explicit PRODUCT_FREEZE change.

## Recommended model: Structured Timeline Authoring (STA)

### Mental model

1. **Spine** — ordered steps (top → bottom), same as today’s linear flow.
2. **Condition card** — optional gate on a step: `key` + `equals` (existing API).
3. **Branch readout** — auto-derived take/skip edges (SYS-12); not hand-drawn.
4. **Path simulator** — sample context → applied/skipped highlight (SYS-13).
5. **Reorder** — ↑↓ or list-native reorder (SYS-14/15); never free 2D placement.
6. **Export** — linear JSON with `editor: not_free_form_drag` (SYS-16).

### Author surfaces (priority)

| Priority | Slice | Intent |
| -------- | ----- | ------ |
| P0 done | SYS-10…16 | Linear viz, branches, preview, reorder, export |
| P0 done | SYS-17 | Insert rails — Between-step「在此插入」+ duplicate step; still ordered list |
| P0 done | SYS-18 | Condition card IA — Dedicated card UI: when-true continues / when-false skips next; copy explains API limits |
| P0 done | SYS-19 | Start-context presets — Named sample contexts (e.g. `upsell=true`) saved locally for simulator |
| **P0 done** | **SYS-20** | **List drag-reorder only** — HTML5/list DnD on the spine — **not** a graph canvas |
| Deferred | Free-form DAG canvas | Requires product freeze + engine capability upgrade |

### Explicit non-goals (this phase)

- Arbitrary node positions / bezier edges
- Multi-parent merge graph editing
- Nested sub-process canvases
- Claiming visual editor = BPMN / Camunda parity

## Mapping to existing code

- Package: `@oneday/workflows` (`buildConditionBranchFlow`, `previewConditionPath`, `reorderSteps`, `serializeConditionBranchFlow`)
- UI: `apps/management-web/app/m/workflows/page.tsx` (create form + version panel)
- APIs: existing workflow create / versions / clone-publish / publish (no new write surface required for SYS-17…19)

## Human gate (parallel, not blocked by STA)

- Product owner signs `PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md`
- Engineering may refresh sandbox / walkthrough shots only — **must not** auto-mark PASS
- Walkthrough: `evidence/HUMAN-PILOT-HANDOFF/walkthrough/`

## Success criteria for SYS-17…19

1. Operator can author a 3-step conditional flow without leaving the timeline.
2. Runtime semantics remain identical to API `applies` / condition equals.
3. UI copy always states「不是自由拖拽图编辑器」.
4. Unit + Playwright evidence under `evidence/SYS-1x/`.
5. No 全部商用 / no Tencent Cloud claims.
