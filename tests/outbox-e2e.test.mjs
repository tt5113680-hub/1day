import assert from 'node:assert/strict';
import test from 'node:test';
import { createEvent, PostgresOutbox } from '../packages/events/dist/index.js';

test('Postgres Outbox persists tracing fields and consumer idempotency', async () => {
  const outbox = new PostgresOutbox(
    'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  );
  try {
    const event = createEvent({
      eventName: 'foundation.outbox.verified.v1',
      tenantId: '00000000-0000-4000-8000-000000000001',
      aggregateType: 'foundation',
      aggregateId: '00000000-0000-4000-8000-000000000001',
      correlationId: '00000000-0000-4000-8000-000000000010',
      traceId: 'foundation-008-test',
      payload: { verified: true },
    });
    await outbox.publish(event);
    let calls = 0;
    assert.equal(
      await outbox.consumeOnce(event, 'foundation-test', async () => {
        calls += 1;
      }),
      true,
    );
    assert.equal(
      await outbox.consumeOnce(event, 'foundation-test', async () => {
        calls += 1;
      }),
      false,
    );
    assert.equal(calls, 1);
  } finally {
    await outbox.close();
  }
});
