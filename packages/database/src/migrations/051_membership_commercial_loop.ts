import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('membership_enrollments')
    .addColumn('member_code', 'varchar(24)')
    .execute();
  await sql`update membership_enrollments set member_code=upper(substr(replace(id::text,'-',''),1,12)) where member_code is null`.execute(
    db,
  );
  await db.schema
    .alterTable('membership_enrollments')
    .alterColumn('member_code', (c) => c.setNotNull())
    .execute();
  await db.schema
    .alterTable('membership_enrollments')
    .addUniqueConstraint('membership_enrollments_tenant_member_code_key', [
      'tenant_id',
      'member_code',
    ])
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema
    .alterTable('membership_enrollments')
    .dropConstraint('membership_enrollments_tenant_member_code_key')
    .execute();
  await db.schema.alterTable('membership_enrollments').dropColumn('member_code').execute();
}
