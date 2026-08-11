import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('TOOL-PHASE-6: circle/one-code/share L2 emit + share pairing', () => {
  const root = process.cwd();

  const oneCode = readFileSync(
    join(root, 'apps/consumer-web/app/c/one-code/[code]/one-code-landing.tsx'),
    'utf8',
  );
  assert.match(oneCode, /trackFunnelEvent/);
  assert.match(oneCode, /surface: 'one_code'/);
  assert.match(oneCode, /eventCode: 'visit'/);

  const circles = readFileSync(join(root, 'apps/management-web/app/m/circles/page.tsx'), 'utf8');
  assert.match(circles, /management\/entry-funnel\/events/);
  assert.match(circles, /circle_invite/);
  assert.match(circles, /circle_apply/);

  const shareSvc = readFileSync(join(root, 'apps/api/src/employee-share.service.ts'), 'utf8');
  assert.match(shareSvc, /entry_funnel_events/);
  assert.match(shareSvc, /'share'/);
  assert.match(shareSvc, /'share_open'/);
  assert.match(shareSvc, /employee_share_create/);

  const funnel = readFileSync(join(root, 'apps/api/src/entry-funnel.service.ts'), 'utf8');
  assert.match(funnel, /sharePairing/);
  assert.match(funnel, /paired_codes/);
  assert.match(funnel, /ingestAuthenticated/);

  const page = readFileSync(join(root, 'apps/management-web/app/m/entry-funnel/page.tsx'), 'utf8');
  assert.match(page, /分享配对/);
  assert.match(page, /sharePairing/);
});
