import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('content_store_placements')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('content_id', 'uuid', (c) => c.notNull().references('content_items.id'))
    .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
    .addColumn('rank', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('content_store_placements_unique', ['tenant_id', 'content_id', 'store_id'])
    .execute();
  await sql`insert into content_items(id,tenant_id,kind,title,body,status,created_at,updated_at,version) select id,tenant_id,content_type,title,summary,'approved',created_at,updated_at,version from store_content_items where deleted_at is null on conflict(id) do nothing`.execute(
    db,
  );
  await sql`insert into content_store_placements(id,tenant_id,content_id,store_id,rank,status,created_at,updated_at,version) select gen_random_uuid(),tenant_id,id,store_id,rank,status,created_at,updated_at,version from store_content_items where deleted_at is null on conflict(tenant_id,content_id,store_id) do nothing`.execute(
    db,
  );
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('content_store_placements').ifExists().execute();
}
