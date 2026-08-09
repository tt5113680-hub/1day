import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createApiPool } from './database-pool';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

@Injectable()
export class ConsumerEntryService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async entry(tenantSlug: string) {
    if (!SLUG.test(tenantSlug)) throw new BadRequestException('VALIDATION_ERROR');
    const tenant = (
      await this.pool.query(
        "select id,slug,name from tenants where slug=$1 and status='active' and deleted_at is null",
        [tenantSlug],
      )
    ).rows[0];
    if (!tenant) throw new NotFoundException('NOT_FOUND');
    const storefront = (
      await this.pool.query(
        `select sb.id as binding_id,sb.live_version_id,s.id as store_id,s.name as store_name
         from storefront_bindings sb
         join stores s on s.id=sb.store_id and s.tenant_id=sb.tenant_id and s.status='active' and s.deleted_at is null
         where sb.tenant_id=$1 and sb.status='active' and sb.live_version_id is not null and sb.deleted_at is null
         order by sb.published_at desc limit 1`,
        [tenant.id],
      )
    ).rows[0];
    const template = (
      await this.pool.query(
        `select pt.id,pt.code,pt.name,pt.industry_config,pt.published_version_id
         from page_templates pt
         left join storefront_bindings sb on sb.template_id=pt.id and sb.tenant_id=pt.tenant_id
         where pt.tenant_id=$1 and pt.target='consumer' and pt.status='active' and pt.published_version_id is not null
           and pt.deleted_at is null and ($2::uuid is null or sb.id=$2)
         order by pt.updated_at desc limit 1`,
        [tenant.id, storefront?.binding_id ?? null],
      )
    ).rows[0] as Record<string, unknown> | undefined;
    const modules = template
      ? (
          await this.pool.query(
            "select id,module_type,position,config from page_modules where tenant_id=$1 and template_version_id=$2 and status='active' and deleted_at is null order by position",
            [tenant.id, storefront?.live_version_id ?? template.published_version_id],
          )
        ).rows
      : [];
    const actions = (
      await this.pool.query(
        "select distinct on (name) id,code,name,action_type,target_url,mini_program_app_id,mini_program_path,platform from external_actions where tenant_id=$1 and status='active' and deleted_at is null order by name,created_at desc limit 4",
        [tenant.id],
      )
    ).rows.map((action) => ({
      id: action.id,
      code: action.code,
      name: action.name,
      actionType: action.action_type,
      targetUrl: action.target_url,
      miniProgramAppId: action.mini_program_app_id,
      miniProgramPath: action.mini_program_path,
      platform: action.platform,
    }));
    return {
      tenant: { slug: tenant.slug, name: tenant.name },
      template: template ? { id: template.id, code: template.code, name: template.name } : null,
      storefront: storefront
        ? {
            bindingId: storefront.binding_id,
            liveVersionId: storefront.live_version_id,
            store: { id: storefront.store_id, name: storefront.store_name },
            industry: template?.industry_config ?? null,
          }
        : null,
      modules,
      actions,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
