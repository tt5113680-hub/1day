/* global setTimeout */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('WO-02 dead-letter after max attempts and single-event replay remain idempotent', async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const ids = Object.fromEntries(['tenant', 'event'].map((key) => [key, randomUUID()]));
  const stamp = Date.now();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [ids.tenant, `dlq-${stamp}`, `DLQ ${stamp}`],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,attempts,created_by,updated_by) values($1,$2,'worker.dlq.fail.v1','worker_dlq',$3,$4,$5,'matrix-dlq',7,null,null)",
      [ids.event, ids.tenant, randomUUID(), {}, randomUUID()],
    );
    const { OutboxDispatcher, replayOutboxEvent } =
      await import('../packages/events/dist/index.js');
    const failing = new OutboxDispatcher(
      databaseUrl,
      `matrix-dlq-${stamp}`,
      async () => {
        throw Error('forced dead letter');
      },
      ids.tenant,
    );
    assert.deepEqual(await failing.dispatch(), {
      published: 0,
      retried: 0,
      skipped: 0,
      deadLetter: 1,
    });
    await failing.close();
    const dead = await client.query(
      'select status,attempts,last_error from outbox_events where id=$1',
      [ids.event],
    );
    assert.equal(dead.rows[0].status, 'needs_attention');
    assert.equal(dead.rows[0].attempts, 8);
    assert.match(dead.rows[0].last_error, /forced dead letter/);

    const replayed = await replayOutboxEvent(databaseUrl, {
      tenantId: ids.tenant,
      eventId: ids.event,
    });
    assert.equal(replayed.status, 'pending');
    await wait(10);
    const recovered = new OutboxDispatcher(
      databaseUrl,
      `matrix-dlq-${stamp}-replay`,
      async () => undefined,
      ids.tenant,
    );
    assert.deepEqual(await recovered.dispatch(), {
      published: 1,
      retried: 0,
      skipped: 0,
      deadLetter: 0,
    });
    await recovered.close();
    const finalStatus = await client.query('select status from outbox_events where id=$1', [
      ids.event,
    ]);
    assert.equal(finalStatus.rows[0].status, 'published');
  } finally {
    await client.end();
  }
});
