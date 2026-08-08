import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;

@Injectable()
export class ManagementStoreService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext) {
    const result = await this.pool.query(
      `select s.id,s.code,s.name,s.address,s.status,s.version,m.name merchant_name,
       coalesce(json_agg(distinct jsonb_build_object('id',e.id,'name',u.display_name)) filter(where e.id is not null),'[]'::json) managers,
       (select count(*)::int from store_services ss where ss.tenant_id=s.tenant_id and ss.store_id=s.id and ss.status='active' and ss.deleted_at is null) active_services,
       (select count(*)::int from store_benefits sb where sb.tenant_id=s.tenant_id and sb.store_id=s.id and sb.external_action_id is not null and sb.status='active' and sb.deleted_at is null) entry_count,
       (select count(*)::int from consumer_action_events ce where ce.tenant_id=s.tenant_id and ce.store_id=s.id and ce.status='active' and ce.deleted_at is null and ce.created_at>=now()-interval '30 days') entry_opens_30d,
       (select count(*)::int from tasks t join employees te on te.id=t.assignee_employee_id and te.tenant_id=t.tenant_id and te.deleted_at is null where t.tenant_id=s.tenant_id and te.organization_id=s.organization_id and t.status in ('open','overdue') and t.deleted_at is null) open_tasks
       from stores s join merchants m on m.id=s.merchant_id and m.tenant_id=s.tenant_id
       left join store_managers sm on sm.store_id=s.id and sm.tenant_id=s.tenant_id and sm.status='active' and sm.deleted_at is null
       left join employees e on e.id=sm.employee_id and e.tenant_id=sm.tenant_id and e.status='active' and e.deleted_at is null
       left join memberships ms on ms.id=e.membership_id and ms.tenant_id=e.tenant_id and ms.status='active'
       left join users u on u.id=ms.user_id and u.status='active'
       where s.tenant_id=$1 and s.deleted_at is null
       group by s.id,m.name order by s.status='active' desc,s.code`,
      [context.tenantId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address,
      status: row.status,
      version: row.version,
      merchantName: row.merchant_name,
      managers: row.managers,
      activeServices: row.active_services,
      entryCount: row.entry_count,
      entryOpens30d: row.entry_opens_30d,
      openTasks: row.open_tasks,
    }));
  }

  async assignManager(
    context: OrganizationContext,
    storeId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (
      !UUID.test(storeId) ||
      typeof body.employeeId !== 'string' ||
      !UUID.test(body.employeeId) ||
      !Number.isInteger(body.version)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const store = (
        await client.query(
          'select id,version from stores where id=$1 and tenant_id=$2 and deleted_at is null for update',
          [storeId, context.tenantId],
        )
      ).rows[0];
      if (!store) throw new NotFoundException('NOT_FOUND');
      if (store.version !== body.version) throw new ConflictException('CONFLICT');
      const employee = await client.query(
        "select id from employees where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
        [body.employeeId, context.tenantId],
      );
      if (employee.rowCount !== 1) throw new NotFoundException('NOT_FOUND');
      await client.query(
        "update store_managers set status='inactive',updated_at=now(),updated_by=$1,version=version+1 where store_id=$2 and tenant_id=$3 and status='active' and deleted_at is null",
        [context.userId, storeId, context.tenantId],
      );
      await client.query(
        "insert into store_managers(id,tenant_id,store_id,employee_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5) on conflict(store_id,employee_id) do update set status='active',deleted_at=null,updated_at=now(),updated_by=excluded.updated_by,version=store_managers.version+1",
        [randomUUID(), context.tenantId, storeId, body.employeeId, context.userId],
      );
      const updated = (
        await client.query(
          'update stores set version=version+1,updated_at=now(),updated_by=$1 where id=$2 returning version',
          [context.userId, storeId],
        )
      ).rows[0];
      const correlation = UUID.test(requestId) ? requestId : randomUUID();
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'store.manager_assigned','store',$4,$5,'page-m-007',$6,$3,$3)",
        [
          randomUUID(),
          context.tenantId,
          context.userId,
          storeId,
          correlation,
          { employeeId: body.employeeId },
        ],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'store.manager_assigned.v1','store',$3,$4,$5,'page-m-007',$6,$6)",
        [
          randomUUID(),
          context.tenantId,
          storeId,
          { employeeId: body.employeeId },
          correlation,
          context.userId,
        ],
      );
      await client.query('commit');
      return { storeId, employeeId: body.employeeId, version: updated.version };
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
}
