import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

export interface DomainEvent {
  eventId: string;
  eventName: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  traceId: string;
  payload: unknown;
}
export function createEvent(input: Omit<DomainEvent, 'eventId'>): DomainEvent {
  return { ...input, eventId: randomUUID() };
}

export class PostgresOutbox {
  private readonly pool: Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }
  async publish(event: DomainEvent): Promise<void> {
    await this.pool.query(
      'insert into outbox_events (id, tenant_id, event_type, aggregate_type, aggregate_id, payload, correlation_id, trace_id, status, created_by, updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,null)',
      [
        event.eventId,
        event.tenantId,
        event.eventName,
        event.aggregateType,
        event.aggregateId,
        event.payload,
        event.correlationId,
        event.traceId,
        'pending',
      ],
    );
  }
  async consumeOnce(
    event: DomainEvent,
    consumerName: string,
    handler: () => Promise<void>,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const insert = await client.query(
        'insert into event_consumptions (id, tenant_id, event_id, consumer_name) values ($1,$2,$3,$4) on conflict (event_id, consumer_name) do nothing',
        [randomUUID(), event.tenantId, event.eventId, consumerName],
      );
      if (insert.rowCount !== 1) {
        await client.query('rollback');
        return false;
      }
      await handler();
      await client.query(
        'update outbox_events set status=$1, published_at=now() where id=$2 and tenant_id=$3',
        ['published', event.eventId, event.tenantId],
      );
      await client.query('commit');
      return true;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.pool.end();
  }
}
