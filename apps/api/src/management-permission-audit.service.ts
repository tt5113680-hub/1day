import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const filters = ['all', 'change', 'export', 'risk'] as const;
type Filter = (typeof filters)[number];
const uuid = /^[0-9a-f-]{36}$/i;

@Injectable()
export class ManagementPermissionAuditService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  /**
   * G1-W∞-121 (SAAS-AUDIT): all read/export paths share the same tenant-scoped,
   * filter-aware audit_logs query so the on-screen list and the CSV export always agree.
   */
  private async queryAuditRows(tenantId: string, filter?: string) {
    return this.pool.query(
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
      [tenantId, filter ?? 'all'],
    );
  }

  async list(context: OrganizationContext, filter?: string) {
    if (filter !== undefined && !filters.includes(filter as Filter))
      throw new BadRequestException('VALIDATION_ERROR');
    const rows = await this.queryAuditRows(context.tenantId, filter);
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

  /**
   * G1-W∞-121 (SAAS-AUDIT): CSV export of the same real, tenant-scoped audit records
   * the UI lists, honouring the active `filter`. The export itself is written to the
   * immutable audit trail + Outbox so every audit export is itself auditable.
   */
  async exportAudit(context: OrganizationContext, filter: string, requestId: string) {
    if (!filters.includes(filter as Filter)) throw new BadRequestException('VALIDATION_ERROR');
    const rows = await this.queryAuditRows(context.tenantId, filter);
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [
      'action,kind,actor,resource_type,resource_id,correlation_id,trace_id,detail,created_at',
      ...rows.rows.map((row) =>
        [
          row.action,
          row.kind,
          row.actor_name,
          row.resource_type,
          row.resource_id,
          row.correlation_id,
          row.trace_id,
          row.detail === null || row.detail === undefined ? '' : JSON.stringify(row.detail),
          row.created_at,
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
    await this.record(context, 'management.audit.exported', requestId, {
      filter,
      count: rows.rowCount,
    });
    return {
      filename: `permission-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    };
  }

  private async record(
    context: OrganizationContext,
    action: string,
    requestId: string,
    details: unknown,
  ) {
    const correlation = uuid.test(requestId) ? requestId : randomUUID();
    const id = randomUUID();
    await this.pool.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'audit_export',$5,$6,'page-m-013',$7,$3,$3)",
      [id, context.tenantId, context.userId, action, id, correlation, details],
    );
    await this.pool.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'audit_export',$4,$5,$6,'page-m-013',$7,$7)",
      [
        randomUUID(),
        context.tenantId,
        `${action}.v1`,
        id,
        { action, details },
        correlation,
        context.userId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
