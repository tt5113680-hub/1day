import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class ConsumerProcessService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async detail(tenantSlug: string, processId: string, accessToken: string) {
    if (!SLUG.test(tenantSlug) || !UUID.test(processId) || !accessToken || accessToken.length > 256)
      throw new BadRequestException('VALIDATION_ERROR');
    const process = (
      await this.pool.query(
        "select p.id,p.order_id,p.appointment_at,p.consultation_status,p.exception_feedback,o.order_number,o.occurred_at,o.status as order_status from consumer_process_accesses p join tenants t on t.id=p.tenant_id and t.slug=$1 and t.status='active' and t.deleted_at is null join customer_orders o on o.id=p.order_id and o.tenant_id=p.tenant_id and o.status='active' and o.deleted_at is null where p.id=$2 and p.status='active' and p.deleted_at is null and p.expires_at > now()",
        [tenantSlug, processId],
      )
    ).rows[0];
    if (!process) throw new NotFoundException('NOT_FOUND');
    const stored = (
      await this.pool.query('select access_token_hash from consumer_process_accesses where id=$1', [
        processId,
      ])
    ).rows[0];
    const candidate = Buffer.from(hash(accessToken));
    const expected = Buffer.from(stored.access_token_hash);
    if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected))
      throw new NotFoundException('NOT_FOUND');
    const [verification, connectors] = await Promise.all([
      this.pool.query(
        'select expires_at,redeemed_at,status from verification_codes where tenant_id=(select tenant_id from consumer_process_accesses where id=$1) and order_id=$2 and deleted_at is null order by created_at desc limit 1',
        [processId, process.order_id],
      ),
      this.pool.query(
        'select connector_code,result_status,received_at from connector_results where tenant_id=(select tenant_id from consumer_process_accesses where id=$1) and order_id=$2 and deleted_at is null order by received_at desc limit 3',
        [processId, process.order_id],
      ),
    ]);
    return {
      process: {
        id: process.id,
        status: process.order_status,
        consultationStatus: process.consultation_status,
        appointmentAt: process.appointment_at,
        exceptionFeedback: process.exception_feedback,
      },
      order: {
        number: process.order_number,
        occurredAt: process.occurred_at,
        status: process.order_status,
      },
      verification: verification.rows[0]
        ? {
            status: verification.rows[0].status,
            redeemedAt: verification.rows[0].redeemed_at,
            expiresAt: verification.rows[0].expires_at,
          }
        : null,
      connectorResults: connectors.rows.map((item) => ({
        connectorCode: item.connector_code,
        status: item.result_status,
        receivedAt: item.received_at,
      })),
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
