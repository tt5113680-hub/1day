import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const CATEGORIES = new Set(['anomaly', 'approval', 'workflow']);

@Injectable()
export class ManagementNotificationService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext, query: Record<string, unknown>) {
    const category = this.choice(query.category, CATEGORIES, true);
    const rows = await this.pool.query(
      `select category,aggregate_id,title,body,deep_link as deep_link,occurred_at
       from (
         select 'anomaly' as category,t.id::text as aggregate_id,concat('任务逾期：',t.title) as title,
                concat('客户跟进任务已逾期，需即时处理，避免客户行动节奏中断。') as body,'/m/customers'::text as deep_link,t.updated_at as occurred_at
         from tasks t where t.tenant_id=$1 and t.status='overdue' and t.deleted_at is null
         union all
         select 'approval' as category,a.id::text,concat('客户归属待审批：',c.display_name) as title,
                '有客户归属转移请求待审批，审结后更新后续跟进归属。' as body,'/m/customers'::text,a.created_at
         from customer_ownership_transfer_approvals a
         join customers c on c.id=a.customer_id and c.tenant_id=a.tenant_id and c.deleted_at is null
         where a.tenant_id=$1 and a.status='pending' and a.deleted_at is null
         union all
         select 'workflow' as category,i.id::text,concat('工作流进行中：',d.name) as title,
                '有运行中的工作流实例待推进，可按既定步骤完成整合任务。' as body,'/m/workflows'::text,i.started_at
         from workflow_instances i
         join workflow_definitions d on d.id=i.definition_id and d.tenant_id=i.tenant_id
         where i.tenant_id=$1 and i.status='active' and i.deleted_at is null
       ) n
       where $2::text is null or n.category=$2
       order by n.occurred_at desc,n.category asc
       limit 50`,
      [context.tenantId, category],
    );
    return {
      items: rows.rows.map((row) => this.output(row)),
      counts: await this.counts(context),
    };
  }

  private async counts(context: OrganizationContext) {
    const result = await this.pool.query(
      `select
        (select count(*)::int from tasks where tenant_id=$1 and status='overdue' and deleted_at is null) anomaly,
        (select count(*)::int from customer_ownership_transfer_approvals where tenant_id=$1 and status='pending' and deleted_at is null) approval,
        (select count(*)::int from workflow_instances where tenant_id=$1 and status='active' and deleted_at is null) workflow`,
      [context.tenantId],
    );
    return result.rows[0];
  }

  private choice(value: unknown, options: Set<string>, optional: boolean) {
    if (value === undefined || value === null || value === '') return optional ? null : '';
    if (typeof value !== 'string' || !options.has(value))
      throw new BadRequestException('VALIDATION_ERROR');
    return value;
  }

  private output(row: Record<string, unknown>) {
    return {
      category: row.category,
      id: row.aggregate_id,
      title: row.title,
      body: row.body,
      deepLink: row.deep_link,
      occurredAt: row.occurred_at,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
