import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConditionBranchFlow } from '../packages/workflows/dist/index.js';

test('SYS-12 condition branch flow is linear take/skip only (not free-form graph)', () => {
  const flow = buildConditionBranchFlow([
    { name: 'Contact', type: 'task', timeoutMinutes: 60 },
    {
      name: 'Upsell',
      type: 'task',
      timeoutMinutes: 30,
      condition: { key: 'upsell', equals: true },
    },
    { name: 'Close', type: 'task', timeoutMinutes: 15 },
  ]);
  assert.equal(flow.mode, 'linear_with_condition_branches');
  assert.equal(flow.nodes.length, 3);
  const fromContact = flow.edges.filter((edge) => edge.from === 0);
  assert.equal(fromContact.length, 2);
  assert.equal(fromContact[0]?.kind, 'take');
  assert.equal(fromContact[0]?.to, 1);
  assert.match(fromContact[0]?.label ?? '', /满足则进入/);
  assert.equal(fromContact[1]?.kind, 'skip');
  assert.equal(fromContact[1]?.to, 2);
  assert.match(fromContact[1]?.label ?? '', /否则跳过至步骤 3/);
  const fromUpsell = flow.edges.filter((edge) => edge.from === 1);
  assert.equal(fromUpsell.length, 1);
  assert.equal(fromUpsell[0]?.kind, 'sequence');

  const terminal = buildConditionBranchFlow([
    { name: 'Only', type: 'task' },
    { name: 'Maybe', type: 'task', condition: { key: 'x', equals: false } },
  ]);
  const skip = terminal.edges.find((edge) => edge.kind === 'skip');
  assert.equal(skip?.to, null);
  assert.match(skip?.label ?? '', /无后续步骤/);
});
