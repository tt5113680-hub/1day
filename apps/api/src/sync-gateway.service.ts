import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const SYNC_POLL_HINT_SECONDS = 30;

type SyncTopic =
  | 'operating'
  | 'storefront'
  | 'content'
  | 'membership'
  | 'lifecycle'
  | 'rbac'
  | 'channel'
  | 'circle';

const TOPIC_ALIASES: Record<string, SyncTopic> = {
  operating: 'operating',
  storefront: 'storefront',
  content: 'content',
  membership: 'membership',
  lifecycle: 'lifecycle',
  rbac: 'rbac',
  channel: 'channel',
  circle: 'circle',
};

@Injectable()
export class SyncGatewayService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  parseTopics(raw: unknown): SyncTopic[] {
    const values = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? raw
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
        : [];
    if (!values.length)
      return ['operating', 'storefront', 'lifecycle', 'rbac', 'content', 'circle'];
    const topics = values.map((value) => {
      const key = String(value).includes(':') ? String(value).split(':').at(-1) : String(value);
      const topic = TOPIC_ALIASES[key ?? ''];
      if (!topic) throw new BadRequestException('VALIDATION_ERROR');
      return topic;
    });
    return [...new Set(topics)];
  }

  async listChanges(
    context: OrganizationContext,
    query: Record<string, unknown>,
    ifNoneMatch?: string,
  ) {
    const topics = this.parseTopics(query.topics);
    const since =
      typeof query.since === 'string' && query.since.trim() ? new Date(query.since) : null;
    if (since && Number.isNaN(since.getTime())) throw new BadRequestException('VALIDATION_ERROR');
    const patterns = topics.map((topic) => `tenant:${context.tenantId}:%${topic}`);
    const result = await this.pool.query(
      `select id,topic,event_type,event_id,aggregate_type,aggregate_id,aggregate_version,correlation_id,occurred_at,store_id
       from sync_notifications
       where tenant_id=$1
         and (${patterns.map((_, index) => `topic like $${index + 2}`).join(' or ')})
         ${since ? `and occurred_at > $${patterns.length + 2}` : ''}
       order by occurred_at asc, id asc
       limit 200`,
      since
        ? [context.tenantId, ...patterns, since.toISOString()]
        : [context.tenantId, ...patterns],
    );
    const changes = result.rows.map((row) => ({
      id: row.id as string,
      topic: row.topic as string,
      eventType: row.event_type as string,
      eventId: row.event_id as string,
      aggregateType: row.aggregate_type as string,
      aggregateId: row.aggregate_id as string,
      aggregateVersion: row.aggregate_version as number,
      correlationId: row.correlation_id as string,
      occurredAt: row.occurred_at as string,
      storeId: (row.store_id as string | null) ?? null,
    }));
    const cursor = changes.at(-1)?.occurredAt ?? since?.toISOString() ?? 'epoch';
    const etag = `"${createHash('sha256')
      .update(`${context.tenantId}:${topics.join(',')}:${cursor}:${changes.length}`)
      .digest('hex')
      .slice(0, 32)}"`;
    if (ifNoneMatch && ifNoneMatch === etag)
      return {
        notModified: true as const,
        etag,
        pollAfterSeconds: SYNC_POLL_HINT_SECONDS,
      };
    return {
      notModified: false as const,
      etag,
      pollAfterSeconds: SYNC_POLL_HINT_SECONDS,
      cursor,
      topics: topics.map((topic) => `tenant:${context.tenantId}:${topic}`),
      changes,
    };
  }

  async listSinceId(context: OrganizationContext, topics: SyncTopic[], lastEventId?: string) {
    const patterns = topics.map((topic) => `tenant:${context.tenantId}:%${topic}`);
    const params: unknown[] = [context.tenantId, ...patterns];
    let sinceClause = '';
    if (lastEventId) {
      const anchor = await this.pool.query(
        'select occurred_at from sync_notifications where id=$1 and tenant_id=$2',
        [lastEventId, context.tenantId],
      );
      if (anchor.rowCount) {
        sinceClause = `and occurred_at >= $${patterns.length + 2}`;
        params.push(anchor.rows[0].occurred_at);
      }
    }
    const result = await this.pool.query(
      `select id,topic,event_type,event_id,aggregate_type,aggregate_id,aggregate_version,correlation_id,occurred_at,store_id
       from sync_notifications
       where tenant_id=$1
         and (${patterns.map((_, index) => `topic like $${index + 2}`).join(' or ')})
         ${sinceClause}
       order by occurred_at asc, id asc
       limit 100`,
      params,
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      topic: row.topic as string,
      eventType: row.event_type as string,
      eventId: row.event_id as string,
      aggregateType: row.aggregate_type as string,
      aggregateId: row.aggregate_id as string,
      aggregateVersion: row.aggregate_version as number,
      correlationId: row.correlation_id as string,
      occurredAt: row.occurred_at as string,
      storeId: (row.store_id as string | null) ?? null,
    }));
  }

  async publicStorefrontVersion(tenantSlug: string, storeId: string) {
    if (!tenantSlug.trim() || !/^[0-9a-f-]{36}$/i.test(storeId))
      throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `select b.id,b.version,b.live_version_id,b.updated_at,t.auth_epoch
       from storefront_bindings b
       join tenants t on t.id=b.tenant_id and t.status='active' and t.deleted_at is null
       join stores s on s.id=b.store_id and s.tenant_id=b.tenant_id and s.status='active' and s.deleted_at is null
       where t.slug=$1 and b.store_id=$2 and b.deleted_at is null
       limit 1`,
      [tenantSlug, storeId],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
    const row = result.rows[0];
    const publishedVersion = `${row.id}:${row.version}:${row.live_version_id ?? 'none'}`;
    const etag = `"${createHash('sha256').update(`${publishedVersion}:${row.auth_epoch}`).digest('hex').slice(0, 32)}"`;
    return {
      tenantSlug,
      storeId,
      publishedVersion,
      authEpoch: row.auth_epoch as number,
      updatedAt: row.updated_at as string,
      etag,
      pollAfterSeconds: SYNC_POLL_HINT_SECONDS,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
