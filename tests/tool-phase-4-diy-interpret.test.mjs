import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('TOOL-PHASE-4: DIY query + interpret-only', () => {
  const root = process.cwd();
  const service = readFileSync(join(root, 'apps/api/src/entry-funnel.service.ts'), 'utf8');
  assert.match(service, /async query\(/);
  assert.match(service, /async interpret\(/);
  assert.match(service, /interpret_only/);
  assert.match(service, /禁止编造成交/);
  assert.match(service, /groupBy === 'day'/);

  const controller = readFileSync(join(root, 'apps/api/src/entry-funnel.controller.ts'), 'utf8');
  assert.match(controller, /management\/entry-funnel\/query/);
  assert.match(controller, /management\/entry-funnel\/interpret/);

  const page = readFileSync(join(root, 'apps/management-web/app/m/entry-funnel/page.tsx'), 'utf8');
  assert.match(page, /自助分析/);
  assert.match(page, /AI 解读/);
  assert.match(page, /entry-funnel\/query/);
  assert.match(page, /entry-funnel\/interpret/);
});
