import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPLOYEE_MENU_CATALOG,
  STORE_MANAGER_PACKAGE_ACTIONS,
} from '../packages/contracts/dist/index.js';

test('SYS-30: Employee 任务 menu deep-links to /e/tasks inbox', () => {
  const tasks = EMPLOYEE_MENU_CATALOG.find((item) => item.key === 'tasks');
  assert.ok(tasks);
  assert.equal(tasks.href, '/e/tasks');
  assert.equal(
    STORE_MANAGER_PACKAGE_ACTIONS.find((item) => item.key === 'tasks')?.href,
    '/e/tasks',
  );
});
