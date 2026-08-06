import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Pool } from 'pg';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

@Injectable()
export class ConsumerEntryService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async entry(tenantSlug: string) {
    if (!SLUG.test(tenantSlug)) throw new BadRequestException('VALIDATION_ERROR');
    const tenant = (
      await this.pool.query(
        "select id,slug,name from tenants where slug=$1 and status='active' and deleted_at is null",
        [tenantSlug],
      )
    ).rows[0];
    if (!tenant) throw new NotFoundException('NOT_FOUND');
    const template = (
      await this.pool.query(
        "select id,code,name,published_version_id from page_templates where tenant_id=$1 and target='consumer' and status='active' and published_version_id is not null and deleted_at is null order by updated_at desc limit 1",
        [tenant.id],
      )
    ).rows[0] as Record<string, unknown> | undefined;
    const modules = template
      ? (
          await this.pool.query(
            "select id,module_type,position,config from page_modules where tenant_id=$1 and template_version_id=$2 and status='active' and deleted_at is null order by position",
            [tenant.id, template.published_version_id],
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
      modules,
      actions,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
