import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import { TenantQuotaService } from './tenant-quota.service';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTITY_TYPES = new Set(['phone', 'wechat']);

type IdentityInput = { type: string; value: string };

function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
}

function identity(value: unknown): IdentityInput {
  if (!value || typeof value !== 'object') throw new BadRequestException('VALIDATION_ERROR');
  const input = value as Record<string, unknown>;
  const type = text(input.type, 40).toLowerCase();
  if (!IDENTITY_TYPES.has(type)) throw new BadRequestException('VALIDATION_ERROR');
  let raw = text(input.value, 160);
  if (type === 'phone') {
    raw = raw.replace(/[\s()-]/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(raw)) throw new BadRequestException('VALIDATION_ERROR');
  } else raw = raw.toLowerCase();
  return { type, value: raw };
}

function mask(input: IdentityInput): string {
  if (input.type === 'phone') return `${input.value.slice(0, 3)}****${input.value.slice(-4)}`;
  return input.value.length < 5
    ? `${input.value.slice(0, 1)}***`
    : `${input.value.slice(0, 2)}***${input.value.slice(-2)}`;
}

function digest(input: IdentityInput) {
  return createHash('sha256').update(`${input.type}:${input.value}`).digest('hex');
}

function correlation(requestId: string) {
  return UUID.test(requestId) ? requestId : randomUUID();
}

function customerRow(row: Record<string, unknown>, identities: Record<string, unknown>[] = []) {
  return {
    id: row.id,
    displayName: row.display_name,
    status: row.status,
    mergedIntoId: row.merged_into_id,
    version: row.version,
    identities: identities.map((item) => ({
      id: item.id,
      type: item.identity_type,
      maskedValue: item.masked_value,
      status: item.status,
      version: item.version,
    })),
  };
}

