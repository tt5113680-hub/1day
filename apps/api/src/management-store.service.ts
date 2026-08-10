import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import { DataScopeService } from './data-scope.service';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const platformTypes = new Set(['meituan', 'douyin', 'external']);
const optionalText = (value: unknown, limit: number) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > limit)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim() || null;
};
const httpsUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('VALIDATION_ERROR');
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw new Error('unsafe');
    return parsed.toString();
  } catch {
    throw new BadRequestException('VALIDATION_ERROR');
  }
};
const coordinate = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};

@Injectable()
export class ManagementStoreService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  constructor(private readonly dataScopes: DataScopeService) {}
  async list(context: OrganizationContext) {
    const result = await this.pool.query(
      `select s.id,s.code,s.name,s.address,s.phone,s.business_hours,s.image_url,s.latitude,s.longitude,s.status,s.version,m.name merchant_name,
       coalesce(json_agg(distinct jsonb_build_object('id',e.id,'name',u.display_name)) filter(where e.id is not null),'[]'::json) managers,
       (select count(*)::int from store_services ss where ss.tenant_id=s.tenant_id and ss.store_id=s.id and ss.status='active' and ss.deleted_at is null) active_services,
       (select count(distinct entry_action_id)::int from (
          select sea.external_action_id as entry_action_id from store_external_actions sea where sea.tenant_id=s.tenant_id and sea.store_id=s.id and sea.enabled and sea.deleted_at is null
          union all
          select sb.external_action_id as entry_action_id from store_benefits sb where sb.tenant_id=s.tenant_id and sb.store_id=s.id and sb.external_action_id is not null and sb.status='active' and sb.deleted_at is null
        ) entries) entry_count,
       (select count(*)::int from consumer_action_events ce where ce.tenant_id=s.tenant_id and ce.store_id=s.id and ce.deleted_at is null and ce.created_at>=now()-interval '30 days') entry_opens_30d,
       (select count(*)::int from tasks t join employees te on te.id=t.assignee_employee_id and te.tenant_id=t.tenant_id and te.deleted_at is null where t.tenant_id=s.tenant_id and te.organization_id=s.organization_id and t.status in ('open','overdue') and t.deleted_at is null) open_tasks
       from stores s join merchants m on m.id=s.merchant_id and m.tenant_id=s.tenant_id
       left join store_managers sm on sm.store_id=s.id and sm.tenant_id=s.tenant_id and sm.status='active' and sm.deleted_at is null
       left join employees e on e.id=sm.employee_id and e.tenant_id=sm.tenant_id and e.status='active' and e.deleted_at is null
       left join memberships ms on ms.id=e.membership_id and ms.tenant_id=e.tenant_id and ms.status='active'
       left join users u on u.id=ms.user_id and u.status='active'
       where s.tenant_id=$1 and s.deleted_at is null
       group by s.id,m.name order by s.status='active' desc,s.code`,
      [context.tenantId],
    );
    const links = await this.pool.query(
      `select sea.id,sea.store_id,sea.description,sea.sort_order,sea.enabled,sea.version,
       a.name,a.target_url,a.platform from store_external_actions sea
       join external_actions a on a.id=sea.external_action_id and a.tenant_id=sea.tenant_id and a.deleted_at is null
       where sea.tenant_id=$1 and sea.deleted_at is null order by sea.sort_order,sea.created_at`,
      [context.tenantId],
    );
    const linksByStore = new Map<string, Record<string, unknown>[]>();
    for (const link of links.rows) {
      const values = linksByStore.get(link.store_id) ?? [];
      values.push({
        id: link.id,
        title: link.name,
        description: link.description,
        targetUrl: link.target_url,
        platformType: link.platform,
        enabled: link.enabled,
        sortOrder: link.sort_order,
        version: link.version,
      });
      linksByStore.set(link.store_id, values);
    }
    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address,
      status: row.status,
      version: row.version,
      merchantName: row.merchant_name,
      managers: row.managers,
      activeServices: row.active_services,
      entryCount: row.entry_count,
      entryOpens30d: row.entry_opens_30d,
      openTasks: row.open_tasks,
      commercial: {
        phone: row.phone,
        businessHours: row.business_hours,
        imageUrl: row.image_url,
        latitude: row.latitude === null ? null : Number(row.latitude),
        longitude: row.longitude === null ? null : Number(row.longitude),
      },
      externalLinks: linksByStore.get(row.id) ?? [],
    }));
  }

  async updateCommercial(
    context: OrganizationContext,
    storeId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(storeId)) throw new BadRequestException('VALIDATION_ERROR');
    const phone = optionalText(body.phone, 48);
    const businessHours = optionalText(body.businessHours, 240);
    const imageUrl =
      body.imageUrl === undefined || body.imageUrl === null || body.imageUrl === ''
        ? null
        : httpsUrl(body.imageUrl);
    const latitude = coordinate(body.latitude),
      longitude = coordinate(body.longitude);
    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null &&
        (latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180))
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `update stores set phone=$1,business_hours=$2,image_url=$3,latitude=$4,longitude=$5,updated_at=now(),updated_by=$6,version=version+1
       where id=$7 and tenant_id=$8 and deleted_at is null returning id,phone,business_hours,image_url,latitude,longitude,version`,
      [
        phone,
        businessHours,
        imageUrl,
        latitude,
        longitude,
        context.userId,
        storeId,
        context.tenantId,
      ],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
    await this.auditCommercial(
      context,
      'store.commercial_updated',
      storeId,
      requestId,
      result.rows[0],
    );
    return result.rows[0];
  }

  async createExternalLink(
    context: OrganizationContext,
    storeId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(storeId)) throw new BadRequestException('VALIDATION_ERROR');
    const input = this.linkInput(body);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const store = await client.query(
        'select id from stores where id=$1 and tenant_id=$2 and deleted_at is null',
        [storeId, context.tenantId],
      );
      if (!store.rowCount) throw new NotFoundException('NOT_FOUND');
      const actionId = randomUUID(),
        linkId = randomUUID();
      await client.query(
        `insert into external_actions(id,tenant_id,code,name,action_type,target_url,platform,status,created_by,updated_by)
         values($1,$2,$3,$4,'link',$5,$6,'active',$7,$7)`,
        [
          actionId,
          context.tenantId,
          `store-link-${actionId}`,
          input.title,
          input.targetUrl,
          input.platformType,
          context.userId,
        ],
      );
      const row = (
        await client.query(
          `insert into store_external_actions(id,tenant_id,store_id,external_action_id,description,sort_order,enabled,created_by,updated_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$8) returning id,description,sort_order,enabled,version`,
          [
            linkId,
            context.tenantId,
            storeId,
            actionId,
            input.description,
            input.sortOrder,
            input.enabled,
            context.userId,
          ],
        )
      ).rows[0];
      await client.query('commit');
      await this.auditCommercial(context, 'store.external_link_created', linkId, requestId, {
        storeId,
        ...input,
      });
      return {
        id: row.id,
        title: input.title,
        description: row.description,
        targetUrl: input.targetUrl,
        platformType: input.platformType,
        enabled: row.enabled,
        sortOrder: row.sort_order,
        version: row.version,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateExternalLink(
    context: OrganizationContext,
    storeId: string,
    linkId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(storeId) || !UUID.test(linkId))
      throw new BadRequestException('VALIDATION_ERROR');
    const input = this.linkInput(body);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const link = (
        await client.query(
          `select sea.external_action_id from store_external_actions sea where sea.id=$1 and sea.store_id=$2 and sea.tenant_id=$3 and sea.deleted_at is null for update`,
          [linkId, storeId, context.tenantId],
        )
      ).rows[0];
      if (!link) throw new NotFoundException('NOT_FOUND');
      await client.query(
        'update external_actions set name=$1,target_url=$2,platform=$3,updated_at=now(),updated_by=$4,version=version+1 where id=$5 and tenant_id=$6',
        [
          input.title,
          input.targetUrl,
          input.platformType,
          context.userId,
          link.external_action_id,
          context.tenantId,
        ],
      );
      const row = (
        await client.query(
          `update store_external_actions set description=$1,sort_order=$2,enabled=$3,updated_at=now(),updated_by=$4,version=version+1
         where id=$5 returning id,description,sort_order,enabled,version`,
          [input.description, input.sortOrder, input.enabled, context.userId, linkId],
        )
      ).rows[0];
      await client.query('commit');
      await this.auditCommercial(context, 'store.external_link_updated', linkId, requestId, {
        storeId,
        ...input,
      });
      return {
        id: row.id,
        title: input.title,
        description: row.description,
        targetUrl: input.targetUrl,
        platformType: input.platformType,
        enabled: row.enabled,
        sortOrder: row.sort_order,
        version: row.version,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private linkInput(body: Record<string, unknown>) {
    const platformType = optionalText(body.platformType, 32);
    if (!platformType || !platformTypes.has(platformType))
      throw new BadRequestException('VALIDATION_ERROR');
    const title = optionalText(body.title, 120);
    if (!title) throw new BadRequestException('VALIDATION_ERROR');
    const sortOrder: unknown = body.sortOrder === undefined ? 0 : body.sortOrder;
    if (
      typeof sortOrder !== 'number' ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 9999 ||
      typeof body.enabled !== 'boolean'
    )
      throw new BadRequestException('VALIDATION_ERROR');
    return {
      platformType,
      title,
      description: optionalText(body.description, 1000),
      targetUrl: httpsUrl(body.targetUrl),
      enabled: body.enabled,
      sortOrder: sortOrder as number,
    };
  }
  private async auditCommercial(
    context: OrganizationContext,
    action: string,
    resourceId: string,
    requestId: string,
    details: unknown,
  ) {
    await this.pool.query(
      `insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by)
       values($1,$2,$3,$4,'store_commercial',$5,$6,'commercial-ui-alignment',$7,$3,$3)`,
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        resourceId,
        UUID.test(requestId) ? requestId : randomUUID(),
        details,
      ],
    );
  }

  async assignManager(
    context: OrganizationContext,
    storeId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (
      !UUID.test(storeId) ||
      typeof body.employeeId !== 'string' ||
      !UUID.test(body.employeeId) ||
      !Number.isInteger(body.version)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const store = (
        await client.query(
          'select id,version from stores where id=$1 and tenant_id=$2 and deleted_at is null for update',
          [storeId, context.tenantId],
        )
      ).rows[0];
      if (!store) throw new NotFoundException('NOT_FOUND');
      if (store.version !== body.version) throw new ConflictException('CONFLICT');
      const employee = await client.query(
        "select id from employees where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
        [body.employeeId, context.tenantId],
      );
      if (employee.rowCount !== 1) throw new NotFoundException('NOT_FOUND');
      await client.query(
        "update store_managers set status='inactive',updated_at=now(),updated_by=$1,version=version+1 where store_id=$2 and tenant_id=$3 and status='active' and deleted_at is null",
        [context.userId, storeId, context.tenantId],
      );
      await client.query(
        "insert into store_managers(id,tenant_id,store_id,employee_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5) on conflict(store_id,employee_id) do update set status='active',deleted_at=null,updated_at=now(),updated_by=excluded.updated_by,version=store_managers.version+1",
        [randomUUID(), context.tenantId, storeId, body.employeeId, context.userId],
      );
      await this.dataScopes.syncStoreAssignment(client, {
        tenantId: context.tenantId,
        storeId,
        employeeId: body.employeeId,
        actorId: context.userId,
      });
      const updated = (
        await client.query(
          'update stores set version=version+1,updated_at=now(),updated_by=$1 where id=$2 returning version',
          [context.userId, storeId],
        )
      ).rows[0];
      const correlation = UUID.test(requestId) ? requestId : randomUUID();
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'store.manager_assigned','store',$4,$5,'page-m-007',$6,$3,$3)",
        [
          randomUUID(),
          context.tenantId,
          context.userId,
          storeId,
          correlation,
          { employeeId: body.employeeId },
        ],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'store.manager_assigned.v1','store',$3,$4,$5,'page-m-007',$6,$6)",
        [
          randomUUID(),
          context.tenantId,
          storeId,
          { employeeId: body.employeeId },
          correlation,
          context.userId,
        ],
      );
      await client.query('commit');
      return { storeId, employeeId: body.employeeId, version: updated.version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
