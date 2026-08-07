import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const recovery = readFileSync('packages/database/src/recovery.ts', 'utf8');
const cli = readFileSync('packages/database/src/cli.ts', 'utf8');
const runbook = readFileSync('docs/RELEASE_AND_RECOVERY.md', 'utf8');

test('recovery clone only accepts a guarded test-database namespace and verifies config and evidence data', () => {
  assert.match(recovery, /SAFE_DATABASE/);
  assert.match(recovery, /Recovery target must differ from source/);
  assert.match(recovery, /'tenant_operating_settings'/);
  assert.match(recovery, /'connector_configs'/);
  assert.match(recovery, /'evidence_files'/);
  assert.match(recovery, /Recovery count mismatch/);
  assert.match(cli, /recovery:clone/);
  assert.match(runbook, /never overwrites a database/);
});
