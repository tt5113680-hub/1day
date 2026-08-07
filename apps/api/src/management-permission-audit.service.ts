import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { OrganizationContext } from './organization.service';

const filters = ['all', 'change', 'export', 'risk'] as const;
type Filter = (typeof filters)[number];

@Injectable()
export class ManagementPermissionAuditService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async list(context: OrganizationContext, filter?: string) {
    if (filter !== undefined && !filters.includes(filter as Filter))
      throw new BadRequestException('VALIDATION_ERROR');
    const rows = await this.pool.query(
      `with scoped as (
        select a.id,a.action,a.resource_type,a.resource_id,a.correlation_id,a.trace_id,a.created_at,
          coalesce(u.display_name,'未归属操作者') actor_name,
          case
            when (a.action like 'role.%' or a.action ilike '%permission%') and a.actor_id is null then 'unattributed_privileged'
            when a.action='role.permissions_changed'
              and coalesce(a.details->'after','[]'::jsonb) ? 'tenant.manage'
              and not coalesce(a.details->'before','[]'::jsonb) ? 'tenant.manage' then 'privilege_expansion'
            when a.action ilike '%export%' then 'export'
            when a.action like 'role.%' or a.action ilike '%permission%' then 'permission_change'
            else 'trace'
          end kind,
          case when a.action like 'role.%' or a.action ilike '%permission%' then a.details else null end detail
        from audit_logs a
        left join users u on u.id=a.actor_id
        where a.tenant_id=$1 and a.deleted_at is null
        order by a.created_at desc
        limit 200
      )
      select * from scoped
      where $2::text='all'
        or ($2::text='change' and kind='permission_change')
        or ($2::text='export' and kind='export')
        or ($2::text='risk' and kind in ('privilege_expansion','unattributed_privileged'))
      order by created_at desc
      limit 100`,
      [context.tenantId, filter ?? 'all'],
    );
    const records = rows.rows.map((row) => ({
      id: row.id,
      action: row.action,
      resource: { type: row.resource_type, id: row.resource_id },
      actorName: row.actor_name,
      kind: row.kind,
      createdAt: row.created_at,
      correlationId: row.correlation_id,
      traceId: row.trace_id,
      detail: row.detail,
    }));
    return {
      records,
      summary: {
        changes: records.filter((record) => record.kind === 'permission_change').length,
        exports: records.filter((record) => record.kind === 'export').length,
        risks: records.filter((record) =>
          ['privilege_expansion', 'unattributed_privileged'].includes(record.kind),
        ).length,
      },
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
