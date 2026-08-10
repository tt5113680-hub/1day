import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';
const kinds = new Set(['knowledge', 'article', 'image', 'video']),
  channels = new Set(['wechat', 'douyin', 'meituan', 'internal']),
  uuid = /^[0-9a-f-]{36}$/i;
const text = (v: unknown, n: number) =>
  typeof v === 'string' && v.trim() && v.trim().length <= n
    ? v.trim()
    : (() => {
        throw new BadRequestException('VALIDATION_ERROR');
      })();
@Injectable()
export class ManagementContentService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async list(c: OrganizationContext, storeIds: string[] | null = null) {
    const scoped = storeIds !== null;
    const r = await this.pool.query(
      `select i.id,i.kind,i.title,i.body,i.media_url,i.status,i.version,i.created_at,
        coalesce(d.channels,'{}') channels,
        coalesce(p.placements,'[]'::json) placements
       from content_items i
       left join lateral(
         select array_agg(channel order by channel) channels
         from content_distributions where content_id=i.id and tenant_id=i.tenant_id and deleted_at is null
       ) d on true
       left join lateral(
         select json_agg(json_build_object('storeId',p.store_id,'storeName',s.name,'rank',p.rank,'status',p.status,'version',p.version) order by p.rank desc,s.name) placements
         from content_store_placements p
         join stores s on s.id=p.store_id and s.tenant_id=p.tenant_id and s.deleted_at is null
         where p.content_id=i.id and p.tenant_id=i.tenant_id and p.status='active' and p.deleted_at is null
           ${scoped ? 'and p.store_id = any($2::uuid[])' : ''}
       ) p on true
       where i.tenant_id=$1 and i.deleted_at is null
         ${scoped ? "and i.status='approved'" : ''}
       order by i.created_at desc`,
      scoped ? [c.tenantId, storeIds] : [c.tenantId],
    );
    return r.rows;
  }
  async create(c: OrganizationContext, b: Record<string, unknown>, key: string, r: string) {
    if (!key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const kind = text(b.kind, 32);
    if (!kinds.has(kind)) throw new BadRequestException('VALIDATION_ERROR');
    const title = text(b.title, 200),
      body = b.body === undefined ? null : text(b.body, 12000),
      media = b.mediaUrl === undefined ? null : text(b.mediaUrl, 500);
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const old = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [c.tenantId, 'content_item', key],
      );
      if (old.rowCount) {
        await q.query('commit');
        return old.rows[0].response;
      }
      const row = (
        await q.query(
          'insert into content_items(id,tenant_id,kind,title,body,media_url,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7) returning id,kind,title,status,version',
          [randomUUID(), c.tenantId, kind, title, body, media, c.userId],
        )
      ).rows[0];
      await this.audit(q, c, 'content.created', row.id, r, row);
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), c.tenantId, 'content_item', key, row, c.userId],
      );
      await q.query('commit');
      return row;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  async approve(c: OrganizationContext, id: string, b: Record<string, unknown>, r: string) {
    if (!uuid.test(id) || typeof b.version !== 'number')
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const row = (
        await q.query(
          "update content_items set status='approved',version=version+1,updated_at=now(),updated_by=$1 where id=$2 and tenant_id=$3 and status='draft' and version=$4 returning id,status,version",
          [c.userId, id, c.tenantId, b.version],
        )
      ).rows[0];
      if (!row) throw new ConflictException('CONFLICT');
      await this.audit(q, c, 'content.approved', id, r, row);
      await q.query('commit');
      return row;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  async distribute(c: OrganizationContext, id: string, b: Record<string, unknown>, r: string) {
    if (!uuid.test(id) || typeof b.version !== 'number')
      throw new BadRequestException('VALIDATION_ERROR');
    const channel = text(b.channel, 64);
    if (!channels.has(channel)) throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const item = (
        await q.query(
          "select id from content_items where id=$1 and tenant_id=$2 and status='approved' and version=$3 for update",
          [id, c.tenantId, b.version],
        )
      ).rows[0];
      if (!item) throw new ConflictException('CONFLICT');
      const row = (
        await q.query(
          'insert into content_distributions(id,tenant_id,content_id,channel,created_by,updated_by) values($1,$2,$3,$4,$5,$5) returning id,channel,status,version',
          [randomUUID(), c.tenantId, id, channel, c.userId],
        )
      ).rows[0];
      await this.audit(q, c, 'content.distribution_requested', id, r, row);
      await q.query(
        'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
        [
          randomUUID(),
          c.tenantId,
          'content.distribution.requested.v1',
          'content_item',
          id,
          { distribution: row },
          uuid.test(r) ? r : randomUUID(),
          'page-m-013',
          c.userId,
        ],
      );
      await q.query('commit');
      return row;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  async place(c: OrganizationContext, id: string, b: Record<string, unknown>, r: string) {
    if (!uuid.test(id) || !uuid.test(String(b.storeId)))
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const item = (
        await q.query(
          "select id from content_items where id=$1 and tenant_id=$2 and status='approved' and deleted_at is null",
          [id, c.tenantId],
        )
      ).rows[0];
      const store = (
        await q.query(
          "select id from stores where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
          [b.storeId, c.tenantId],
        )
      ).rows[0];
      if (!item || !store) throw new BadRequestException('VALIDATION_ERROR');
      const row = (
        await q.query(
          "insert into content_store_placements(id,tenant_id,content_id,store_id,rank,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6) on conflict(tenant_id,content_id,store_id) do update set status='active',rank=excluded.rank,deleted_at=null,updated_by=excluded.updated_by,updated_at=now(),version=content_store_placements.version+1 returning id,store_id,rank,status,version",
          [randomUUID(), c.tenantId, id, store.id, Number.isInteger(b.rank) ? b.rank : 0, c.userId],
        )
      ).rows[0];
      await this.audit(q, c, 'content.store_placed', id, r, row);
      await q.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'content.store.placed.v1','content_item',$3,$4,$5,'batch-2-content',$6,$6)",
        [randomUUID(), c.tenantId, id, row, uuid.test(r) ? r : randomUUID(), c.userId],
      );
      await q.query('commit');
      return row;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  private async audit(
    q: PoolClient,
    c: OrganizationContext,
    a: string,
    id: string,
    r: string,
    d: unknown,
  ) {
    await q.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        c.tenantId,
        c.userId,
        a,
        'content_item',
        id,
        uuid.test(r) ? r : randomUUID(),
        'page-m-013',
        d,
      ],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
