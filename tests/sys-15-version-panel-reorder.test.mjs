import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConditionBranchFlow,
  reorderSteps,
} from '../packages/workflows/dist/index.js';

test('SYS-15 panel-style reorder preserves conditions on linear spine', () => {
  const steps = [
    { name: 'Contact', type: 'task', condition: null },
    { name: 'Upsell', type: 'task', condition: { key: 'upsell', equals: true } },
    { name: 'Close', type: 'task', condition: null },
  ];
  const reordered = reorderSteps(steps, 2, 0);
  assert.deepEqual(
    reordered.map((step) => step.name),
    ['Close', 'Contact', 'Upsell'],
  );
  assert.equal(reordered[2]?.condition?.key, 'upsell');
  const flow = buildConditionBranchFlow(reordered);
  assert.equal(flow.nodes[2]?.hasCondition, true);
  assert.match(flow.edges.find((edge) => edge.kind === 'take')?.label ?? '', /Upsell|upsell/);
});
