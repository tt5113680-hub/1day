import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_ROLES = new Set(['first_source', 'current_source', 'final_source']);
const CONTRIBUTION_ROLES = new Set(['referrer', 'receiver', 'closer', 'verifier']);

function text(value: unknown, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
}

function optionalText(value: unknown, max: number) {
  return value === undefined ? null : text(value, max);
}

function uuid(value: unknown) {
  if (typeof value !== 'string' || !UUID.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
}

function version(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1)
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
}

function correlation(requestId: string) {
  return UUID.test(requestId) ? requestId : randomUUID();
}

function evidenceRefs(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.map((item) => text(item, 320));
}

function metadata(value: unknown) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
}

@Injectable()
export class AttributionService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async get(context: OrganizationContext, customerId: string) {
    uuid(customerId);
    await this.requireCustomer(this.pool, context.tenantId, customerId);
    const [sources, ownerships, contributions, transfers] = await Promise.all([
      this.pool.query(
        'select id,source_role,source_type,source_id,metadata,status,version from customer_sources where tenant_id=$1 and customer_id=$2 and deleted_at is null order by created_at',
        [context.tenantId, customerId],
      ),
      this.pool.query(
        'select id,employee_id,ownership_role,status,version from customer_ownerships where tenant_id=$1 and customer_id=$2 and deleted_at is null order by created_at',
        [context.tenantId, customerId],
      ),
      this.pool.query(
        'select id,employee_id,contribution_role,evidence_refs,confirmed,status,version from customer_contributions where tenant_id=$1 and customer_id=$2 and deleted_at is null order by created_at',
        [context.tenantId, customerId],
      ),
      this.pool.query(
        'select id,from_employee_id,to_employee_id,reason,status,version from customer_ownership_transfer_approvals where tenant_id=$1 and customer_id=$2 and deleted_at is null order by created_at',
        [context.tenantId, customerId],
      ),
    ]);
    return {
      customerId,
      sources: sources.rows,
      ownerships: ownerships.rows,
      contributions: contributions.rows,
      transfers: transfers.rows,
    };
  }

  async recordSource(
    context: OrganizationContext,
    customerId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    uuid(customerId);
    this.requireKey(key);
    const sourceRole = text(body.sourceRole, 32);
    if (!SOURCE_ROLES.has(sourceRole)) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      customerVersion: version(body.customerVersion),
      sourceRole,
      sourceType: text(body.sourceType, 80),
      sourceId: optionalText(body.sourceId, 160),
      metadata: metadata(body.metadata),
    };
    return this.idempotent(context, 'customer_source', key, async (client) => {
      await this.lockCustomer(client, context.tenantId, customerId, input.customerVersion);
      if (input.sourceRole === 'first_source') {
        const prior = await client.query(
          "select id from customer_sources where tenant_id=$1 and customer_id=$2 and source_role='first_source' and status='active' and deleted_at is null",
          [context.tenantId, customerId],
        );
        if (prior.rowCount) throw new ConflictException('CONFLICT');
      } else {
        await client.query(
          'update customer_sources set status=$1,updated_by=$2,updated_at=now(),version=version+1 where tenant_id=$3 and customer_id=$4 and source_role=$5 and status=$6',
          ['superseded', context.userId, context.tenantId, customerId, input.sourceRole, 'active'],
        );
      }
      const id = randomUUID();
      const row = (
        await client.query(
          'insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,source_id,metadata,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8) returning id,source_role,source_type,source_id,metadata,status,version',
          [
            id,
            context.tenantId,
            customerId,
            input.sourceRole,
            input.sourceType,
            input.sourceId,
            input.metadata,
            context.userId,
          ],
        )
      ).rows[0];
      await this.bumpCustomer(client, context, customerId);
      await this.audit(
        client,
        context,
        'customer.source_recorded',
        'customer',
        customerId,
        requestId,
        { after: row },
      );
      await this.event(client, context, 'customer.source.recorded.v1', customerId, requestId, row);
      return row;
    });
  }

  async recordContribution(
    context: OrganizationContext,
    customerId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    uuid(customerId);
    this.requireKey(key);
    const contributionRole = text(body.contributionRole, 32);
    if (!CONTRIBUTION_ROLES.has(contributionRole))
      throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      customerVersion: version(body.customerVersion),
      employeeId: uuid(body.employeeId),
      contributionRole,
      evidenceRefs: evidenceRefs(body.evidenceRefs),
      confirmed: body.confirmed === true,
    };
    return this.idempotent(context, 'customer_contribution', key, async (client) => {
      await this.lockCustomer(client, context.tenantId, customerId, input.customerVersion);
      await this.requireEmployee(client, context.tenantId, input.employeeId);
      const id = randomUUID();
      let row: Record<string, unknown>;
      try {
        row = (
          await client.query(
            'insert into customer_contributions(id,tenant_id,customer_id,employee_id,contribution_role,evidence_refs,confirmed,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8) returning id,employee_id,contribution_role,evidence_refs,confirmed,status,version',
            [
              id,
              context.tenantId,
              customerId,
              input.employeeId,
              input.contributionRole,
              JSON.stringify(input.evidenceRefs),
              input.confirmed,
              context.userId,
            ],
          )
        ).rows[0];
      } catch (error: unknown) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
        throw error;
      }
      await this.bumpCustomer(client, context, customerId);
      await this.audit(
        client,
        context,
        'customer.contribution_recorded',
        'customer',
        customerId,
        requestId,
        { after: row },
      );
      await this.event(
        client,
        context,
        'customer.contribution.recorded.v1',
        customerId,
        requestId,
        row,
      );
      return row;
    });
  }

  async requestTransfer(
    context: OrganizationContext,
    customerId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    uuid(customerId);
    this.requireKey(key);
    const input = {
      customerVersion: version(body.customerVersion),
      toEmployeeId: uuid(body.toEmployeeId),
      reason: text(body.reason, 320),
    };
    return this.idempotent(context, 'ownership_transfer', key, async (client) => {
      await this.lockCustomer(client, context.tenantId, customerId, input.customerVersion);
      await this.requireEmployee(client, context.tenantId, input.toEmployeeId);
      const current = await client.query(
        "select employee_id from customer_ownerships where tenant_id=$1 and customer_id=$2 and ownership_role='owner' and status='active' and deleted_at is null for update",
        [context.tenantId, customerId],
      );
      const fromEmployeeId = current.rows[0]?.employee_id ?? null;
      if (fromEmployeeId === input.toEmployeeId) throw new ConflictException('CONFLICT');
      const id = randomUUID();
      const row = (
        await client.query(
          'insert into customer_ownership_transfer_approvals(id,tenant_id,customer_id,from_employee_id,to_employee_id,reason,requested_version,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8) returning id,customer_id,from_employee_id,to_employee_id,reason,status,version',
          [
            id,
            context.tenantId,
            customerId,
            fromEmployeeId,
            input.toEmployeeId,
            input.reason,
            input.customerVersion,
            context.userId,
          ],
        )
      ).rows[0];
      await this.audit(
        client,
        context,
        'customer.ownership_transfer_requested',
        'customer',
        customerId,
        requestId,
        { after: row },
      );
      await this.event(
        client,
        context,
        'customer.ownership.transfer_requested.v1',
        customerId,
        requestId,
        row,
      );
      return row;
    });
  }

  async approveTransfer(
    context: OrganizationContext,
    transferId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    uuid(transferId);
    if (body.decision !== 'approve') throw new BadRequestException('VALIDATION_ERROR');
    const transferVersion = version(body.version);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const transfer = await client.query(
        "select * from customer_ownership_transfer_approvals where id=$1 and tenant_id=$2 and status='pending' and deleted_at is null and version=$3 for update",
        [transferId, context.tenantId, transferVersion],
      );
      if (transfer.rowCount !== 1)
        await this.missingOrConflict(
          client,
          context.tenantId,
          transferId,
          'customer_ownership_transfer_approvals',
        );
      const row = transfer.rows[0];
      await this.lockCustomer(client, context.tenantId, row.customer_id, row.requested_version);
      await client.query(
        "update customer_ownerships set status='transferred',updated_by=$1,updated_at=now(),version=version+1 where tenant_id=$2 and customer_id=$3 and ownership_role='owner' and status='active'",
        [context.userId, context.tenantId, row.customer_id],
      );
      const ownership = (
        await client.query(
          'insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6) returning id,employee_id,ownership_role,status,version',
          [
            randomUUID(),
            context.tenantId,
            row.customer_id,
            row.to_employee_id,
            'owner',
            context.userId,
          ],
        )
      ).rows[0];
      await client.query(
        "update customer_ownership_transfer_approvals set status='approved',approved_by=$1,approved_at=now(),updated_by=$1,updated_at=now(),version=version+1 where id=$2",
        [context.userId, transferId],
      );
      await this.bumpCustomer(client, context, row.customer_id);
      const data = { transferId, customerId: row.customer_id, ownership };
      await this.audit(
        client,
        context,
        'customer.ownership_transfer_approved',
        'customer',
        row.customer_id,
        requestId,
        data,
      );
      await this.event(
        client,
        context,
        'customer.ownership.assigned.v1',
        row.customer_id,
        requestId,
        data,
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

  async onModuleDestroy() {
    await this.pool.end();
  }

  private requireKey(key: string) {
    if (!key.trim() || key.length > 200) throw new BadRequestException('VALIDATION_ERROR');
  }

  private async idempotent(
    context: OrganizationContext,
    type: string,
    key: string,
    action: (client: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3 and deleted_at is null',
        [context.tenantId, type, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const data = await action(client);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, type, key, data, context.userId],
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

  private async lockCustomer(
    client: PoolClient,
    tenantId: string,
    customerId: string,
    expectedVersion: number,
  ) {
    const customer = await client.query(
      "select id from customers where id=$1 and tenant_id=$2 and status='active' and deleted_at is null and version=$3 for update",
      [customerId, tenantId, expectedVersion],
    );
    if (customer.rowCount !== 1) await this.customerMissingOrConflict(client, tenantId, customerId);
  }

  private async requireCustomer(client: Pool | PoolClient, tenantId: string, customerId: string) {
    const customer = await client.query(
      "select id from customers where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
      [customerId, tenantId],
    );
    if (!customer.rowCount) throw new NotFoundException('NOT_FOUND');
  }

  private async requireEmployee(client: PoolClient, tenantId: string, employeeId: string) {
    const employee = await client.query(
      "select id from employees where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
      [employeeId, tenantId],
    );
    if (!employee.rowCount) throw new NotFoundException('NOT_FOUND');
  }

  private async bumpCustomer(client: PoolClient, context: OrganizationContext, customerId: string) {
    await client.query(
      'update customers set version=version+1,updated_by=$1,updated_at=now() where id=$2',
      [context.userId, customerId],
    );
  }

  private async customerMissingOrConflict(
    client: PoolClient,
    tenantId: string,
    customerId: string,
  ): Promise<never> {
    await this.requireCustomer(client, tenantId, customerId);
    throw new ConflictException('CONFLICT');
  }

  private async missingOrConflict(
    client: PoolClient,
    tenantId: string,
    id: string,
    table: string,
  ): Promise<never> {
    const exists = await client.query(
      `select id from ${table} where id=$1 and tenant_id=$2 and deleted_at is null`,
      [id, tenantId],
    );
    if (!exists.rowCount) throw new NotFoundException('NOT_FOUND');
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
        'core-005',
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
        { eventName: eventType, correlationId, traceId: 'core-005', payload },
        correlationId,
        'core-005',
        context.userId,
      ],
    );
  }
}
