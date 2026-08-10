import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyStartContextPreset,
  buildBuiltinStartContextPresets,
  buildConditionCard,
  collectConditionKeys,
  insertStepAt,
  listReorderEditor,
  previewConditionPath,
  reorderStepsByListDrop,
  serializeConditionBranchFlow,
} from '../packages/workflows/dist/index.js';

test('SYS-21 STA closed loop keeps equals-only linear authoring honest', () => {
  let steps = [{ name: 'Contact', type: 'task' }];
  steps = insertStepAt(steps, 1, {
    name: 'Upsell',
    type: 'task',
    condition: { key: 'upsell', equals: true },
  });
  steps = insertStepAt(steps, 2, { name: 'Close', type: 'task' });
  steps = reorderStepsByListDrop(steps, 2, 1);

  assert.deepEqual(
    steps.map((step) => step.name),
    ['Contact', 'Close', 'Upsell'],
  );

  const card = buildConditionCard(steps, 2);
  assert.ok(card);
  assert.equal(card.apiLimit, 'key_equals_only');
  assert.equal(card.editor, 'not_free_form_drag');
  assert.match(card.whenFalseLabel, /无后续步骤/);

  const keys = collectConditionKeys(steps);
  const presets = buildBuiltinStartContextPresets(keys);
  const skipped = previewConditionPath(
    steps,
    applyStartContextPreset(keys, presets[1]),
  );
  assert.deepEqual(skipped.appliedIndexes, [0, 1]);
  assert.deepEqual(skipped.skippedIndexes, [2]);

  const exported = serializeConditionBranchFlow(steps);
  assert.equal(exported.editor, 'not_free_form_drag');
  assert.equal(exported.mode, 'linear_with_condition_branches');
  assert.equal(listReorderEditor, 'list_native_dnd_not_free_form_canvas');
  assert.equal('positions' in exported, false);
  assert.equal('canvas' in exported, false);
});
