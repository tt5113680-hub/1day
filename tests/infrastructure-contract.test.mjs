import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const compose = readFileSync(join(process.cwd(), 'infra', 'docker', 'compose.yaml'), 'utf8');

for (const service of ['postgres', 'redis', 'api', 'worker']) {
  test(`Compose defines ${service} with a health check`, () => {
    const serviceWithHealthCheck = new RegExp(
      String.raw`\n  ${service}:\n(?:(?!\n  [a-z][a-z0-9_-]*:).)*\n    healthcheck:`,
      's',
    );
    assert.match(compose, serviceWithHealthCheck);
  });
}

test('Compose isolates local data volumes and avoids old-project host ports', () => {
  assert.match(compose, /oneday_v3_postgres_data/);
  assert.match(compose, /oneday_v3_redis_data/);
  assert.match(compose, /"5434:5432"/);
  assert.match(compose, /"6380:6379"/);
});
