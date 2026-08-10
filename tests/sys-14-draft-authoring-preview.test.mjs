import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConditionBranchFlow,
  previewConditionPath,
  reorderSteps,
} from '../packages/workflows/dist/index.js';

test('SYS-14 reorderSteps keeps linear spine without free-form graph', () => {
  const steps = ['Contact', 'Upsell', 'Close'];
  assert.deepEqual(reorderSteps(steps, 2, 0), ['Close', 'Contact', 'Upsell']);
  assert.deepEqual(reorderSteps(steps, 0, 1), ['Upsell', 'Contact', 'Close']);
  assert.equal(reorderSteps(steps, -1, 0), steps);
  assert.equal(reorderSteps(steps, 0, 99), steps);

  const draft = [
    { name: 'Contact', type: 'task' },
    { name: 'Upsell', type: 'task', condition: { key: 'upsell', equals: true } },
  ];
  const reordered = reorderSteps(draft, 1, 0);
  const flow = buildConditionBranchFlow(reordered);
  assert.equal(flow.nodes[0]?.name, 'Upsell');
  assert.equal(flow.nodes[0]?.hasCondition, true);
  const path = previewConditionPath(reordered, { upsell: false });
  assert.deepEqual(path.skippedIndexes, [0]);
  assert.deepEqual(path.appliedIndexes, [1]);
});
