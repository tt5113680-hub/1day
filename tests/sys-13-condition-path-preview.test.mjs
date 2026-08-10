import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectConditionKeys,
  previewConditionPath,
  previewStepApplies,
} from '../packages/workflows/dist/index.js';

test('SYS-13 condition path preview gates linear steps without free-form graph', () => {
  const steps = [
    { name: 'Contact', type: 'task' },
    { name: 'Upsell', type: 'task', condition: { key: 'upsell', equals: true } },
    { name: 'Close', type: 'task' },
  ];
  assert.deepEqual(collectConditionKeys(steps), ['upsell']);
  const take = previewConditionPath(steps, { upsell: true });
  assert.equal(take.mode, 'linear_condition_path_preview');
  assert.deepEqual(take.appliedIndexes, [0, 1, 2]);
  assert.deepEqual(take.skippedIndexes, []);
  const skip = previewConditionPath(steps, { upsell: false });
  assert.deepEqual(skip.appliedIndexes, [0, 2]);
  assert.deepEqual(skip.skippedIndexes, [1]);
  assert.equal(previewStepApplies({ key: 'upsell', equals: true }, { upsell: false }), false);
});
