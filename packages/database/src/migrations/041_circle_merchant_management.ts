import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('platform_business_circle_merchants')
    .addColumn('invitation_status', 'varchar(32)', (c) => c.notNull().defaultTo('not_required'))
    .addColumn('invitation_note', 'varchar(320)')
    .addColumn('circle_approval_status', 'varchar(32)', (c) =>
      c.notNull().defaultTo('not_required'),
    )
    .addColumn('display_config', 'jsonb', (c) =>
      c.notNull().defaultTo(sql`'{"visible": true, "sortOrder": 0}'::jsonb`),
    )
    .addColumn('exited_at', 'timestamptz')
    .addColumn('exit_reason', 'varchar(320)')
    .execute();
  await db.schema
    .createIndex('platform_business_circle_merchants_review_idx')
    .on('platform_business_circle_merchants')
    .columns(['tenant_id', 'circle_approval_status', 'approval_status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('platform_business_circle_merchants_review_idx').execute();
  await db.schema
    .alterTable('platform_business_circle_merchants')
    .dropColumn('exit_reason')
    .dropColumn('exited_at')
    .dropColumn('display_config')
    .dropColumn('circle_approval_status')
    .dropColumn('invitation_note')
    .dropColumn('invitation_status')
    .execute();
}
