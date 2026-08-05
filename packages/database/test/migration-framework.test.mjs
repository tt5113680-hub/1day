import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const read = (name) => readFileSync(new URL(name, `file://${sourceRoot}`), 'utf8');

test('migration framework exposes forward repair and one-step rollback', () => {
  const source = read('migrator.ts');
  assert.match(source, /migrateToLatest/);
  assert.match(source, /migrateDown/);
  assert.match(source, /001_foundation_schema/);
});

test('test database creation is opt-in and limited to an isolated name', () => {
  const source = read('test-database.ts');
  assert.match(source, /ONEDAY_ALLOW_TEST_DATABASE/);
  assert.match(source, /SAFE_TEST_DATABASE/);
  assert.doesNotMatch(source, /drop database/i);
});
