import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class ConsumerProfileService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async profile(slug: string, accessId: string, token: string) {
    const access = await this.access(slug, accessId, token, true);
    const [identities, orders, benefits] = await Promise.all([
      this.pool.query(
        "select identity_type,masked_value from customer_identities where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null order by created_at",
        [access.tenant_id, access.customer_id],
      ),
      this.pool.query(
        "select order_number,occurred_at,status from customer_orders where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null order by occurred_at desc limit 10",
        [access.tenant_id, access.customer_id],
      ),
      this.pool.query(
        "select distinct b.title,b.description from store_benefits b where b.tenant_id=$1 and b.status='active' and b.deleted_at is null order by b.title limit 8",
        [access.tenant_id],
      ),
    ]);
    return {
      profile: {
        displayName: access.display_name,
        identities: identities.rows.map((x) => ({
          type: x.identity_type,
          maskedValue: x.masked_value,
        })),
        consent: {
          status: access.consent_status,
          version: access.consent_version,
          consentedAt: access.consented_at,
          versionNumber: access.version,
        },
      },
      benefits: benefits.rows.map((x) => ({ title: x.title, description: x.description })),
      history: orders.rows.map((x) => ({
        orderNumber: x.order_number,
        occurredAt: x.occurred_at,
        status: x.status,
      })),
    };
  }
  async revoke(slug: string, accessId: string, token: string, key: string, version: unknown) {
    if (!key.trim() || key.length > 200 || !Number.isInteger(version))
      throw new BadRequestException('VALIDATION_ERROR');
    // A retry after a successful revocation must still be able to replay the
    // original response. Validate the signed access material first, then
    // decide whether this is a replay before requiring an active consent.
    const access = await this.access(slug, accessId, token, false);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='consumer_profile_revoke' and idempotency_key=$2 and deleted_at is null",
        [access.tenant_id, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      if (access.status !== 'active' || new Date(access.expires_at).getTime() <= Date.now())
        throw new NotFoundException('NOT_FOUND');
      const updated = await client.query(
        "update consumer_profile_accesses set consent_status='revoked',revoked_at=now(),status='revoked',updated_at=now(),version=version+1 where id=$1 and tenant_id=$2 and version=$3 and status='active' returning id,consent_status,revoked_at,version",
        [accessId, access.tenant_id, version],
      );
      if (!updated.rowCount) throw new ConflictException('CONFLICT');
      const data = updated.rows[0];
      const correlationId = randomUUID();
      const traceId = randomUUID();
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,null,'consumer.profile_consent_revoked','consumer_profile_access',$3,$4,$5,$6,null,null)",
        [
          randomUUID(),
          access.tenant_id,
          accessId,
          correlationId,
          traceId,
          { consentStatus: 'revoked' },
        ],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'consumer.profile.consent.revoked.v1','consumer_profile_access',$3,$4,$5,$6,null,null)",
        [
          randomUUID(),
          access.tenant_id,
          accessId,
          { consentStatus: 'revoked' },
          correlationId,
          traceId,
        ],
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,null,null)',
        [randomUUID(), access.tenant_id, 'consumer_profile_revoke', key, data],
      );
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
  private async access(slug: string, id: string, token: string, active: boolean) {
    if (!SLUG.test(slug) || !UUID.test(id) || !token || token.length > 256)
      throw new BadRequestException('VALIDATION_ERROR');
    const row = (
      await this.pool.query(
        `select p.*,c.display_name from consumer_profile_accesses p join tenants t on t.id=p.tenant_id and t.slug=$1 and t.status='active' and t.deleted_at is null join customers c on c.id=p.customer_id and c.tenant_id=p.tenant_id and c.status='active' and c.deleted_at is null where p.id=$2 and p.deleted_at is null ${active ? "and p.status='active' and p.expires_at>now()" : ''}`,
        [slug, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException('NOT_FOUND');
    const a = Buffer.from(digest(token));
    const b = Buffer.from(row.access_token_hash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new NotFoundException('NOT_FOUND');
    return row;
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
