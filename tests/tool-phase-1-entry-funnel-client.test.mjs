import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('TOOL-PHASE-1: client emit + management summary board', () => {
  const root = process.cwd();
  const client = readFileSync(join(root, 'apps/consumer-web/app/c/entry-funnel-client.ts'), 'utf8');
  assert.match(client, /consumer\/funnel\/events/);
  assert.match(client, /bindPageFunnel/);
  assert.match(client, /scroll_depth/);

  const controller = readFileSync(join(root, 'apps/api/src/entry-funnel.controller.ts'), 'utf8');
  assert.match(controller, /management\/entry-funnel\/summary/);
  assert.match(controller, /platform-visibility/);

  const service = readFileSync(join(root, 'apps/api/src/entry-funnel.service.ts'), 'utf8');
  assert.match(service, /byModule/);
  assert.match(service, /不含支付/);

  const page = readFileSync(join(root, 'apps/management-web/app/m/entry-funnel/page.tsx'), 'utf8');
  assert.match(page, /按模块名/);
  assert.match(page, /entry-funnel\/summary/);

  const discovery = readFileSync(join(root, 'apps/consumer-web/app/c/discovery/discovery.tsx'), 'utf8');
  assert.match(discovery, /bindPageFunnel/);

  const store = readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/store.tsx'), 'utf8');
  assert.match(store, /trackFunnelEvent/);
  assert.match(store, /eventCode: 'share'/);

  const action = readFileSync(join(root, 'apps/consumer-web/app/c/actions/[id]/action.tsx'), 'utf8');
  assert.match(action, /jump_confirm/);
});
