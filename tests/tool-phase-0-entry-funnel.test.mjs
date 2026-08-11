import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('TOOL-PHASE-0: entry funnel migration and API surface exist', () => {
  const root = join(process.cwd());
  const migration = readFileSync(
    join(root, 'packages/database/src/migrations/058_entry_funnel.ts'),
    'utf8',
  );
  assert.match(migration, /platform_visible_traffic/);
  assert.match(migration, /entry_funnel_events/);
  assert.match(migration, /dwell_ms/);
  assert.match(migration, /scroll_pct/);

  const service = readFileSync(join(root, 'apps/api/src/entry-funnel.service.ts'), 'utf8');
  assert.match(service, /impression/);
  assert.match(service, /module_impression/);
  assert.match(service, /saabei/);
  assert.match(service, /jump_confirm/);

  const store = readFileSync(join(root, 'apps/api/src/management-store.service.ts'), 'utf8');
  assert.match(store, /saabei/);

  const discovery = readFileSync(join(root, 'apps/api/src/consumer-discovery.service.ts'), 'utf8');
  assert.match(discovery, /platform_visible_traffic/);
});
