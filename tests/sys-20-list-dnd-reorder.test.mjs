import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listReorderEditor,
  reorderStepsByListDrop,
} from '../packages/workflows/dist/index.js';

test('SYS-20 list DnD reorder stays on ordered spine not free-form canvas', () => {
  assert.equal(listReorderEditor, 'list_native_dnd_not_free_form_canvas');
  const steps = [
    { name: 'Contact', type: 'task' },
    { name: 'Upsell', type: 'task', condition: { key: 'upsell', equals: true } },
    { name: 'Close', type: 'task' },
  ];
  const moved = reorderStepsByListDrop(steps, 0, 2);
  assert.deepEqual(
    moved.map((step) => step.name),
    ['Upsell', 'Close', 'Contact'],
  );
  assert.equal(moved[0]?.condition?.key, 'upsell');
  assert.equal(reorderStepsByListDrop(steps, 1, 1), steps);
  assert.equal(reorderStepsByListDrop(steps, -1, 0), steps);
});
