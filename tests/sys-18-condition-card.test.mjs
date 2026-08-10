import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConditionCard,
  buildConditionCards,
} from '../packages/workflows/dist/index.js';

test('SYS-18 condition cards expose when-true/when-false equals-only IA', () => {
  const steps = [
    { name: 'Contact', type: 'task' },
    { name: 'Upsell', type: 'task', condition: { key: 'upsell', equals: true } },
    { name: 'Close', type: 'task' },
  ];
  assert.equal(buildConditionCard(steps, 0), null);
  const card = buildConditionCard(steps, 1);
  assert.ok(card);
  assert.equal(card.key, 'upsell');
  assert.equal(card.equals, true);
  assert.equal(card.apiLimit, 'key_equals_only');
  assert.equal(card.editor, 'not_free_form_drag');
  assert.match(card.whenTrueLabel, /满足则执行本步骤/);
  assert.match(card.whenFalseLabel, /进入步骤 3/);
  const cards = buildConditionCards(steps);
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.stepIndex, 1);

  const terminal = buildConditionCard(
    [
      { name: 'Only', type: 'task', condition: { key: 'vip', equals: false } },
    ],
    0,
  );
  assert.ok(terminal);
  assert.match(terminal.whenFalseLabel, /无后续步骤/);
});
