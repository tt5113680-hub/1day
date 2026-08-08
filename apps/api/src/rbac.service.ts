import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type Pool } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';
const uuid = /^[0-9a-f-]{36}$/i,
  text = (v: unknown, n: number) => {
    if (typeof v !== 'string' || !v.trim() || v.trim().length > n)
      throw new BadRequestException('VALIDATION_ERROR');
    return v.trim();
  };
@Injectable()
export class RbacService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async list(c: OrganizationContext) {
    return (
      await this.pool.query(
        "select r.id,r.code,r.name,r.version,array_remove(array_agg(p.code),null) permissions from roles r left join role_permissions rp on rp.role_id=r.id and rp.tenant_id=r.tenant_id and rp.status='active' left join permissions p on p.id=rp.permission_id and p.status='active' where r.tenant_id=$1 and r.status='active' group by r.id order by r.code",
        [c.tenantId],
      )
    ).rows;
  }
  async create(
    c: OrganizationContext,
    b: Record<string, unknown>,
    key: string,
    correlation: string,
  ) {
    if (!key) throw new BadRequestException('VALIDATION_ERROR');
    const code = text(b.code, 80),
      name = text(b.name, 160);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const old = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [c.tenantId, 'role', key],
      );
      if (old.rowCount) {
        await client.query('commit');
        return old.rows[0].response;
      }
      const id = randomUUID(),
        out = (
          await client.query(
            'insert into roles(id,tenant_id,code,name,created_by,updated_by)values($1,$2,$3,$4,$5,$5)returning id,code,name,version',
            [id, c.tenantId, code, name, c.userId],
          )
        ).rows[0];
      await this.audit(client, c, 'role.created', 'role', id, correlation, out);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by)values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), c.tenantId, 'role', key, out, c.userId],
      );
      await client.query('commit');
      return out;
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
  async change(
    c: OrganizationContext,
    id: string,
    b: Record<string, unknown>,
    correlation: string,
  ) {
    if (
      !uuid.test(id) ||
      b.confirmation !== 'CONFIRM_PERMISSION_CHANGE' ||
      typeof b.version !== 'number' ||
      !Array.isArray(b.permissionCodes)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const reason = text(b.reason, 320),
      codes = [...new Set(b.permissionCodes.map((x) => text(x, 120)))];
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const role = await client.query(
        "select * from roles where id=$1 and tenant_id=$2 and version=$3 and status='active' for update",
        [id, c.tenantId, b.version],
      );
      if (!role.rowCount) throw new ConflictException('CONFLICT');
      const before = (
        await client.query(
          "select p.code from role_permissions rp join permissions p on p.id=rp.permission_id where rp.role_id=$1 and rp.status='active'",
          [id],
        )
      ).rows.map((x) => x.code);
      const permissions = (
        await client.query(
          "select id,code from permissions where code=any($1::varchar[]) and status='active'",
          [codes],
        )
      ).rows;
      if (permissions.length !== codes.length) throw new NotFoundException('NOT_FOUND');
      await client.query(
        "update role_permissions set status='inactive',updated_by=$2,updated_at=now() where role_id=$1 and tenant_id=$3 and status='active'",
        [id, c.userId, c.tenantId],
      );
      for (const p of permissions) {
        const restored = await client.query(
          'update role_permissions set status=$1,updated_by=$2,updated_at=now() where tenant_id=$3 and role_id=$4 and permission_id=$5',
          ['active', c.userId, c.tenantId, id, p.id],
        );
        if (restored.rowCount === 0)
          await client.query(
            'insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by)values($1,$2,$3,$4,$5,$6,$6)',
            [randomUUID(), c.tenantId, id, p.id, 'active', c.userId],
          );
      }
      await client.query(
        'update roles set version=version+1,updated_by=$1,updated_at=now() where id=$2',
        [c.userId, id],
      );
      const data = { roleId: id, before, after: codes };
      await client.query(
        'insert into permission_change_confirmations(id,tenant_id,role_id,actor_id,reason,before_permissions,after_permissions,created_by,updated_by)values($1,$2,$3,$4,$5,$6,$7,$4,$4)',
        [
          randomUUID(),
          c.tenantId,
          id,
          c.userId,
          reason,
          JSON.stringify(before),
          JSON.stringify(codes),
        ],
      );
      await this.audit(client, c, 'role.permissions_changed', 'role', id, correlation, data);
      await client.query('commit');
      return data;
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
  private async audit(
    q: Pool | import('pg').PoolClient,
    c: OrganizationContext,
    a: string,
    t: string,
    id: string,
    r: string,
    d: unknown,
  ) {
    await q.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        c.tenantId,
        c.userId,
        a,
        t,
        id,
        uuid.test(r) ? r : randomUUID(),
        'core-003',
        d,
      ],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
