import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLinearFlow,
  previewStepApplies,
  summarizeCondition,
} from '../packages/workflows/dist/index.js';

test('summarizeCondition and linear flow are honest about skips', () => {
  assert.equal(summarizeCondition(null), '始终执行');
  assert.equal(summarizeCondition({ key: 'upsell', equals: true }), 'upsell = true');
  const flow = buildLinearFlow([
    { name: 'Contact', type: 'task', timeoutMinutes: 60 },
    {
      name: 'Upsell',
      type: 'task',
      timeoutMinutes: 30,
      condition: { key: 'upsell', equals: true },
    },
  ]);
  assert.equal(flow.nodes.length, 2);
  assert.equal(flow.edges.length, 1);
  assert.equal(flow.nodes[1].hasCondition, true);
  assert.equal(flow.edges[0].label, '若 upsell = true');
  assert.equal(previewStepApplies({ key: 'upsell', equals: true }, { upsell: true }), true);
  assert.equal(previewStepApplies({ key: 'upsell', equals: true }, { upsell: false }), false);
});
