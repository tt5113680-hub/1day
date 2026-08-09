import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createApiPool } from './database-pool';

const CODE = /^[A-Z0-9]{12,48}$/;
const ROLES = new Set(['consumer', 'employee', 'management']);

@Injectable()
export class OneCodeService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async resolve(code: string, requestedRole?: string) {
    if (!CODE.test(code)) throw new BadRequestException('VALIDATION_ERROR');
    const role = requestedRole ?? 'consumer';
    if (!ROLES.has(role)) throw new BadRequestException('VALIDATION_ERROR');
    const row = (
      await this.pool.query(
        `select oce.code,oce.scene,oce.source,oce.target_path,oce.role_targets,t.slug,t.name
         from one_code_entries oce
         join tenants t on t.id=oce.tenant_id and t.status='active' and t.deleted_at is null
         left join stores s on s.id=oce.store_id and s.tenant_id=oce.tenant_id and s.status='active' and s.deleted_at is null
         where oce.code=$1 and oce.status='active' and (oce.expires_at is null or oce.expires_at>now())
           and oce.deleted_at is null and (oce.store_id is null or s.id is not null)`,
        [code],
      )
    ).rows[0];
    if (!row) throw new NotFoundException('NOT_FOUND');
    const targets = row.role_targets as Record<string, unknown>;
    const target = role === 'consumer' ? row.target_path : targets[role];
    if (typeof target !== 'string' || !target.startsWith('/'))
      throw new NotFoundException('NOT_FOUND');
    return {
      code: row.code,
      tenant: { slug: row.slug, name: row.name },
      scene: row.scene,
      source: `one-code:${row.code}`,
      role,
      targetPath: target,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
