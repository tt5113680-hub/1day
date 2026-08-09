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
const quota = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('VALIDATION_ERROR');
  const x = value as Record<string, unknown>;
  for (const key of ['users', 'customers', 'stores'])
    if (!Number.isInteger(x[key]) || (x[key] as number) < 1 || (x[key] as number) > 1000000)
      throw new BadRequestException('VALIDATION_ERROR');
  return { users: x.users as number, customers: x.customers as number, stores: x.stores as number };
};
@Injectable()
export class PlatformTenantService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async list() {
    const rows = (
      await this.pool.query(
        `select t.id,t.slug,t.name,t.status,t.version,coalesce(s.plan,'starter') plan,coalesce(s.quotas,'{"users":10,"customers":1000,"stores":3}'::jsonb) quotas,coalesce(s.risk_level,'low') risk_level,coalesce((select count(*) from tasks x where x.tenant_id=t.id and x.status='overdue' and x.deleted_at is null),0)::int overdue_tasks from tenants t left join platform_tenant_settings s on s.tenant_id=t.id and s.deleted_at is null where t.deleted_at is null order by t.created_at`,
      )
    ).rows;
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      version: row.version,
      plan: row.plan,
      quotas: row.quotas,
      riskLevel: row.risk_level,
      overdueTasks: row.overdue_tasks,
    }));
  }
  async update(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (
      !uuid.test(id) ||
      !key.trim() ||
      !Number.isInteger(body.version) ||
      typeof body.confirmation !== 'string'
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const plan = body.plan,
      risk = body.riskLevel,
      status = body.status;
    if (
      !['starter', 'growth', 'enterprise'].includes(plan as string) ||
      !['low', 'medium', 'high'].includes(risk as string) ||
      !['active', 'suspended'].includes(status as string)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const quotas = quota(body.quotas);
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const old = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'platform_tenant_settings', key],
      );
      if (old.rowCount) {
        await q.query('commit');
        return old.rows[0].response;
      }
      const tenant = (
        await q.query('select * from tenants where id=$1 and deleted_at is null for update', [id])
      ).rows[0];
      if (!tenant || tenant.version !== body.version) throw new ConflictException('CONFLICT');
      const expected = `${status === 'suspended' ? 'SUSPEND' : 'ACTIVATE'}:${tenant.slug}`;
      if (body.confirmation !== expected) throw new BadRequestException('CONFIRMATION_REQUIRED');
      const setting = (
        await q.query(
          'insert into platform_tenant_settings(id,tenant_id,plan,quotas,risk_level,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6) on conflict(tenant_id) do update set plan=excluded.plan,quotas=excluded.quotas,risk_level=excluded.risk_level,updated_at=now(),updated_by=excluded.updated_by,version=platform_tenant_settings.version+1 returning plan,quotas,risk_level,version',
          [randomUUID(), id, plan, quotas, risk, context.userId],
        )
      ).rows[0];
      const updated = (
        await q.query(
          'update tenants set status=$1,version=version+1,updated_at=now(),updated_by=$2 where id=$3 returning id,slug,name,status,version',
          [status, context.userId, id],
        )
      ).rows[0];
      if (status === 'suspended')
        await q.query(
          "update auth_sessions set status='revoked',revoked_at=now(),updated_at=now(),updated_by=$1 where tenant_id=$2 and status='active' and revoked_at is null and deleted_at is null",
          [context.userId, id],
        );
      const response = {
        ...updated,
        plan: setting.plan,
        quotas: setting.quotas,
        riskLevel: setting.risk_level,
        settingsVersion: setting.version,
      };
      const correlation = uuid.test(requestId) ? requestId : randomUUID();
      await q.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.tenant_updated','tenant',$4,$5,'page-p-002',$6,$3,$3)",
        [randomUUID(), context.tenantId, context.userId, id, correlation, response],
      );
      await q.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'platform.tenant.updated.v1','tenant',$3,$4,$5,'page-p-002',$6,$6)",
        [randomUUID(), context.tenantId, id, response, correlation, context.userId],
      );
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'platform_tenant_settings', key, response, context.userId],
      );
      await q.query('commit');
      return response;
    } catch (error) {
      await q.query('rollback');
      throw error;
    } finally {
      q.release();
    }
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
