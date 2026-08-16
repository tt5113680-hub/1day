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
import { DataScopeService } from './data-scope.service';
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
  constructor(private readonly dataScopes: DataScopeService) {}

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

  /**
   * Cross-device Member resume: existing enrollment + phone + memberCode + consent
   * issues a new profile access and retires prior granted tokens for that customer.
   * No SMS OTP in this phase (honest local proof).
   */
  async resume(slug: string, body: Record<string, unknown>, key: string) {
    if (
      !SLUG.test(slug) ||
      !UUID.test(String(body.storeId)) ||
      body.consent !== true ||
      !key.trim()
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const phone = mobile(body.phone);
    const code = String(body.memberCode ?? '')
      .trim()
      .toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(code)) throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
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
        "select response from idempotency_keys where tenant_id=$1 and resource_type='membership_resume' and idempotency_key=$2 and deleted_at is null",
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
      const identity = (
        await client.query(
          "select customer_id from customer_identities where tenant_id=$1 and identity_type='phone' and identity_value_hash=$2 and status='active' and deleted_at is null",
          [tenant.id, identityHash],
        )
      ).rows[0];
      if (!identity) throw new NotFoundException('NOT_FOUND');
      const enrollment = (
        await client.query(
          "select id,member_code from membership_enrollments where tenant_id=$1 and customer_id=$2 and member_code=$3 and enrollment_status='active' and deleted_at is null for update",
          [tenant.id, identity.customer_id, code],
        )
      ).rows[0];
      if (!enrollment) throw new NotFoundException('NOT_FOUND');
      await client.query(
        'update membership_enrollments set store_id=$1,updated_at=now(),version=version+1 where id=$2 and tenant_id=$3',
        [store.id, enrollment.id, tenant.id],
      );
      await client.query(
        "update consumer_profile_accesses set status='revoked',consent_status='revoked',revoked_at=now(),updated_at=now(),version=version+1 where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null",
        [tenant.id, identity.customer_id],
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
        resumed: true as const,
      };
      await this.receipt(
        client,
        tenant.id,
        null,
        'membership.resumed',
        'membership.resumed.v1',
        enrollment.id,
        data,
      );
      await client.query(
        "insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,'membership_resume',$3,$4,null,null)",
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

  async list(context: OrganizationContext, storeIds: string[] | null = null) {
    const scoped = storeIds !== null;
    const params = scoped ? [context.tenantId, storeIds] : [context.tenantId];
    const enrollmentFilter = scoped ? 'and e.store_id = any($2::uuid[])' : '';
    const benefitFilter = scoped ? 'and store_id = any($2::uuid[])' : '';
    const [enrollments, benefits] = await Promise.all([
      this.pool.query(
        `select e.id,e.member_code,e.enrollment_status,e.joined_at,e.tier,e.expires_at,e.last_active_at,c.display_name,s.name store_name
         from membership_enrollments e
         join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id
         left join stores s on s.id=e.store_id and s.tenant_id=e.tenant_id
         where e.tenant_id=$1 and e.deleted_at is null ${enrollmentFilter}
         order by e.joined_at desc`,
        params,
      ),
      this.pool.query(
        `select id,store_id,title,description from store_benefits
         where tenant_id=$1 and status='active' and deleted_at is null ${benefitFilter}
         order by title`,
        params,
      ),
    ]);
    return { enrollments: enrollments.rows, benefits: benefits.rows };
  }

  async enrollmentStoreId(tenantId: string, enrollmentId: string) {
    if (!UUID.test(enrollmentId)) return null;
    const row = (
      await this.pool.query(
        'select store_id from membership_enrollments where id=$1 and tenant_id=$2 and deleted_at is null',
        [enrollmentId, tenantId],
      )
    ).rows[0];
    return row?.store_id ? String(row.store_id) : null;
  }
  async benefits(context: OrganizationContext) {
    return (
      await this.pool.query(
        "select id,title,description from store_benefits where tenant_id=$1 and status='active' and deleted_at is null order by title",
        [context.tenantId],
      )
    ).rows;
  }
  /** Employee-scoped member redeem overview: enrollments + benefits + ledger rows. */
  async employeeOverview(context: OrganizationContext) {
    const scopes = await this.dataScopes.resolveStoreScopes(context.tenantId, context.userId);
    const permissions = await this.dataScopes.permissionCodes(context.tenantId, context.userId);
    const owner = permissions.includes('tenant.manage');
    const storeScoped = !owner && scopes.length > 0;
    const storeIds = storeScoped ? scopes.map((scope) => scope.id) : null;
    const storeFilter = storeScoped ? ' and s.id = any($2::uuid[])' : '';
    const ledgerStoreFilter = storeScoped ? ' and l.store_id = any($2::uuid[])' : '';
    const params = storeScoped ? [context.tenantId, storeIds] : [context.tenantId];
    const [ledger, enrollments, benefitDefs] = await Promise.all([
      this.pool.query(
        `select l.id,l.entry_type,l.quantity,l.balance_after,l.business_reference,l.created_at,
                l.store_id, b.title as benefit_title, s.name as store_name,
                e.member_code, c.display_name
         from member_benefit_ledger l
         join store_benefits b on b.id = l.benefit_id and b.tenant_id = l.tenant_id
         left join stores s on s.id = l.store_id and s.tenant_id = l.tenant_id
         left join membership_enrollments e on e.id = l.enrollment_id and e.tenant_id = l.tenant_id
         left join customers c on c.id = e.customer_id and c.tenant_id = e.tenant_id
         where l.tenant_id = $1 and l.deleted_at is null ${ledgerStoreFilter}
         order by l.created_at desc, l.id desc
         limit 200`,
        params,
      ),
      this.pool.query(
        `select e.id,e.member_code,e.enrollment_status,e.joined_at,e.source,
                c.display_name, s.name as store_name
         from membership_enrollments e
         join customers c on c.id = e.customer_id and c.tenant_id = e.tenant_id
         left join stores s on s.id = e.store_id and s.tenant_id = e.tenant_id
         where e.tenant_id = $1 and e.deleted_at is null ${storeFilter}
         order by e.joined_at desc
         limit 200`,
        params,
      ),
      this.pool.query(
        "select id,title from store_benefits where tenant_id=$1 and status='active' and deleted_at is null order by title limit 200",
        [context.tenantId],
      ),
    ]);
    return {
      storeScoped,
      ledger: ledger.rows,
      enrollments: enrollments.rows,
      benefits: benefitDefs.rows,
    };
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

  /**
   * W∞-135 — §2 会员 densify：批量发放同一权益到多条在册会员（最多 50）。
   * 每条仍走 ledger + audit；不含储值/支付。幂等键覆盖整批结果。
   */
  async batchGrant(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    storeIds: string[] | null,
    permissionCodes: string[],
  ) {
    if (!key.trim() || key.length > 160) throw new BadRequestException('VALIDATION_ERROR');
    const benefitId = String(body.benefitId ?? '');
    if (!UUID.test(benefitId)) throw new BadRequestException('VALIDATION_ERROR');
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
      throw new BadRequestException('VALIDATION_ERROR');
    if (!Array.isArray(body.enrollmentIds) || body.enrollmentIds.length < 1)
      throw new BadRequestException('VALIDATION_ERROR');
    if (body.enrollmentIds.length > 50) throw new BadRequestException('VALIDATION_ERROR');
    const enrollmentIds = [
      ...new Set(
        body.enrollmentIds.map((id) => String(id)).filter((id) => UUID.test(id)),
      ),
    ];
    if (enrollmentIds.length !== body.enrollmentIds.length)
      throw new BadRequestException('VALIDATION_ERROR');

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='membership_batch_grant' and idempotency_key=$2 and deleted_at is null",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response as Record<string, unknown>;
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }

    const granted: { enrollmentId: string; ledgerId: string }[] = [];
    const skipped: { enrollmentId: string; reason: string }[] = [];
    for (const enrollmentId of enrollmentIds) {
      const storeId = await this.enrollmentStoreId(context.tenantId, enrollmentId);
      if (!storeId) {
        skipped.push({ enrollmentId, reason: 'NOT_FOUND' });
        continue;
      }
      if (storeIds !== null && !storeIds.includes(storeId)) {
        skipped.push({ enrollmentId, reason: 'OUT_OF_SCOPE' });
        continue;
      }
      try {
        await this.dataScopes.requireStoreWriteScope(
          context.tenantId,
          context.userId,
          storeId,
          permissionCodes,
        );
        const row = (await this.change(
          context,
          enrollmentId,
          benefitId,
          quantity,
          `grant:${key}:${enrollmentId}`,
        )) as { id: string };
        granted.push({ enrollmentId, ledgerId: String(row.id) });
      } catch {
        skipped.push({ enrollmentId, reason: 'GRANT_FAILED' });
      }
    }

    const response = {
      benefitId,
      quantity,
      grantedCount: granted.length,
      skippedCount: skipped.length,
      granted,
      skipped,
      disclaimer: '批量发放仅为本地权益 ledger 痕迹；不含储值/支付/GMV。',
    };

    const save = await this.pool.connect();
    try {
      await save.query('begin');
      await save.query(
        "insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,'membership_batch_grant',$3,$4,$5,$5) on conflict do nothing",
        [randomUUID(), context.tenantId, key, response, context.userId],
      );
      await save.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'membership.benefit_batch_granted','membership_batch',$4,$5,$6,$7,$3,$3)",
        [
          randomUUID(),
          context.tenantId,
          context.userId,
          benefitId,
          randomUUID(),
          randomUUID(),
          response,
        ],
      );
      await save.query('commit');
    } catch (error) {
      await save.query('rollback');
      throw error;
    } finally {
      save.release();
    }
    return response;
  }

  async revoke(
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
      -Number(body.quantity),
      `revoke:${key}`,
    );
  }
  async ledger(context: OrganizationContext, enrollmentId: string, storeIds: string[] | null) {
    if (!UUID.test(enrollmentId)) throw new BadRequestException('VALIDATION_ERROR');
    const enrollment = (
      await this.pool.query(
        `select e.id,e.member_code,e.store_id,c.display_name
         from membership_enrollments e
         join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id
         where e.id=$1 and e.tenant_id=$2 and e.deleted_at is null`,
        [enrollmentId, context.tenantId],
      )
    ).rows[0];
    if (!enrollment) throw new NotFoundException('NOT_FOUND');
    if (storeIds !== null && !storeIds.includes(String(enrollment.store_id)))
      throw new NotFoundException('NOT_FOUND');
    const entries = (
      await this.pool.query(
        `select l.id,l.benefit_id,b.title benefit_title,l.entry_type,l.quantity,l.balance_after,
                l.business_reference,l.created_at
         from member_benefit_ledger l
         join store_benefits b on b.id=l.benefit_id and b.tenant_id=l.tenant_id
         where l.tenant_id=$1 and l.enrollment_id=$2 and l.deleted_at is null
         order by l.created_at desc, l.id desc
         limit 100`,
        [context.tenantId, enrollmentId],
      )
    ).rows;
    const balances = (
      await this.pool.query(
        `select b.id benefit_id,b.title,coalesce(sum(l.quantity),0)::int balance
         from store_benefits b
         left join member_benefit_ledger l
           on l.benefit_id=b.id and l.tenant_id=b.tenant_id and l.enrollment_id=$2 and l.deleted_at is null
         where b.tenant_id=$1 and b.store_id=$3 and b.status='active' and b.deleted_at is null
         group by b.id
         having coalesce(sum(l.quantity),0) <> 0 or b.id in (
           select benefit_id from member_benefit_ledger
           where tenant_id=$1 and enrollment_id=$2 and deleted_at is null
         )
         order by b.title`,
        [context.tenantId, enrollmentId, enrollment.store_id],
      )
    ).rows;
    return {
      enrollment: {
        id: enrollment.id,
        memberCode: enrollment.member_code,
        displayName: enrollment.display_name,
      },
      balances,
      entries,
    };
  }
  async redeem(context: OrganizationContext, body: Record<string, unknown>, key: string) {
    const code = String(body.memberCode ?? '').toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(code) || !key.trim())
      throw new BadRequestException('VALIDATION_ERROR');
    const enrollment = (
      await this.pool.query(
        "select id, store_id from membership_enrollments where tenant_id=$1 and member_code=$2 and enrollment_status='active' and deleted_at is null",
        [context.tenantId, code],
      )
    ).rows[0];
    if (!enrollment) throw new NotFoundException('NOT_FOUND');
    const permissionCodes = await this.dataScopes.permissionCodes(context.tenantId, context.userId);
    await this.dataScopes.requireStoreWriteScope(
      context.tenantId,
      context.userId,
      enrollment.store_id,
      permissionCodes,
    );
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
      if (quantity < 0 && balance < Math.abs(quantity))
        throw new ConflictException('INSUFFICIENT_BENEFIT');
      const entryType =
        quantity > 0 ? 'grant' : reference.startsWith('revoke:') ? 'revoke' : 'redeem';
      const data = (
        await client.query(
          'insert into member_benefit_ledger(id,tenant_id,enrollment_id,benefit_id,store_id,entry_type,quantity,balance_after,business_reference,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning id,balance_after,entry_type,quantity',
          [
            randomUUID(),
            context.tenantId,
            enrollmentId,
            benefitId,
            enrollment.store_id,
            entryType,
            quantity,
            balance + quantity,
            reference,
            context.userId,
          ],
        )
      ).rows[0];
      const auditAction =
        entryType === 'grant'
          ? 'membership.benefit_granted'
          : entryType === 'revoke'
            ? 'membership.benefit_revoked'
            : 'membership.benefit_redeemed';
      const eventType =
        entryType === 'grant'
          ? 'membership.benefit.granted.v1'
          : entryType === 'revoke'
            ? 'membership.benefit.revoked.v1'
            : 'membership.benefit.redeemed.v1';
      if (entryType === 'redeem') {
        await client.query(
          'update membership_enrollments set last_active_at=now(),updated_at=now(),version=version+1 where id=$1 and tenant_id=$2',
          [enrollmentId, context.tenantId],
        );
      }
      await this.receipt(
        client,
        context.tenantId,
        context.userId,
        auditAction,
        eventType,
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
