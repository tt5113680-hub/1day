import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

@Injectable()
export class ManagementAttributionService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async overview(context: OrganizationContext) {
    const result = await this.pool.query(
      `select s.id,s.customer_id,s.source_role,s.source_type,s.source_id,s.metadata,s.created_at,c.display_name,
        coalesce(contributors.count,0)::int contributor_count,coalesce(contributors.confirmed,0)::int confirmed_contributor_count,
        coalesce(contributors.evidence,0)::int evidence_refs
       from customer_sources s join customers c on c.id=s.customer_id and c.tenant_id=s.tenant_id and c.deleted_at is null
       left join lateral (select count(*) count,count(*) filter(where confirmed) confirmed,coalesce(sum(jsonb_array_length(evidence_refs)),0) evidence from customer_contributions where tenant_id=s.tenant_id and customer_id=s.customer_id and status='active' and deleted_at is null) contributors on true
       where s.tenant_id=$1 and s.status='active' and s.deleted_at is null and c.status='active'
       order by s.created_at desc limit 200`,
      [context.tenantId],
    );
    const records = result.rows.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.display_name,
      role: row.source_role,
      sourceType: row.source_type,
      sourceId: row.source_id,
      metadata: row.metadata,
      createdAt: row.created_at,
      contributors: row.contributor_count,
      confirmedContributors: row.confirmed_contributor_count,
      evidenceRefs: row.evidence_refs,
      evidenceLevel:
        row.confirmed_contributor_count > 0 && row.evidence_refs > 0
          ? 'confirmed'
          : row.contributor_count > 0
            ? 'recorded'
            : 'source_only',
    }));
    return {
      records,
      summary: {
        first: records.filter((r) => r.role === 'first_source').length,
        current: records.filter((r) => r.role === 'current_source').length,
        final: records.filter((r) => r.role === 'final_source').length,
      },
    };
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
