import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('platform_security_reviews')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('risk_key', 'varchar(180)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('acknowledged'))
    .addColumn('note', 'varchar(500)', (c) => c.notNull())
    .addColumn('reviewed_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('platform_security_reviews_tenant_risk_key', ['tenant_id', 'risk_key'])
    .execute();
  await db.schema
    .createIndex('platform_security_reviews_lookup_idx')
    .on('platform_security_reviews')
    .columns(['tenant_id', 'status'])
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('platform_security_reviews').execute();
}
