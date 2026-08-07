import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const seed = readFileSync('packages/database/src/seeds/foundation.ts', 'utf8');

test('foundation seed inserts permission definitions before role-permission relationships', () => {
  const permissions = seed.indexOf(".insertInto('permissions')");
  const rolePermissions = seed.indexOf(".insertInto('role_permissions')");

  assert.ok(permissions >= 0);
  assert.ok(rolePermissions > permissions);
  assert.match(seed, /permission_id: '00000000-0000-4000-8000-000000000101'/);
  assert.match(seed, /permission_id: '00000000-0000-4000-8000-000000000124'/);
});
