import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;
const requiredText = (value: unknown, max: number) => {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('VALIDATION_ERROR');
  const result = value.trim();
  if (result.length > max) throw new BadRequestException('VALIDATION_ERROR');
  return result;
};
const optionalText = (value: unknown, max: number) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim() || null;
};
const optionalNumeric = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};

const tokenFor = (...parts: (string | null | undefined)[]): string => {
  const hash = createHash('sha1')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 24);
  return hash;
};

/**
 * W∞-111 — 门店完整 CRUD + 三类触点二维码（MPC-02 / Phase2）。
 *
 * 诚实边界：门店 CRUD 是真实施工档案；三类触点二维码（商户码/门店码/员工码）只是
 * 「统一入口/门店/员工触点」的扫码分流入口编码（可归因到 L0–L2 entry_funnel_events），
 * **不含收款、不含支付、不代第三方成交、不含成交金额、不建自营订单**。
 */
@Injectable()
export class ManagementStoreDepthService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 160) throw new BadRequestException('VALIDATION_ERROR');
    const code = requiredText(body.code, 80);
    const name = requiredText(body.name, 160);
    const address = optionalText(body.address, 320);
    const phone = optionalText(body.phone, 48);
    const businessHours = optionalText(body.businessHours, 240);
    const latitude = optionalNumeric(body.latitude);
    const longitude = optionalNumeric(body.longitude);
    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null &&
        (latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180))
    )
      throw new BadRequestException('VALIDATION_ERROR');
    if (body.merchantId !== undefined && body.merchantId !== null) {
      if (!uuid.test(String(body.merchantId))) throw new BadRequestException('VALIDATION_ERROR');
    }
    const requestedMerchant = body.merchantId === undefined ? null : String(body.merchantId);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='store' and idempotency_key=$2 and deleted_at is null",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const merchant = await this.defaultMerchant(client, context.tenantId, requestedMerchant);
      const id = randomUUID();
      const created = await client.query(
        `insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,phone,business_hours,latitude,longitude,status,created_by,updated_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12,$12)
         on conflict (tenant_id,code) do update set deleted_at=null,status='active',updated_at=now(),updated_by=excluded.updated_by,version=stores.version+1
         returning id,code,name,status,version`,
        [
          id,
          context.tenantId,
          merchant.organizationId,
          merchant.id,
          code,
          name,
          address,
          phone,
          businessHours,
          latitude,
          longitude,
          context.userId,
        ],
      );
      const store = created.rows[0];
      const details = { code, name, merchantId: merchant.id };
      await this.audit(client, context, 'store.created', id, requestId, details);
      await this.outbox(client, context, 'store.created.v1', id, requestId, details);
      await client.query(
        "insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,'store',$3,$4,$5,$5)",
        [
          randomUUID(),
          context.tenantId,
          key,
          { id, code, name, status: 'active', version: store.version },
          context.userId,
        ],
      );
      await client.query('commit');
      return { id, code, name, merchantId: merchant.id, status: 'active', version: store.version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    context: OrganizationContext,
    storeId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!uuid.test(storeId)) throw new BadRequestException('VALIDATION_ERROR');
    if (body.version !== undefined && !Number.isInteger(body.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const name = requiredText(body.name, 160);
    const address = optionalText(body.address, 320);
    const phone = optionalText(body.phone, 48);
    const businessHours = optionalText(body.businessHours, 240);
    const latitude = optionalNumeric(body.latitude);
    const longitude = optionalNumeric(body.longitude);
    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null &&
        (latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180))
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const status = optionalText(body.status, 32) ?? 'active';
    if (!['active', 'inactive'].includes(status)) throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const current = (
        await client.query(
          'select version from stores where id=$1 and tenant_id=$2 and deleted_at is null for update',
          [storeId, context.tenantId],
        )
      ).rows[0];
      if (!current) throw new NotFoundException('NOT_FOUND');
      if (body.version !== undefined && Number(body.version) !== current.version)
        throw new ConflictException('CONFLICT');
      const updated = await client.query(
        `update stores set name=$1,address=$2,phone=$3,business_hours=$4,latitude=$5,longitude=$6,status=$7,
           updated_at=now(),updated_by=$8,version=version+1
         where id=$9 and tenant_id=$10 and deleted_at is null returning id,code,name,status,version`,
        [
          name,
          address,
          phone,
          businessHours,
          latitude,
          longitude,
          status,
          context.userId,
          storeId,
          context.tenantId,
        ],
      );
      if (!updated.rowCount) throw new NotFoundException('NOT_FOUND');
      const store = updated.rows[0];
      const details = { name, status, address };
      await this.audit(client, context, 'store.updated', storeId, requestId, details);
      await this.outbox(client, context, 'store.updated.v1', storeId, requestId, details);
      await client.query('commit');
      return {
        id: store.id,
        code: store.code,
        name: store.name,
        status: store.status,
        version: store.version,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * W∞-138 — 门店营业状态批量（MPC-02 / §2 densify）：对租户内多个门店批量置 营业中/已停用。
   * 幂等（idempotency_keys）+ 单事务 + 单条 audit + 每条 outbox；仅登记营业状态，不碰价格/成交。
   */
  async batchStatus(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 160) throw new BadRequestException('VALIDATION_ERROR');
    const rawIds = body.storeIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 200)
      throw new BadRequestException('VALIDATION_ERROR');
    const status = optionalText(body.status, 32) ?? '';
    if (!['active', 'inactive'].includes(status)) throw new BadRequestException('VALIDATION_ERROR');
    const storeIds = rawIds.map((id) => {
      if (typeof id !== 'string' || !uuid.test(id))
        throw new BadRequestException('VALIDATION_ERROR');
      return id;
    });
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='store_batch_status' and idempotency_key=$2 and deleted_at is null",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const updated = await client.query(
        `update stores set status=$1, updated_at=now(), updated_by=$2, version=version+1
         where tenant_id=$3 and id = any($4::uuid[]) and deleted_at is null
         returning id, code, name, status, version`,
        [status, context.userId, context.tenantId, storeIds],
      );
      const rows = updated.rows as {
        id: string;
        code: string;
        name: string;
        status: string;
        version: number;
      }[];
      const details = {
        status,
        count: rows.length,
        storeIds: rows.map((row) => row.id),
        names: rows.map((row) => row.name),
      };
      await this.audit(
        client,
        context,
        `store.batch_status_${status}`,
        rows[0]?.id ?? randomUUID(),
        requestId,
        details,
      );
      for (const row of rows) {
        await this.outbox(client, context, `store.batch_status_${status}.v1`, row.id, requestId, {
          status,
        });
      }
      await client.query(
        "insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,'store_batch_status',$3,$4,$5,$5)",
        [
          randomUUID(),
          context.tenantId,
          key,
          { status, effected: rows.length, stores: rows },
          context.userId,
        ],
      );
      await client.query('commit');
      return {
        status,
        effected: rows.length,
        stores: rows,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(context: OrganizationContext, storeId: string, requestId: string) {
    if (!uuid.test(storeId)) throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `update stores set deleted_at=now(),status='inactive',updated_at=now(),updated_by=$1,version=version+1
       where id=$2 and tenant_id=$3 and deleted_at is null returning id,name,version`,
      [context.userId, storeId, context.tenantId],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
    const details = { id: storeId, name: result.rows[0].name };
    await this.audit(this.pool, context, 'store.deleted', storeId, requestId, details);
    await this.outbox(this.pool, context, 'store.deleted.v1', storeId, requestId, details);
    return { id: storeId, deleted: true };
  }

  /** 三类触点二维码：商户码 / 门店码 / 员工码（可扫码归因到入口痕迹）。 */
  async qrCodes(context: OrganizationContext, storeId: string, storeIds: string[] | null = null) {
    if (!uuid.test(storeId)) throw new BadRequestException('VALIDATION_ERROR');
    if (storeIds && !storeIds.includes(storeId)) throw new NotFoundException('NOT_FOUND');
    const store = (
      await this.pool.query(
        'select s.id,s.code,s.name,s.merchant_id,m.name merchant_name from stores s join merchants m on m.id=s.merchant_id and m.tenant_id=s.tenant_id where s.id=$1 and s.tenant_id=$2 and s.deleted_at is null',
        [storeId, context.tenantId],
      )
    ).rows[0];
    if (!store) throw new NotFoundException('NOT_FOUND');
    const managers = await this.pool.query(
      `select e.id,u.display_name from store_managers sm
       join employees e on e.id=sm.employee_id and e.tenant_id=sm.tenant_id and e.status='active' and e.deleted_at is null
       join memberships ms on ms.id=e.membership_id and ms.tenant_id=e.tenant_id and ms.status='active'
       join users u on u.id=ms.user_id and u.status='active'
       where sm.store_id=$1 and sm.tenant_id=$2 and sm.status='active' and sm.deleted_at is null`,
      [storeId, context.tenantId],
    );
    const entries = [
      {
        contactType: 'merchant',
        groupBy: `merchant:${store.merchant_id}`,
        label: `商户码 · ${store.merchant_name ?? ''}`.trim(),
        targetPath: `/c/entry?surface=merchant-qr&mid=${store.merchant_id}&sid=${storeId}`,
      },
      {
        contactType: 'store',
        groupBy: `store:${storeId}`,
        label: `门店码 · ${store.name}`.trim(),
        targetPath: `/c/stores/${storeId}?surface=store-qr`,
      },
      {
        contactType: 'employee',
        groupBy: managers.rows.length
          ? managers.rows.map((row) => row.id).join(',')
          : `staff:${storeId}`,
        label: managers.rows.length
          ? `员工码 · ${managers.rows.map((row) => row.display_name).join('、')}`.trim()
          : `员工码 · ${store.name} 门店员工`.trim(),
        targetPath: managers.rows.length
          ? `/c/entry?surface=employee-qr&sid=${storeId}&eid=${managers.rows[0].id}`
          : `/c/entry?surface=employee-qr&sid=${storeId}`,
      },
    ];
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const upserted: Record<string, unknown>[] = [];
      for (const entry of entries) {
        const token = tokenFor(context.tenantId, storeId, entry.contactType, store.code);
        const created = await client.query(
          `insert into store_contact_qr_codes(id,tenant_id,store_id,merchant_id,contact_type,group_by,token,label,target_path,created_by,updated_by)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
           on conflict (tenant_id,store_id,contact_type)
           do update set merchant_id=excluded.merchant_id,group_by=excluded.group_by,token=excluded.token,
             label=excluded.label,target_path=excluded.target_path,deleted_at=null,
             updated_at=now(),updated_by=excluded.updated_by,version=store_contact_qr_codes.version+1
           returning id,contact_type,token,label,target_path,group_by,scan_count,version`,
          [
            randomUUID(),
            context.tenantId,
            storeId,
            store.merchant_id,
            entry.contactType,
            entry.groupBy,
            token,
            entry.label,
            entry.targetPath,
            context.userId,
          ],
        );
        upserted.push(created.rows[0]);
      }
      await client.query('commit');
      return {
        storeId,
        storeName: store.name,
        merchantName: store.merchant_name,
        contacts: upserted.map((row) => ({
          contactType: row.contact_type,
          label: row.label,
          token: row.token,
          targetPath: row.target_path,
          groupBy: row.group_by,
          scanCount: Number(row.scan_count),
          version: Number(row.version),
        })),
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async defaultMerchant(
    client: PoolClient,
    tenantId: string,
    requested: string | null,
  ): Promise<{ id: string; organizationId: string }> {
    const row = requested
      ? (
          await client.query(
            `select id, organization_id
             from merchants
             where id=$1 and tenant_id=$2 and deleted_at is null and status='active'
               and organization_id is not null`,
            [requested, tenantId],
          )
        ).rows[0]
      : (
          await client.query(
            `select id, organization_id
             from merchants
             where tenant_id=$1 and deleted_at is null and status='active'
               and organization_id is not null
             order by created_at desc
             limit 1`,
            [tenantId],
          )
        ).rows[0];
    if (!row?.organization_id) throw new NotFoundException('NOT_FOUND');
    return { id: row.id, organizationId: String(row.organization_id) };
  }

  private async audit(
    client: Pool | PoolClient,
    context: OrganizationContext,
    action: string,
    resourceId: string,
    requestId: string,
    details: unknown,
  ) {
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'store',$5,$6,'page-m-007',$7,$3,$3)",
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        resourceId,
        uuid.test(requestId) ? requestId : randomUUID(),
        details,
      ],
    );
  }

  private async outbox(
    client: Pool | PoolClient,
    context: OrganizationContext,
    eventType: string,
    aggregateId: string,
    requestId: string,
    payload: unknown,
  ) {
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'store',$4,$5,$6,'page-m-007',$7,$7)",
      [
        randomUUID(),
        context.tenantId,
        eventType,
        aggregateId,
        payload,
        uuid.test(requestId) ? requestId : randomUUID(),
        context.userId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
