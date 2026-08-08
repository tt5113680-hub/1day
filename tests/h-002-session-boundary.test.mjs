import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const protectedRoots = [
  'apps/employee-web/app',
  'apps/management-web/app',
  'apps/platform-web/app',
];

async function sourceFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? sourceFiles(join(path, entry.name))
        : entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')
          ? [join(path, entry.name)]
          : [],
    ),
  );
  return nested.flat();
}

test('H-002 protected business pages use the shared session boundary', async () => {
  const files = (await Promise.all(protectedRoots.map(sourceFiles))).flat();
  const violations = [];
  for (const file of files) {
    const source = await readFile(file, 'latin1');
    if (/sessionStorage|oneday\.accessToken|Bearer \$\{|\bfetch\(/.test(source))
      violations.push(file);
  }
  assert.deepEqual(violations, []);
});

test('H-002 consumer routes do not default public traffic to system', async () => {
  const files = await sourceFiles('apps/consumer-web/app');
  const violations = [];
  for (const file of files) {
    const source = await readFile(file, 'latin1');
    if (/tenant\s*=\s*['"]system['"]|\/c\/login/.test(source)) violations.push(file);
  }
  assert.deepEqual(violations, []);
});
