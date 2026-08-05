import type { Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('membership_roles')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('membership_id', 'uuid', (c) => c.notNull().references('memberships.id'))
    .addColumn('role_id', 'uuid', (c) => c.notNull().references('roles.id'))
    .addUniqueConstraint('membership_roles_unique', ['membership_id', 'role_id'])
    .execute();
}
export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('membership_roles').ifExists().execute();
}
