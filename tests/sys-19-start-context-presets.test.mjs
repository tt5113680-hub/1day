import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyStartContextPreset,
  buildBuiltinStartContextPresets,
  createLocalStartContextPreset,
  previewConditionPath,
} from '../packages/workflows/dist/index.js';

test('SYS-19 start-context presets apply to linear path simulator', () => {
  const keys = ['upsell', 'vip'];
  const builtins = buildBuiltinStartContextPresets(keys);
  assert.equal(builtins.length, 2);
  assert.equal(builtins[0]?.editor, 'not_free_form_drag');
  assert.equal(builtins[0]?.source, 'builtin');
  const allFalsePreset = builtins[1];
  assert.ok(allFalsePreset);
  const allFalse = applyStartContextPreset(keys, allFalsePreset);
  assert.deepEqual(allFalse, { upsell: false, vip: false });

  const local = createLocalStartContextPreset('upsell=true', { upsell: true, vip: false });
  assert.equal(local.source, 'local');
  assert.equal(local.editor, 'not_free_form_drag');
  const applied = applyStartContextPreset(['upsell', 'extra'], local);
  assert.equal(applied.upsell, true);
  assert.equal(applied.extra, true);

  const steps = [
    { name: 'Contact', type: 'task' },
    { name: 'Upsell', type: 'task', condition: { key: 'upsell', equals: true } },
  ];
  const path = previewConditionPath(steps, applyStartContextPreset(['upsell'], allFalsePreset));
  assert.deepEqual(path.appliedIndexes, [0]);
  assert.deepEqual(path.skippedIndexes, [1]);
});
