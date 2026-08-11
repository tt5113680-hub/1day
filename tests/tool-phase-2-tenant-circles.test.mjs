import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('TOOL-PHASE-2: tenant circle dual-identity surface', () => {
  const root = process.cwd();
  const migration = readFileSync(
    join(root, 'packages/database/src/migrations/059_tenant_circles.ts'),
    'utf8',
  );
  assert.match(migration, /public_visible/);
  assert.match(migration, /business_circle_applications/);
  assert.match(migration, /latitude/);

  const service = readFileSync(join(root, 'apps/api/src/tenant-circle.service.ts'), 'utf8');
  assert.match(service, /listPublic/);
  assert.match(service, /nearbyToJoin/);
  assert.match(service, /'invite'/);
  assert.match(service, /'apply'/);

  const controller = readFileSync(join(root, 'apps/api/src/tenant-circle.controller.ts'), 'utf8');
  assert.match(controller, /consumer\/circles/);
  assert.match(controller, /management\/circles\/apply/);

  const home = readFileSync(join(root, 'apps/consumer-web/app/c/circles/circles-home.tsx'), 'utf8');
  assert.match(home, /surface=\"circle\"|surface: 'circle'/);
  assert.match(home, /circles_home|商圈单独页/);

  const mgmt = readFileSync(join(root, 'apps/management-web/app/m/circles/page.tsx'), 'utf8');
  assert.match(mgmt, /双身份/);
  assert.match(mgmt, /management\/circles\/invite/);
});
