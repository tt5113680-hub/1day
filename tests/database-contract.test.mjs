import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const databaseManifest = JSON.parse(readFileSync('packages/database/package.json', 'utf8'));

test('database commands and Kysely migration sources are present', () => {
  for (const script of ['db:migrate', 'db:rollback', 'db:repair', 'db:seed', 'db:test:prepare']) {
    assert.ok(manifest.scripts[script]);
  }
  for (const script of ['migrate', 'migrate:down', 'migrate:repair', 'seed', 'test:prepare']) {
    assert.ok(databaseManifest.scripts[script]);
  }
  assert.ok(existsSync('packages/database/src/migrations/001_foundation_schema.ts'));
  assert.ok(existsSync('packages/database/src/seeds/foundation.ts'));
});

test('foundation schema includes tenant, access and audit foundations', () => {
  const migration = readFileSync(
    'packages/database/src/migrations/001_foundation_schema.ts',
    'utf8',
  );
  for (const table of [
    'tenants',
    'users',
    'memberships',
    'roles',
    'permissions',
    'data_scopes',
    'outbox_events',
    'audit_logs',
  ]) {
    assert.match(migration, new RegExp(`createTable\\('${table}'\\)`));
  }
  assert.match(migration, /correlation_id/);
  assert.match(migration, /trace_id/);
});
