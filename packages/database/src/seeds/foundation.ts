import type { Kysely } from 'kysely';
import { scryptSync } from 'node:crypto';
import type { Database } from '../types.js';

export const SYSTEM_TENANT_ID = '00000000-0000-4000-8000-000000000001';
const SYSTEM_USER_ID = '00000000-0000-4000-8000-000000000002';
const SYSTEM_MEMBERSHIP_ID = '00000000-0000-4000-8000-000000000003';
const SYSTEM_ROLE_ID = '00000000-0000-4000-8000-000000000004';
const systemPasswordHash = `scrypt$oneday-foundation-seed$${scryptSync('ChangeMe123!', 'oneday-foundation-seed', 64).toString('base64url')}`;

export async function seedFoundationData(database: Kysely<Database>): Promise<void> {
  await database
    .insertInto('tenants')
    .values({
      id: SYSTEM_TENANT_ID,
      slug: 'system',
      name: 'ONEDAY System',
      status: 'active',
      created_by: null,
      updated_by: null,
      deleted_at: null,
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();

  await database
    .insertInto('users')
    .values({
      id: SYSTEM_USER_ID,
      email: 'admin@system.local',
      display_name: 'System Admin',
      password_hash: systemPasswordHash,
      status: 'active',
      created_by: null,
      updated_by: null,
      deleted_at: null,
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
  await database
    .insertInto('memberships')
    .values({
      id: SYSTEM_MEMBERSHIP_ID,
      tenant_id: SYSTEM_TENANT_ID,
      user_id: SYSTEM_USER_ID,
      status: 'active',
      created_by: null,
      updated_by: null,
      deleted_at: null,
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();

  await database
    .insertInto('roles')
    .values({
      id: SYSTEM_ROLE_ID,
      tenant_id: SYSTEM_TENANT_ID,
      code: 'system_admin',
      name: 'System Admin',
      status: 'active',
      created_by: null,
      updated_by: null,
      deleted_at: null,
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
  await database
    .insertInto('membership_roles')
    .values({
      id: '00000000-0000-4000-8000-000000000005',
      tenant_id: SYSTEM_TENANT_ID,
      membership_id: SYSTEM_MEMBERSHIP_ID,
      role_id: SYSTEM_ROLE_ID,
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
  await database
    .insertInto('role_permissions')
    .values([
      {
        id: '00000000-0000-4000-8000-000000000006',
        tenant_id: SYSTEM_TENANT_ID,
        role_id: SYSTEM_ROLE_ID,
        permission_id: '00000000-0000-4000-8000-000000000101',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000007',
        tenant_id: SYSTEM_TENANT_ID,
        role_id: SYSTEM_ROLE_ID,
        permission_id: '00000000-0000-4000-8000-000000000102',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
    ])
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();

  await database
    .insertInto('permissions')
    .values([
      {
        id: '00000000-0000-4000-8000-000000000101',
        code: 'tenant.read',
        description: 'Read tenant data',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000102',
        code: 'tenant.manage',
        description: 'Manage tenant data',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000103',
        code: 'organization.read',
        description: 'Read organization data',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000104',
        code: 'organization.manage',
        description: 'Manage organization data',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000105',
        code: 'employee.read',
        description: 'Read employees',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000106',
        code: 'employee.manage',
        description: 'Manage employees',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000107',
        code: 'customer.read',
        description: 'Read customer master data',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000108',
        code: 'customer.manage',
        description: 'Manage customer master data',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
    ])
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
  await database
    .insertInto('role_permissions')
    .values([
      {
        id: '00000000-0000-4000-8000-000000000008',
        tenant_id: SYSTEM_TENANT_ID,
        role_id: SYSTEM_ROLE_ID,
        permission_id: '00000000-0000-4000-8000-000000000103',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000009',
        tenant_id: SYSTEM_TENANT_ID,
        role_id: SYSTEM_ROLE_ID,
        permission_id: '00000000-0000-4000-8000-000000000104',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000010',
        tenant_id: SYSTEM_TENANT_ID,
        role_id: SYSTEM_ROLE_ID,
        permission_id: '00000000-0000-4000-8000-000000000105',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000011',
        tenant_id: SYSTEM_TENANT_ID,
        role_id: SYSTEM_ROLE_ID,
        permission_id: '00000000-0000-4000-8000-000000000106',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000012',
        tenant_id: SYSTEM_TENANT_ID,
        role_id: SYSTEM_ROLE_ID,
        permission_id: '00000000-0000-4000-8000-000000000107',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000013',
        tenant_id: SYSTEM_TENANT_ID,
        role_id: SYSTEM_ROLE_ID,
        permission_id: '00000000-0000-4000-8000-000000000108',
        status: 'active',
        created_by: null,
        updated_by: null,
        deleted_at: null,
      },
    ])
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
}