@Injectable()
export class CustomerService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  constructor(private readonly quotas: TenantQuotaService) {}

  async list(context: OrganizationContext) {
    const customers = await this.pool.query(
      "select * from customers where tenant_id=$1 and deleted_at is null and status='active' order by created_at desc",
      [context.tenantId],
    );
    return Promise.all(customers.rows.map((row) => this.toResponse(context.tenantId, row)));
  }

  async get(context: OrganizationContext, id: string) {
    if (!UUID.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      'select * from customers where id=$1 and tenant_id=$2 and deleted_at is null',
      [id, context.tenantId],
    );
    if (result.rowCount !== 1) throw new NotFoundException('NOT_FOUND');
    return this.toResponse(context.tenantId, result.rows[0]);
  }

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    idempotencyKey: string,
    requestId: string,
  ) {
    if (!idempotencyKey.trim() || idempotencyKey.length > 200)
      throw new BadRequestException('VALIDATION_ERROR');
    const displayName = text(body.displayName, 160);
    if (
      !Array.isArray(body.identities) ||
      body.identities.length === 0 ||
      body.identities.length > 8
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const identities = body.identities.map(identity);
    if (new Set(identities.map(digest)).size !== identities.length)
      throw new BadRequestException('VALIDATION_ERROR');
    return this.withIdempotency(context, 'customer', idempotencyKey, async (client) => {
      await this.quotas.assertWithin(client, context, 'customers', 'customer');
      for (const item of identities)
        await this.assertIdentityAvailable(client, context.tenantId, item);
      const id = randomUUID();
      const created = await client.query(
        'insert into customers(id,tenant_id,display_name,created_by,updated_by) values($1,$2,$3,$4,$4) returning *',
        [id, context.tenantId, displayName, context.userId],
      );
      for (const item of identities) await this.insertIdentity(client, context, id, item);
      const data = customerRow(
        created.rows[0],
        await this.identities(client, context.tenantId, id),
      );
      await this.audit(client, context, 'customer.created', 'customer', id, requestId, {
        after: data,
      });
      await this.event(client, context, 'customer.created.v1', id, requestId, data);
      return data;
    });
  }

  async addIdentity(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(id) || typeof body.version !== 'number' || !Number.isInteger(body.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const item = identity(body.identity);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const customer = await client.query(
        "select * from customers where id=$1 and tenant_id=$2 and status='active' and deleted_at is null and version=$3 for update",
        [id, context.tenantId, body.version],
      );
      if (customer.rowCount !== 1) await this.missingOrConflict(client, context.tenantId, id);
      await this.assertIdentityAvailable(client, context.tenantId, item);
      await this.insertIdentity(client, context, id, item);
      await client.query(
        'update customers set version=version+1,updated_at=now(),updated_by=$1 where id=$2',
        [context.userId, id],
      );
      const data = await this.getForClient(client, context.tenantId, id);
      await this.audit(client, context, 'customer.identity_added', 'customer', id, requestId, {
        identity: { type: item.type, maskedValue: mask(item) },
      });
      await this.event(client, context, 'customer.identity_added.v1', id, requestId, data);
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async merge(
    context: OrganizationContext,
    sourceId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (
      !UUID.test(sourceId) ||
      !UUID.test(String(body.targetCustomerId)) ||
      body.targetCustomerId === sourceId ||
      typeof body.sourceVersion !== 'number' ||
      !Number.isInteger(body.sourceVersion) ||
      typeof body.targetVersion !== 'number' ||
      !Number.isInteger(body.targetVersion)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const targetId = body.targetCustomerId as string;
    const reason = text(body.reason, 320);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const source = await client.query(
        "select * from customers where id=$1 and tenant_id=$2 and status='active' and deleted_at is null and version=$3 for update",
        [sourceId, context.tenantId, body.sourceVersion],
      );
      const target = await client.query(
        "select * from customers where id=$1 and tenant_id=$2 and status='active' and deleted_at is null and version=$3 for update",
        [targetId, context.tenantId, body.targetVersion],
      );
      if (source.rowCount !== 1 || target.rowCount !== 1) {
        const found = await client.query(
          "select id from customers where id=any($1::uuid[]) and tenant_id=$2 and status='active' and deleted_at is null",
          [[sourceId, targetId], context.tenantId],
        );
        if (found.rowCount !== 2) throw new NotFoundException('NOT_FOUND');
        throw new ConflictException('CONFLICT');
      }
      await client.query(
        'update customer_identities set customer_id=$1,updated_at=now(),updated_by=$2 where customer_id=$3 and tenant_id=$4 and status=$5',
        [targetId, context.userId, sourceId, context.tenantId, 'active'],
      );
      await client.query(
        "update customers set status='merged',merged_into_id=$1,version=version+1,updated_at=now(),updated_by=$2 where id=$3",
        [targetId, context.userId, sourceId],
      );
      await client.query(
        'update customers set version=version+1,updated_at=now(),updated_by=$1 where id=$2',
        [context.userId, targetId],
      );
      const mergeId = randomUUID();
      await client.query(
        'insert into customer_merges(id,tenant_id,source_customer_id,target_customer_id,reason,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [mergeId, context.tenantId, sourceId, targetId, reason, context.userId],
      );
      const data = { mergeId, sourceCustomerId: sourceId, targetCustomerId: targetId, reason };
      await this.audit(client, context, 'customer.merged', 'customer', sourceId, requestId, data);
      await this.event(client, context, 'customer.merged.v1', targetId, requestId, data);
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async withIdempotency(
    context: OrganizationContext,
    resourceType: string,
    key: string,
    action: (client: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3 and deleted_at is null',
        [context.tenantId, resourceType, key],
      );
      if (replay.rowCount === 1) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const data = await action(client);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, resourceType, key, data, context.userId],
      );
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async assertIdentityAvailable(client: PoolClient, tenantId: string, item: IdentityInput) {
    const duplicate = await client.query(
      "select customer_id from customer_identities where tenant_id=$1 and identity_type=$2 and identity_value_hash=$3 and status='active' and deleted_at is null",
      [tenantId, item.type, digest(item)],
    );
    if (duplicate.rowCount) throw new ConflictException('CONFLICT');
  }

  private async insertIdentity(
    client: PoolClient,
    context: OrganizationContext,
    customerId: string,
    item: IdentityInput,
  ) {
    await client.query(
      'insert into customer_identities(id,tenant_id,customer_id,identity_type,identity_value_hash,masked_value,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
      [
        randomUUID(),
        context.tenantId,
        customerId,
        item.type,
        digest(item),
        mask(item),
        context.userId,
      ],
    );
  }

  private async toResponse(tenantId: string, row: Record<string, unknown>) {
    return customerRow(row, await this.identities(this.pool, tenantId, String(row.id)));
  }

  private async getForClient(client: PoolClient, tenantId: string, id: string) {
    const result = await client.query('select * from customers where id=$1 and tenant_id=$2', [
      id,
      tenantId,
    ]);
    return customerRow(result.rows[0], await this.identities(client, tenantId, id));
  }

  private async identities(client: Pool | PoolClient, tenantId: string, customerId: string) {
    return (
      await client.query(
        "select * from customer_identities where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null order by created_at",
        [tenantId, customerId],
      )
    ).rows;
  }

  private async missingOrConflict(
    client: PoolClient,
    tenantId: string,
    id: string,
  ): Promise<never> {
    const exists = await client.query(
      "select id from customers where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
      [id, tenantId],
    );
    if (exists.rowCount === 0) throw new NotFoundException('NOT_FOUND');
    throw new ConflictException('CONFLICT');
  }

  private async audit(
    client: PoolClient,
    context: OrganizationContext,
    action: string,
    resourceType: string,
    resourceId: string,
    requestId: string,
    details: unknown,
  ) {
    await client.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        resourceType,
        resourceId,
        correlation(requestId),
        'core-004',
        details,
      ],
    );
  }

  private async event(
    client: PoolClient,
    context: OrganizationContext,
    eventType: string,
    aggregateId: string,
    requestId: string,
    payload: unknown,
  ) {
    const correlationId = correlation(requestId);
    await client.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        context.tenantId,
        eventType,
        'customer',
        aggregateId,
        { eventName: eventType, correlationId, traceId: 'core-004', payload },
        correlationId,
        'core-004',
        context.userId,
      ],
    );
  }
}
