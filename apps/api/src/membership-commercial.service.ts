import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const memberCode = () => randomBytes(6).toString('hex').toUpperCase();
const mobile = (value: unknown) => {
  const result = String(value ?? '').replace(/[\s-]/g, '');
  if (!/^1\d{10}$/.test(result)) throw new BadRequestException('VALIDATION_ERROR');
  return result;
};

@Injectable()
export class MembershipCommercialService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async enroll(slug: string, body: Record<string, unknown>, key: string) {
    if (
      !SLUG.test(slug) ||
      !UUID.test(String(body.storeId)) ||
      body.consent !== true ||
      !key.trim()
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const phone = mobile(body.phone),
      client = await this.pool.connect();
    try {
      await client.query('begin');
      const tenant = (
        await client.query(
          "select id from tenants where slug=$1 and status='active' and deleted_at is null",
          [slug],
        )
      ).rows[0];
      if (!tenant) throw new NotFoundException('NOT_FOUND');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='membership_enroll' and idempotency_key=$2 and deleted_at is null",
        [tenant.id, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const store = (
        await client.query(
          "select id from stores where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
          [body.storeId, tenant.id],
        )
      ).rows[0];
      if (!store) throw new NotFoundException('NOT_FOUND');
      const identityHash = digest(`${tenant.id}:${phone}`);
      let identity = (
        await client.query(
          "select customer_id from customer_identities where tenant_id=$1 and identity_type='phone' and identity_value_hash=$2 and status='active' and deleted_at is null",
          [tenant.id, identityHash],
        )
      ).rows[0];
      if (!identity) {
        identity = { customer_id: randomUUID() };
        await client.query(
          'insert into customers(id,tenant_id,display_name,created_by,updated_by) values($1,$2,$3,null,null)',
          [identity.customer_id, tenant.id, `会员 ${phone.slice(-4)}`],
        );
        await client.query(
          "insert into customer_identities(id,tenant_id,customer_id,identity_type,identity_value_hash,masked_value,created_by,updated_by) values($1,$2,$3,'phone',$4,$5,null,null)",
          [
            randomUUID(),
            tenant.id,
            identity.customer_id,
            identityHash,
            `${phone.slice(0, 3)}****${phone.slice(-4)}`,
          ],
        );
      }
      let enrollment = (
        await client.query(
          'select id,member_code from membership_enrollments where tenant_id=$1 and customer_id=$2 and deleted_at is null for update',
          [tenant.id, identity.customer_id],
        )
      ).rows[0];
      if (!enrollment) {
        enrollment = { id: randomUUID(), member_code: memberCode() };
        await client.query(
          "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,source,joined_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active','consumer_storefront',now(),null,null)",
          [enrollment.id, tenant.id, identity.customer_id, store.id, enrollment.member_code],
        );
      } else
        await client.query(
          "update membership_enrollments set store_id=$1,enrollment_status='active',joined_at=coalesce(joined_at,now()),updated_at=now(),version=version+1 where id=$2 and tenant_id=$3",
          [store.id, enrollment.id, tenant.id],
        );
      const token = randomBytes(24).toString('base64url'),
        accessId = randomUUID();
      await client.query(
        "insert into consumer_profile_accesses(id,tenant_id,customer_id,access_token_hash,consent_status,consent_version,consented_at,expires_at,created_by,updated_by) values($1,$2,$3,$4,'granted','membership-v1',now(),now()+interval '180 days',null,null)",
        [accessId, tenant.id, identity.customer_id, digest(token)],
      );
      const data = {
        enrollmentId: enrollment.id,
        memberCode: enrollment.member_code,
        profileAccessId: accessId,
        profileAccess: token,
      };
      await this.receipt(
        client,
        tenant.id,
        null,
        'membership.enrolled',
        'membership.enrolled.v1',
        enrollment.id,
        data,
      );
      await client.query(
        "insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,'membership_enroll',$3,$4,null,null)",
        [randomUUID(), tenant.id, key, data],
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

  async wallet(slug: string, accessId: string, token: string) {
    if (!SLUG.test(slug) || !UUID.test(accessId) || !token)
      throw new BadRequestException('VALIDATION_ERROR');
    const access = (
      await this.pool.query(
        "select p.tenant_id,p.customer_id from consumer_profile_accesses p join tenants t on t.id=p.tenant_id and t.slug=$1 and t.status='active' and t.deleted_at is null where p.id=$2 and p.access_token_hash=$3 and p.status='active' and p.consent_status='granted' and p.expires_at>now() and p.deleted_at is null",
        [slug, accessId, digest(token)],
      )
    ).rows[0];
    if (!access) throw new NotFoundException('NOT_FOUND');
    const enrollment = (
      await this.pool.query(
        "select id,member_code,tier,joined_at from membership_enrollments where tenant_id=$1 and customer_id=$2 and enrollment_status='active' and deleted_at is null",
        [access.tenant_id, access.customer_id],
      )
    ).rows[0];
    if (!enrollment) throw new NotFoundException('NOT_FOUND');
    const benefits = await this.pool.query(
      "select b.id,b.title,b.description,coalesce(sum(l.quantity),0)::int balance from member_benefit_ledger l join store_benefits b on b.id=l.benefit_id and b.tenant_id=l.tenant_id and b.status='active' and b.deleted_at is null where l.tenant_id=$1 and l.enrollment_id=$2 and l.deleted_at is null group by b.id order by b.title",
      [access.tenant_id, enrollment.id],
    );
    return {
      memberCode: enrollment.member_code,
      tier: enrollment.tier,
      joinedAt: enrollment.joined_at,
      benefits: benefits.rows,
    };
  }

  async list(context: OrganizationContext) {
    const [enrollments, benefits] = await Promise.all([
      this.pool.query(
        'select e.id,e.member_code,e.enrollment_status,e.joined_at,c.display_name,s.name store_name from membership_enrollments e join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id left join stores s on s.id=e.store_id and s.tenant_id=e.tenant_id where e.tenant_id=$1 and e.deleted_at is null order by e.joined_at desc',
        [context.tenantId],
      ),
      this.pool.query(
        "select id,store_id,title,description from store_benefits where tenant_id=$1 and status='active' and deleted_at is null order by title",
        [context.tenantId],
      ),
    ]);
    return { enrollments: enrollments.rows, benefits: benefits.rows };
  }
  async benefits(context: OrganizationContext) {
    return (
      await this.pool.query(
        "select id,title,description from store_benefits where tenant_id=$1 and status='active' and deleted_at is null order by title",
        [context.tenantId],
      )
    ).rows;
  }
  async grant(
    context: OrganizationContext,
    enrollmentId: string,
    body: Record<string, unknown>,
    key: string,
  ) {
    if (!key.trim() || !Number.isInteger(body.quantity) || Number(body.quantity) < 1)
      throw new BadRequestException('VALIDATION_ERROR');
    return this.change(
      context,
      enrollmentId,
      String(body.benefitId),
      Number(body.quantity),
      `grant:${key}`,
    );
  }
  async redeem(context: OrganizationContext, body: Record<string, unknown>, key: string) {
    const code = String(body.memberCode ?? '').toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(code) || !key.trim())
      throw new BadRequestException('VALIDATION_ERROR');
    const enrollment = (
      await this.pool.query(
        "select id from membership_enrollments where tenant_id=$1 and member_code=$2 and enrollment_status='active' and deleted_at is null",
        [context.tenantId, code],
      )
    ).rows[0];
    if (!enrollment) throw new NotFoundException('NOT_FOUND');
    return this.change(context, enrollment.id, String(body.benefitId), -1, `redeem:${key}`);
  }
  private async change(
    context: OrganizationContext,
    enrollmentId: string,
    benefitId: string,
    quantity: number,
    reference: string,
  ) {
    if (!UUID.test(enrollmentId) || !UUID.test(benefitId))
      throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const enrollment = (
        await client.query(
          "select store_id from membership_enrollments where id=$1 and tenant_id=$2 and enrollment_status='active' and deleted_at is null for update",
          [enrollmentId, context.tenantId],
        )
      ).rows[0];
      const benefit = (
        await client.query(
          "select id from store_benefits where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
          [benefitId, context.tenantId],
        )
      ).rows[0];
      if (!enrollment || !benefit) throw new NotFoundException('NOT_FOUND');
      const old = (
        await client.query(
          'select id,balance_after from member_benefit_ledger where tenant_id=$1 and business_reference=$2',
          [context.tenantId, reference],
        )
      ).rows[0];
      if (old) {
        await client.query('commit');
        return old;
      }
      const balance = Number(
        (
          await client.query(
            'select coalesce(sum(quantity),0) value from member_benefit_ledger where tenant_id=$1 and enrollment_id=$2 and benefit_id=$3 and deleted_at is null',
            [context.tenantId, enrollmentId, benefitId],
          )
        ).rows[0].value,
      );
      if (quantity < 0 && balance < 1) throw new ConflictException('INSUFFICIENT_BENEFIT');
      const data = (
        await client.query(
          'insert into member_benefit_ledger(id,tenant_id,enrollment_id,benefit_id,store_id,entry_type,quantity,balance_after,business_reference,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning id,balance_after',
          [
            randomUUID(),
            context.tenantId,
            enrollmentId,
            benefitId,
            enrollment.store_id,
            quantity > 0 ? 'grant' : 'redeem',
            quantity,
            balance + quantity,
            reference,
            context.userId,
          ],
        )
      ).rows[0];
      await this.receipt(
        client,
        context.tenantId,
        context.userId,
        quantity > 0 ? 'membership.benefit_granted' : 'membership.benefit_redeemed',
        quantity > 0 ? 'membership.benefit.granted.v1' : 'membership.benefit.redeemed.v1',
        enrollmentId,
        { ...data, benefitId },
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
  private async receipt(
    client: PoolClient,
    tenantId: string,
    actorId: string | null,
    action: string,
    event: string,
    id: string,
    details: unknown,
  ) {
    const correlation = randomUUID(),
      trace = randomUUID();
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'membership_enrollment',$5,$6,$7,$8,$3,$3)",
      [randomUUID(), tenantId, actorId, action, id, correlation, trace, details],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'membership_enrollment',$4,$5,$6,$7,$8,$8)",
      [randomUUID(), tenantId, event, id, details, correlation, trace, actorId],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
