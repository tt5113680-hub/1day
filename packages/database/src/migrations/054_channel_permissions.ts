import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const SYSTEM_TENANT_ID = '00000000-0000-4000-8000-000000000001';
const SYSTEM_ROLE_ID = '00000000-0000-4000-8000-000000000004';
const CHANNEL_READ_ID = '00000000-0000-4000-8000-000000000125';
const CHANNEL_MANAGE_ID = '00000000-0000-4000-8000-000000000126';
const RP_CHANNEL_READ_ID = '00000000-0000-4000-8000-000000000030';
const RP_CHANNEL_MANAGE_ID = '00000000-0000-4000-8000-000000000031';

export async function up(db: Kysely<Database>) {
  await sql`
    insert into permissions(id, code, description, status, created_by, updated_by)
    values
      (${CHANNEL_READ_ID}::uuid, 'channel.read', 'Read scoped channel merchant delivery', 'active', null, null),
      (${CHANNEL_MANAGE_ID}::uuid, 'channel.manage', 'Manage scoped channel merchant onboarding and delivery', 'active', null, null)
    on conflict (id) do nothing
  `.execute(db);

  await sql`
    insert into role_permissions(id, tenant_id, role_id, permission_id, status, created_by, updated_by)
    values
      (${RP_CHANNEL_READ_ID}::uuid, ${SYSTEM_TENANT_ID}::uuid, ${SYSTEM_ROLE_ID}::uuid, ${CHANNEL_READ_ID}::uuid, 'active', null, null),
      (${RP_CHANNEL_MANAGE_ID}::uuid, ${SYSTEM_TENANT_ID}::uuid, ${SYSTEM_ROLE_ID}::uuid, ${CHANNEL_MANAGE_ID}::uuid, 'active', null, null)
    on conflict (id) do nothing
  `.execute(db);
}

export async function down(db: Kysely<Database>) {
  await sql`
    delete from role_permissions
    where id in (${RP_CHANNEL_READ_ID}::uuid, ${RP_CHANNEL_MANAGE_ID}::uuid)
  `.execute(db);
  await sql`
    delete from permissions
    where id in (${CHANNEL_READ_ID}::uuid, ${CHANNEL_MANAGE_ID}::uuid)
  `.execute(db);
}
