import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const sourceType = (value: string) => {
  if (value !== 'all' && !/^[a-z0-9_-]{1,80}$/i.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};

@Injectable()
export class ManagementFunnelService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async detail(context: OrganizationContext, funnelId: string) {
    const source = sourceType(funnelId);
    const result = await this.pool.query(
      `with cohort as (
         select distinct customer_id from customer_sources
         where tenant_id=$1 and status='active' and deleted_at is null
           and ($2='all' or source_type=$2)
       ),
       followed as (
         select distinct t.customer_id from tasks t join cohort c on c.customer_id=t.customer_id
         where t.tenant_id=$1 and t.deleted_at is null
       ),
       dealt as (
         select distinct o.customer_id from customer_orders o join cohort c on c.customer_id=o.customer_id
         where o.tenant_id=$1 and o.status='active' and o.deleted_at is null
       ),
       repurchased as (
         select o.customer_id from customer_orders o join cohort c on c.customer_id=o.customer_id
         where o.tenant_id=$1 and o.status='active' and o.deleted_at is null
         group by o.customer_id having count(*) >= 2
       )
       select
         (select count(*)::int from customer_sources where tenant_id=$1 and status='active' and deleted_at is null and ($2='all' or source_type=$2)) source_records,
         (select count(*)::int from cohort) leads,
         (select count(*)::int from followed) follow_ups,
         (select count(*)::int from dealt) deals,
         (select count(*)::int from repurchased) repurchases`,
      [context.tenantId, source],
    );
    const row = result.rows[0];
    const stages = [
      { id: 'source', label: '来源', value: row.source_records, resultType: 'confirmed' },
      {
        id: 'visit',
        label: '访问',
        value: null,
        resultType: 'inferred',
        note: '当前数据未将访问事件与客户来源进行可确认关联，未计入转化率。',
      },
      { id: 'lead', label: '留资', value: row.leads, resultType: 'confirmed' },
      { id: 'follow_up', label: '跟进', value: row.follow_ups, resultType: 'confirmed' },
      { id: 'deal', label: '成交', value: row.deals, resultType: 'confirmed' },
      { id: 'repurchase', label: '复购', value: row.repurchases, resultType: 'confirmed' },
    ];
    return {
      id: source,
      stages,
      definitions: {
        source: '已登记的有效客户来源记录',
        lead: '具有该有效来源的去重客户',
        follow_up: '该来源客户中已生成员工任务的去重客户',
        deal: '该来源客户中具有有效订单的去重客户',
        repurchase: '该来源客户中具有两笔及以上有效订单的去重客户',
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
