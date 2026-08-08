import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';

export interface OrganizationContext {
  tenantId: string;
  userId: string;
}

type OrganizationInput = {
  code: string;
  name: string;
  organizationType: string;
  parentOrganizationId?: string;
};

type MerchantInput = { code: string; name: string; organizationId: string };
type StoreInput = {
  code: string;
  name: string;
  organizationId: string;
  merchantId: string;
  address?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
}

function optionalUuid(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !UUID.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
}

function responseRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    merchantId: row.merchant_id,
    code: row.code,
    name: row.name,
    organizationType: row.organization_type,
    address: row.address,
    status: row.status,
    version: row.version,
  };
}

@Injectable()
export class OrganizationService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async listOrganizations(context: OrganizationContext) {
    const result = await this.pool.query(
      "select * from organizations where tenant_id=$1 and deleted_at is null and status='active' order by code",
      [context.tenantId],
    );
    return result.rows.map(responseRow);
  }

  async createOrganization(
    context: OrganizationContext,
    body: Record<string, unknown>,
    idempotencyKey: string,
    correlationId: string,
  ) {
    const input: OrganizationInput = {
      code: requiredText(body.code, 'code', 80),
      name: requiredText(body.name, 'name', 160),
      organizationType: requiredText(body.organizationType, 'organizationType', 80),
      parentOrganizationId: optionalUuid(body.parentOrganizationId),
    };
    return this.createWithIdempotency(
      context,
      'organization',
      idempotencyKey,
      correlationId,
      async (client) => {
        if (input.parentOrganizationId)
          await this.requireOrganization(client, context.tenantId, input.parentOrganizationId);
        const id = randomUUID();
        const created = await client.query(
          'insert into organizations (id,tenant_id,code,name,organization_type,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$6) returning *',
          [id, context.tenantId, input.code, input.name, input.organizationType, context.userId],
        );
        if (input.parentOrganizationId)
          await client.query(
            'insert into organization_relations (id,tenant_id,parent_organization_id,child_organization_id,relation_type,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$6)',
            [
              randomUUID(),
              context.tenantId,
              input.parentOrganizationId,
              id,
              'contains',
              context.userId,
            ],
          );
        const data = responseRow(created.rows[0]);
        await this.audit(
          client,
          context,
          'organization.created',
          'organization',
          id,
          correlationId,
          {
            after: data,
          },
        );
        return data;
      },
    );
  }

  async updateOrganization(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    correlationId: string,
  ) {
    if (!UUID.test(id) || typeof body.version !== 'number' || !Number.isInteger(body.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const name = requiredText(body.name, 'name', 160);
    const result = await this.pool.query(
      'update organizations set name=$1,updated_at=now(),updated_by=$2,version=version+1 where id=$3 and tenant_id=$4 and version=$5 and deleted_at is null returning *',
      [name, context.userId, id, context.tenantId, body.version],
    );
    if (result.rowCount !== 1) {
      const existing = await this.pool.query(
        'select id from organizations where id=$1 and tenant_id=$2 and deleted_at is null',
        [id, context.tenantId],
      );
      if (existing.rowCount === 0) throw new NotFoundException('NOT_FOUND');
      throw new ConflictException('CONFLICT');
    }
    const data = responseRow(result.rows[0]);
    await this.audit(
      this.pool,
      context,
      'organization.updated',
      'organization',
      id,
      correlationId,
      {
        after: data,
      },
    );
    return data;
  }

  async listMerchants(context: OrganizationContext) {
    const result = await this.pool.query(
      "select * from merchants where tenant_id=$1 and deleted_at is null and status='active' order by code",
      [context.tenantId],
    );
    return result.rows.map(responseRow);
  }

  async createMerchant(
    context: OrganizationContext,
    body: Record<string, unknown>,
    idempotencyKey: string,
    correlationId: string,
  ) {
    const input: MerchantInput = {
      code: requiredText(body.code, 'code', 80),
      name: requiredText(body.name, 'name', 160),
      organizationId: requiredText(body.organizationId, 'organizationId', 36),
    };
    if (!UUID.test(input.organizationId)) throw new BadRequestException('VALIDATION_ERROR');
    return this.createWithIdempotency(
      context,
      'merchant',
      idempotencyKey,
      correlationId,
      async (client) => {
        await this.requireOrganization(client, context.tenantId, input.organizationId);
        const id = randomUUID();
        const created = await client.query(
          'insert into merchants (id,tenant_id,organization_id,code,name,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$6) returning *',
          [id, context.tenantId, input.organizationId, input.code, input.name, context.userId],
        );
        const data = responseRow(created.rows[0]);
        await this.audit(client, context, 'merchant.created', 'merchant', id, correlationId, {
          after: data,
        });
        return data;
      },
    );
  }

  async listStores(context: OrganizationContext) {
    const result = await this.pool.query(
      "select * from stores where tenant_id=$1 and deleted_at is null and status='active' order by code",
      [context.tenantId],
    );
    return result.rows.map(responseRow);
  }

  async createStore(
    context: OrganizationContext,
    body: Record<string, unknown>,
    idempotencyKey: string,
    correlationId: string,
  ) {
    const input: StoreInput = {
      code: requiredText(body.code, 'code', 80),
      name: requiredText(body.name, 'name', 160),
      organizationId: requiredText(body.organizationId, 'organizationId', 36),
      merchantId: requiredText(body.merchantId, 'merchantId', 36),
      address: body.address === undefined ? undefined : requiredText(body.address, 'address', 320),
    };
    if (!UUID.test(input.organizationId) || !UUID.test(input.merchantId))
      throw new BadRequestException('VALIDATION_ERROR');
    return this.createWithIdempotency(
      context,
      'store',
      idempotencyKey,
      correlationId,
      async (client) => {
        await this.requireOrganization(client, context.tenantId, input.organizationId);
        const merchant = await client.query(
          "select id from merchants where id=$1 and tenant_id=$2 and organization_id=$3 and deleted_at is null and status='active'",
          [input.merchantId, context.tenantId, input.organizationId],
        );
        if (merchant.rowCount !== 1) throw new NotFoundException('NOT_FOUND');
        const id = randomUUID();
        const created = await client.query(
          'insert into stores (id,tenant_id,organization_id,merchant_id,code,name,address,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$8) returning *',
          [
            id,
            context.tenantId,
            input.organizationId,
            input.merchantId,
            input.code,
            input.name,
            input.address ?? null,
            context.userId,
          ],
        );
        const data = responseRow(created.rows[0]);
        await this.audit(client, context, 'store.created', 'store', id, correlationId, {
          after: data,
        });
        return data;
      },
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async createWithIdempotency(
    context: OrganizationContext,
    resourceType: string,
    idempotencyKey: string,
    correlationId: string,
    create: (client: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    if (idempotencyKey.trim().length === 0 || idempotencyKey.length > 200)
      throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const previous = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3 and deleted_at is null',
        [context.tenantId, resourceType, idempotencyKey],
      );
      if (previous.rowCount === 1) {
        await client.query('commit');
        return previous.rows[0].response;
      }
      const data = await create(client);
      await client.query(
        'insert into idempotency_keys (id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, resourceType, idempotencyKey, data, context.userId],
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

  private async requireOrganization(client: PoolClient, tenantId: string, organizationId: string) {
    const result = await client.query(
      "select id from organizations where id=$1 and tenant_id=$2 and deleted_at is null and status='active'",
      [organizationId, tenantId],
    );
    if (result.rowCount !== 1) throw new NotFoundException('NOT_FOUND');
  }

  private async audit(
    client: Pool | PoolClient,
    context: OrganizationContext,
    action: string,
    resourceType: string,
    resourceId: string,
    correlationId: string,
    details: Record<string, unknown>,
  ) {
    await client.query(
      'insert into audit_logs (id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        resourceType,
        resourceId,
        UUID.test(correlationId) ? correlationId : randomUUID(),
        'core-001',
        details,
      ],
    );
  }
}
