import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeConditionBranchFlow } from '../packages/workflows/dist/index.js';

test('SYS-16 serializeConditionBranchFlow is honest about not being free-form', () => {
  const serialized = serializeConditionBranchFlow([
    { name: 'Contact', type: 'task' },
    { name: 'Upsell', type: 'task', condition: { key: 'upsell', equals: true } },
  ]);
  assert.equal(serialized.mode, 'linear_with_condition_branches');
  assert.equal(serialized.editor, 'not_free_form_drag');
  assert.equal(serialized.nodes.length, 2);
  assert.equal(serialized.edges.some((edge) => edge.kind === 'take'), true);
  assert.equal(serialized.edges.some((edge) => edge.kind === 'skip'), true);
  assert.equal('positions' in serialized, false);
  assert.equal('canvas' in serialized, false);
});
