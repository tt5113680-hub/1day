import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function mustInclude(path, needle, label) {
  const text = readFileSync(join(root, path), 'utf8');
  assert.ok(text.includes(needle), `${label}: missing ${needle} in ${path}`);
}

mustInclude(
  'apps/api/src/portal-layout.service.ts',
  'portal_bindings',
  'portal layout service',
);
mustInclude(
  'apps/api/src/page-template.service.ts',
  'portal_preview_tokens',
  'page template portal preview',
);
mustInclude(
  'apps/employee-web/app/e/workbench/workbench-layout-modules.tsx',
  'PortalWorkbenchLayout',
  'employee layout renderer',
);
mustInclude(
  'apps/management-web/app/m/management-home-modules.tsx',
  'PortalManagementHomeLayout',
  'management layout renderer',
);
mustInclude(
  'packages/database/src/migrations/061_portal_bindings.ts',
  'portal_bindings',
  'portal bindings migration',
);
mustInclude(
  'scripts/local-human-pilot-seed.mjs',
  'employee-workbench',
  'human pilot employee portal seed',
);
mustInclude(
  'apps/management-web/app/m/page-builder/page.tsx',
  '在员工 H5 打开安全预览',
  'page builder employee preview label',
);

console.log('g1-winf104-portal-page-builder: 7/7 PASS');
