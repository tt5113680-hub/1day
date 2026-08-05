import type { Kysely } from 'kysely';
import type { Database } from '../types.js';

export const SYSTEM_TENANT_ID = '00000000-0000-4000-8000-000000000001';

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
    ])
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
}
