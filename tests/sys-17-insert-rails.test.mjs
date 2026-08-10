import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConditionBranchFlow,
  duplicateStepAt,
  insertStepAt,
} from '../packages/workflows/dist/index.js';

test('SYS-17 insertStepAt and duplicateStepAt keep ordered linear spine', () => {
  const steps = [
    { name: 'Contact', type: 'task', condition: null },
    { name: 'Upsell', type: 'task', condition: { key: 'upsell', equals: true } },
  ];
  const inserted = insertStepAt(steps, 1, {
    name: 'Qualify',
    type: 'task',
    condition: null,
  });
  assert.deepEqual(
    inserted.map((step) => step.name),
    ['Contact', 'Qualify', 'Upsell'],
  );
  assert.equal(insertStepAt(steps, -1, { name: 'X', type: 'task' }), steps);
  assert.equal(insertStepAt(steps, 99, { name: 'X', type: 'task' }), steps);

  const duplicated = duplicateStepAt(inserted, 2, (step) => ({
    ...step,
    name: `${step.name} · 副本`,
    condition: step.condition ? { ...step.condition } : null,
  }));
  assert.deepEqual(
    duplicated.map((step) => step.name),
    ['Contact', 'Qualify', 'Upsell', 'Upsell · 副本'],
  );
  assert.equal(duplicated[3]?.condition?.key, 'upsell');
  assert.equal(duplicated[2]?.condition?.key, 'upsell');
  assert.notEqual(duplicated[3]?.condition, duplicated[2]?.condition);

  const flow = buildConditionBranchFlow(duplicated);
  assert.equal(flow.mode, 'linear_with_condition_branches');
  assert.equal(flow.nodes.length, 4);
  assert.equal(flow.nodes[2]?.hasCondition, true);
  assert.equal(flow.nodes[3]?.hasCondition, true);
});
