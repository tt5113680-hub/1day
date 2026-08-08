import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;
type Policies = {
  reminders: { defaultDueHours: number; escalationHours: number };
  approvals: { requireOwnershipTransfer: boolean; requireContentApproval: boolean };
  doNotDisturb: { enabled: boolean; startHour: number; endHour: number };
  tags: { allowCustom: boolean; maxPerCustomer: number };
  ownership: { allocation: 'manual' | 'round_robin'; transferRequiresApproval: boolean };
  brand: { displayName: string; primaryColor: string };
};

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value as Record<string, unknown>;
};
const integer = (value: unknown, minimum: number, maximum: number) => {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum)
    throw new BadRequestException('VALIDATION_ERROR');
  return value as number;
};
const flag = (value: unknown) => {
  if (typeof value !== 'boolean') throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const name = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 160)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const color = (value: unknown) => {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value.toUpperCase();
};

@Injectable()
export class ManagementSettingsService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async get(context: OrganizationContext) {
    const result = await this.pool.query(
      `select s.id,s.reminder_policy,s.approval_policy,s.do_not_disturb_policy,s.tag_policy,s.ownership_policy,s.brand_policy,s.version,s.updated_at,t.name tenant_name
       from tenants t left join tenant_operating_settings s on s.tenant_id=t.id and s.deleted_at is null where t.id=$1 and t.deleted_at is null`,
      [context.tenantId],
    );
    const row = result.rows[0];
    return row?.id ? this.response(row) : this.defaults(row?.tenant_name ?? '');
  }

  async update(
    context: OrganizationContext,
    body: Record<string, unknown>,
    idempotencyKey: string,
    requestId: string,
  ) {
    if (!idempotencyKey.trim() || !Number.isInteger(body.version) || (body.version as number) < 0)
      throw new BadRequestException('VALIDATION_ERROR');
    const policies = this.validate(body);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const previous = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'tenant_operating_settings', idempotencyKey],
      );
      if (previous.rowCount) {
        await client.query('commit');
        return previous.rows[0].response;
      }
      const current = await client.query(
        'select * from tenant_operating_settings where tenant_id=$1 and deleted_at is null for update',
        [context.tenantId],
      );
      const expected = body.version as number;
      if (current.rowCount ? current.rows[0].version !== expected : expected !== 0)
        throw new ConflictException('CONFLICT');
      const stored = current.rowCount
        ? await client.query(
            'update tenant_operating_settings set reminder_policy=$1,approval_policy=$2,do_not_disturb_policy=$3,tag_policy=$4,ownership_policy=$5,brand_policy=$6,version=version+1,updated_at=now(),updated_by=$7 where id=$8 returning *',
            [
              policies.reminders,
              policies.approvals,
              policies.doNotDisturb,
              policies.tags,
              policies.ownership,
              policies.brand,
              context.userId,
              current.rows[0].id,
            ],
          )
        : await client.query(
            'insert into tenant_operating_settings(id,tenant_id,reminder_policy,approval_policy,do_not_disturb_policy,tag_policy,ownership_policy,brand_policy,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) returning *',
            [
              randomUUID(),
              context.tenantId,
              policies.reminders,
              policies.approvals,
              policies.doNotDisturb,
              policies.tags,
              policies.ownership,
              policies.brand,
              context.userId,
            ],
          );
      const response = this.response(stored.rows[0]);
      const correlationId = uuid.test(requestId) ? requestId : randomUUID();
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'tenant.operating_settings_updated','tenant_operating_settings',$4,$5,'page-m-016',$6,$3,$3)",
        [
          randomUUID(),
          context.tenantId,
          context.userId,
          stored.rows[0].id,
          correlationId,
          response,
        ],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'tenant.operating_settings.updated.v1','tenant_operating_settings',$3,$4,$5,'page-m-016',$6,$6)",
        [
          randomUUID(),
          context.tenantId,
          stored.rows[0].id,
          response,
          correlationId,
          context.userId,
        ],
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [
          randomUUID(),
          context.tenantId,
          'tenant_operating_settings',
          idempotencyKey,
          response,
          context.userId,
        ],
      );
      await client.query('commit');
      return response;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private validate(body: Record<string, unknown>): Policies {
    const reminders = object(body.reminders);
    const approvals = object(body.approvals);
    const doNotDisturb = object(body.doNotDisturb);
    const tags = object(body.tags);
    const ownership = object(body.ownership);
    const brand = object(body.brand);
    const defaultDueHours = integer(reminders.defaultDueHours, 1, 720);
    const escalationHours = integer(reminders.escalationHours, defaultDueHours, 720);
    const allocation = ownership.allocation;
    if (allocation !== 'manual' && allocation !== 'round_robin')
      throw new BadRequestException('VALIDATION_ERROR');
    return {
      reminders: { defaultDueHours, escalationHours },
      approvals: {
        requireOwnershipTransfer: flag(approvals.requireOwnershipTransfer),
        requireContentApproval: flag(approvals.requireContentApproval),
      },
      doNotDisturb: {
        enabled: flag(doNotDisturb.enabled),
        startHour: integer(doNotDisturb.startHour, 0, 23),
        endHour: integer(doNotDisturb.endHour, 0, 23),
      },
      tags: {
        allowCustom: flag(tags.allowCustom),
        maxPerCustomer: integer(tags.maxPerCustomer, 1, 50),
      },
      ownership: { allocation, transferRequiresApproval: flag(ownership.transferRequiresApproval) },
      brand: { displayName: name(brand.displayName), primaryColor: color(brand.primaryColor) },
    };
  }

  private defaults(tenantName: string) {
    return {
      version: 0,
      reminders: { defaultDueHours: 24, escalationHours: 48 },
      approvals: { requireOwnershipTransfer: true, requireContentApproval: true },
      doNotDisturb: { enabled: true, startHour: 22, endHour: 8 },
      tags: { allowCustom: true, maxPerCustomer: 12 },
      ownership: { allocation: 'manual', transferRequiresApproval: true },
      brand: { displayName: tenantName, primaryColor: '#2563EB' },
    };
  }

  private response(row: Record<string, unknown>) {
    return {
      id: row.id,
      version: row.version,
      updatedAt: row.updated_at,
      reminders: row.reminder_policy,
      approvals: row.approval_policy,
      doNotDisturb: row.do_not_disturb_policy,
      tags: row.tag_policy,
      ownership: row.ownership_policy,
      brand: row.brand_policy,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
