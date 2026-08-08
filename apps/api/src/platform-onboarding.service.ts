import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID, scryptSync } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';
const text = (v: unknown, n: number) => {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > n)
    throw new BadRequestException('VALIDATION_ERROR');
  return v.trim();
};
const slug = (v: unknown) => {
  const x = text(v, 80);
  if (!/^[a-z0-9-]+$/.test(x)) throw new BadRequestException('VALIDATION_ERROR');
  return x;
};
@Injectable()
export class PlatformOnboardingService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async create(c: OrganizationContext, b: Record<string, unknown>, key: string, r: string) {
    if (!key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      slug: slug(b.slug),
      tenantName: text(b.tenantName, 160),
      organizationName: text(b.organizationName, 160),
      storeName: text(b.storeName, 160),
      adminEmail: text(b.adminEmail, 320).toLowerCase(),
      adminName: text(b.adminName, 160),
      adminPassword: text(b.adminPassword, 128),
      template: text(b.template, 32),
    };
    if (
      !['starter', 'service'].includes(input.template) ||
      !/.+@.+\..+/.test(input.adminEmail) ||
      input.adminPassword.length < 12
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const old = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [c.tenantId, 'platform_onboarding', key],
      );
      if (old.rowCount) {
        await q.query('commit');
        return old.rows[0].response;
      }
      const tenantId = randomUUID(),
        userId = randomUUID(),
        membershipId = randomUUID(),
        orgId = randomUUID(),
        merchantId = randomUUID(),
        storeId = randomUUID(),
        roleId = randomUUID(),
        templateId = randomUUID();
      const existing = await q.query(
        'select 1 from tenants where slug=$1 union all select 1 from users where email=$2',
        [input.slug, input.adminEmail],
      );
      if (existing.rowCount) throw new ConflictException('CONFLICT');
      await q.query(
        'insert into tenants(id,slug,name,created_by,updated_by) values($1,$2,$3,$4,$4)',
        [tenantId, input.slug, input.tenantName, c.userId],
      );
      await q.query(
        'insert into users(id,email,display_name,password_hash,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
        [
          userId,
          input.adminEmail,
          input.adminName,
          `scrypt$oneday-onboarding$${scryptSync(input.adminPassword, 'oneday-onboarding', 64).toString('base64url')}`,
          c.userId,
        ],
      );
      await q.query(
        'insert into memberships(id,tenant_id,user_id,created_by,updated_by) values($1,$2,$3,$4,$4)',
        [membershipId, tenantId, userId, c.userId],
      );
      await q.query(
        "insert into organizations(id,tenant_id,code,name,organization_type,created_by,updated_by) values($1,$2,'HQ',$3,'headquarters',$4,$4)",
        [orgId, tenantId, input.organizationName, c.userId],
      );
      await q.query(
        "insert into merchants(id,tenant_id,organization_id,code,name,created_by,updated_by) values($1,$2,$3,'PRIMARY',$4,$5,$5)",
        [merchantId, tenantId, orgId, input.tenantName, c.userId],
      );
      await q.query(
        "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,created_by,updated_by) values($1,$2,$3,$4,'MAIN',$5,$6,$6)",
        [storeId, tenantId, orgId, merchantId, input.storeName, c.userId],
      );
      await q.query(
        "insert into roles(id,tenant_id,code,name,created_by,updated_by) values($1,$2,'tenant_admin','Tenant Administrator',$3,$3)",
        [roleId, tenantId, c.userId],
      );
      const perm = (
        await q.query("select id from permissions where code='tenant.manage' and status='active'")
      ).rows[0];
      await q.query(
        'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
        [randomUUID(), tenantId, membershipId, roleId],
      );
      await q.query(
        'insert into role_permissions(id,tenant_id,role_id,permission_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
        [randomUUID(), tenantId, roleId, perm.id, c.userId],
      );
      await q.query(
        "insert into page_templates(id,tenant_id,code,name,target,created_by,updated_by) values($1,$2,'consumer-starter',$3,'consumer',$4,$4)",
        [templateId, tenantId, `${input.tenantName} ${input.template}`, c.userId],
      );
      const response = {
        tenantId,
        slug: input.slug,
        organizationId: orgId,
        storeId,
        adminEmail: input.adminEmail,
        templateId,
      };
      await q.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.tenant_onboarded','tenant',$4,$5,'page-p-003',$6,$3,$3)",
        [randomUUID(), c.tenantId, c.userId, tenantId, r, response],
      );
      await q.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'platform.tenant.onboarded.v1','tenant',$3,$4,$5,'page-p-003',$6,$6)",
        [randomUUID(), c.tenantId, tenantId, response, r, c.userId],
      );
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), c.tenantId, 'platform_onboarding', key, response, c.userId],
      );
      await q.query('commit');
      return response;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
