import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('TOOL-PHASE-5: saved DIY views migration + API + board', () => {
  const root = process.cwd();
  const migration = readFileSync(
    join(root, 'packages/database/src/migrations/060_entry_funnel_saved_views.ts'),
    'utf8',
  );
  assert.match(migration, /entry_funnel_saved_views/);
  assert.match(migration, /group_by/);

  const migrator = readFileSync(join(root, 'packages/database/src/migrator.ts'), 'utf8');
  assert.match(migrator, /060_entry_funnel_saved_views/);

  const types = readFileSync(join(root, 'packages/database/src/types.ts'), 'utf8');
  assert.match(types, /entry_funnel_saved_views/);

  const controller = readFileSync(join(root, 'apps/api/src/entry-funnel.controller.ts'), 'utf8');
  assert.match(controller, /management\/entry-funnel\/saved-views/);
  assert.match(controller, /saved-views\/:id\/delete/);

  const service = readFileSync(join(root, 'apps/api/src/entry-funnel.service.ts'), 'utf8');
  assert.match(service, /listSavedViews/);
  assert.match(service, /saveView/);
  assert.match(service, /deleteView/);

  const page = readFileSync(join(root, 'apps/management-web/app/m/entry-funnel/page.tsx'), 'utf8');
  assert.match(page, /保存当前 DIY/);
  assert.match(page, /saved-views/);
  assert.match(page, /savedViews/);
});
