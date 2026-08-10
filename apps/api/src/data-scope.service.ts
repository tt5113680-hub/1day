import { ForbiddenException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { mergeStoreScopes, type MenuScopeDto } from '@oneday/contracts';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createApiPool } from './database-pool';

@Injectable()
export class DataScopeService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async membershipId(tenantId: string, userId: string): Promise<string | null> {
    const result = await this.pool.query<{ id: string }>(
      "select id from memberships where tenant_id=$1 and user_id=$2 and status='active' and deleted_at is null limit 1",
      [tenantId, userId],
    );
    return result.rows[0]?.id ?? null;
  }

  async listActive(tenantId: string, userId: string): Promise<MenuScopeDto[]> {
    const result = await this.pool.query<{
      scope_type: string;
      scope_value: string;
      store_name: string | null;
    }>(
      `select ds.scope_type, ds.scope_value, s.name as store_name
       from data_scopes ds
       join memberships m on m.id = ds.membership_id and m.tenant_id = ds.tenant_id
         and m.user_id = $2 and m.status = 'active' and m.deleted_at is null
       left join stores s on ds.scope_type = 'store' and s.id::text = ds.scope_value
         and s.tenant_id = ds.tenant_id and s.deleted_at is null
       where ds.tenant_id = $1 and ds.status = 'active' and ds.deleted_at is null
       order by ds.scope_type, coalesce(s.name, ds.scope_value)`,
      [tenantId, userId],
    );
    return result.rows
      .map((row) => {
        if (row.scope_type === 'store') {
          return {
            type: 'store' as const,
            id: row.scope_value,
            label: row.store_name ?? row.scope_value,
          };
        }
        if (row.scope_type === 'channel' || row.scope_type === 'circle') {
          return {
            type: row.scope_type as 'channel' | 'circle',
            id: row.scope_value,
            label: row.scope_value,
          };
        }
        if (row.scope_type === 'tenant') {
          return { type: 'tenant' as const, id: row.scope_value, label: '当前租户' };
        }
        if (row.scope_type === 'system') {
          return { type: 'system' as const, id: row.scope_value, label: '系统租户' };
        }
        return null;
      })
      .filter((row): row is MenuScopeDto => row !== null);
  }

  async listStoreScopesFromManagers(tenantId: string, userId: string): Promise<MenuScopeDto[]> {
    const stores = await this.pool.query<{ id: string; name: string }>(
      `select s.id, s.name
       from store_managers sm
       join employees e on e.id = sm.employee_id and e.tenant_id = sm.tenant_id
         and e.status = 'active' and e.deleted_at is null
       join memberships m on m.id = e.membership_id and m.tenant_id = e.tenant_id
         and m.user_id = $2 and m.status = 'active' and m.deleted_at is null
       join stores s on s.id = sm.store_id and s.tenant_id = sm.tenant_id
         and s.status = 'active' and s.deleted_at is null
       where sm.tenant_id = $1 and sm.status = 'active' and sm.deleted_at is null
       order by s.name`,
      [tenantId, userId],
    );
    return stores.rows.map((store) => ({
      type: 'store' as const,
      id: store.id,
      label: store.name,
    }));
  }

  async resolveStoreScopes(tenantId: string, userId: string): Promise<MenuScopeDto[]> {
    const [fromScopes, fromManagers] = await Promise.all([
      this.listActive(tenantId, userId),
      this.listStoreScopesFromManagers(tenantId, userId),
    ]);
    return mergeStoreScopes(
      fromScopes.filter((scope) => scope.type === 'store'),
      fromManagers,
    );
  }

  async managedStores(tenantId: string, userId: string) {
    const scopes = await this.resolveStoreScopes(tenantId, userId);
    return {
      stores: scopes.map((scope) => ({ id: scope.id, name: scope.label })),
      scopeCount: scopes.length,
    };
  }

  async canAccessStore(
    tenantId: string,
    userId: string,
    storeId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    if (permissionCodes.includes('tenant.manage')) return true;
    const scopes = await this.resolveStoreScopes(tenantId, userId);
    return scopes.some((scope) => scope.id === storeId);
  }

  async requireStoreAccess(
    tenantId: string,
    userId: string,
    storeId: string,
    permissionCodes: string[],
  ) {
    if (!(await this.canAccessStore(tenantId, userId, storeId, permissionCodes))) {
      throw new ForbiddenException('FORBIDDEN');
    }
  }

  async syncStoreAssignment(
    client: PoolClient,
    input: {
      tenantId: string;
      storeId: string;
      employeeId: string;
      actorId: string;
    },
  ) {
    const membership = await client.query<{ membership_id: string }>(
      'select membership_id from employees where id=$1 and tenant_id=$2 and deleted_at is null',
      [input.employeeId, input.tenantId],
    );
    if (membership.rowCount !== 1) throw new ForbiddenException('FORBIDDEN');
    await client.query(
      `update data_scopes
       set status='inactive', updated_at=now(), updated_by=$1, version=version+1
       where tenant_id=$2 and scope_type='store' and scope_value=$3
         and status='active' and deleted_at is null`,
      [input.actorId, input.tenantId, input.storeId],
    );
    await client.query(
      `insert into data_scopes(id, tenant_id, membership_id, scope_type, scope_value, status, created_by, updated_by)
       values($1,$2,$3,'store',$4,'active',$5,$5)
       on conflict(membership_id, scope_type, scope_value)
       do update set status='active', deleted_at=null, updated_at=now(),
         updated_by=excluded.updated_by, version=data_scopes.version+1`,
      [
        randomUUID(),
        input.tenantId,
        membership.rows[0]!.membership_id,
        input.storeId,
        input.actorId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
