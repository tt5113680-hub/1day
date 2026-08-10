import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import { AttributionService } from './attribution.service';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;
const text = (value: unknown, max: number) =>
  value === undefined || value === ''
    ? null
    : typeof value === 'string' && value.trim().length <= max
      ? value.trim()
      : (() => {
          throw new BadRequestException('VALIDATION_ERROR');
        })();

@Injectable()
export class ManagementCustomerAssetsService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  constructor(private readonly attribution: AttributionService) {}

  async list(context: OrganizationContext, query: Record<string, unknown>) {
    const search = text(query.search, 160),
      tag = text(query.tag, 80),
      segment = text(query.segment, 32),
      owner = text(query.owner, 36),
      source = text(query.source, 80);
    if (owner && !uuid.test(owner)) throw new BadRequestException('VALIDATION_ERROR');
    const rows = await this.pool.query(
      `select c.id,c.display_name,c.version,coalesce(o.employee_id::text,'') owner_id,coalesce(u.display_name,'未分配') owner_name,
       coalesce(n.segment,'active') segment,coalesce(array_agg(distinct t.label) filter(where t.label is not null), '{}') tags,
       coalesce((select count(*) from customer_orders x where x.tenant_id=c.tenant_id and x.customer_id=c.id and x.status='active' and x.deleted_at is null),0)::int orders
       from customers c left join customer_ownerships o on o.tenant_id=c.tenant_id and o.customer_id=c.id and o.ownership_role='owner' and o.status='active' and o.deleted_at is null
       left join employees e on e.id=o.employee_id and e.tenant_id=c.tenant_id left join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id left join users u on u.id=m.user_id
       left join employee_nurture_profiles n on n.tenant_id=c.tenant_id and n.customer_id=c.id and n.status='active' and n.deleted_at is null
       left join customer_tags t on t.tenant_id=c.tenant_id and t.customer_id=c.id and t.deleted_at is null
       where c.tenant_id=$1 and c.status='active' and c.deleted_at is null and ($2::text is null or c.display_name ilike '%'||$2||'%')
       and ($3::text is null or t.label=$3) and ($4::text is null or n.segment=$4) and ($5::uuid is null or o.employee_id=$5) and ($6::text is null or exists(select 1 from customer_sources s where s.tenant_id=c.tenant_id and s.customer_id=c.id and s.source_type=$6 and s.status='active' and s.deleted_at is null))
       group by c.id,c.display_name,c.version,o.employee_id,u.display_name,n.segment order by c.updated_at desc limit 200`,
      [context.tenantId, search, tag, segment, owner, source],
    );
    return rows.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      version: row.version,
      owner: { id: row.owner_id || null, name: row.owner_name },
      segment: row.segment,
      tags: row.tags,
      orders: row.orders,
    }));
  }

  async detail(context: OrganizationContext, id: string) {
    if (!uuid.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const customer = await this.pool.query(
      `select c.id,c.display_name,c.status,c.version,c.merged_into_id,c.created_at,coalesce(n.segment,'active') segment,n.next_touch_at
       from customers c left join employee_nurture_profiles n on n.tenant_id=c.tenant_id and n.customer_id=c.id and n.status='active' and n.deleted_at is null
       where c.id=$1 and c.tenant_id=$2 and c.deleted_at is null`,
      [id, context.tenantId],
    );
    if (!customer.rowCount) throw new NotFoundException('NOT_FOUND');
    const [identities, tags, sources, ownerships, transfers, contributions, orders, tasks, audits] =
      await Promise.all([
        this.pool.query(
          "select identity_type,masked_value,status from customer_identities where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null order by created_at",
          [context.tenantId, id],
        ),
        this.pool.query(
          'select label,created_at from customer_tags where tenant_id=$1 and customer_id=$2 and deleted_at is null order by label',
          [context.tenantId, id],
        ),
        this.pool.query(
          'select source_role,source_type,source_id,status,created_at from customer_sources where tenant_id=$1 and customer_id=$2 and deleted_at is null order by created_at desc',
          [context.tenantId, id],
        ),
        this.pool.query(
          `select o.ownership_role,o.status,o.version,o.created_at,coalesce(u.display_name,'Unknown employee') employee_name
           from customer_ownerships o left join employees e on e.id=o.employee_id and e.tenant_id=o.tenant_id
           left join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id left join users u on u.id=m.user_id
           where o.tenant_id=$1 and o.customer_id=$2 and o.deleted_at is null order by o.created_at desc`,
          [context.tenantId, id],
        ),
        this.pool.query(
          `select a.id,a.reason,a.status,a.version,a.created_at,coalesce(from_user.display_name,'Unassigned') from_name,coalesce(to_user.display_name,'Unknown employee') to_name
           from customer_ownership_transfer_approvals a
           left join employees from_employee on from_employee.id=a.from_employee_id and from_employee.tenant_id=a.tenant_id
           left join memberships from_member on from_member.id=from_employee.membership_id and from_member.tenant_id=from_employee.tenant_id
           left join users from_user on from_user.id=from_member.user_id
           left join employees to_employee on to_employee.id=a.to_employee_id and to_employee.tenant_id=a.tenant_id
           left join memberships to_member on to_member.id=to_employee.membership_id and to_member.tenant_id=to_employee.tenant_id
           left join users to_user on to_user.id=to_member.user_id
           where a.tenant_id=$1 and a.customer_id=$2 and a.deleted_at is null order by a.created_at desc`,
          [context.tenantId, id],
        ),
        this.pool.query(
          `select c.contribution_role,c.confirmed,c.status,c.created_at,coalesce(u.display_name,'Unknown employee') employee_name
           from customer_contributions c left join employees e on e.id=c.employee_id and e.tenant_id=c.tenant_id
           left join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id left join users u on u.id=m.user_id
           where c.tenant_id=$1 and c.customer_id=$2 and c.deleted_at is null order by c.created_at desc`,
          [context.tenantId, id],
        ),
        this.pool.query(
          `select o.order_number,o.occurred_at,o.status,o.version,
            (select count(*)::int from evidence_files f where f.tenant_id=o.tenant_id and f.order_id=o.id and f.status='active' and f.deleted_at is null) evidence_count,
            (select count(*)::int from connector_results r where r.tenant_id=o.tenant_id and r.order_id=o.id and r.status='received' and r.deleted_at is null) connector_count
           from customer_orders o where o.tenant_id=$1 and o.customer_id=$2 and o.deleted_at is null order by o.occurred_at desc limit 20`,
          [context.tenantId, id],
        ),
        this.pool.query(
          `select t.title,t.status,t.due_at,t.escalation_level,t.created_at,coalesce(u.display_name,'Unassigned') assignee_name
           from tasks t left join employees e on e.id=t.assignee_employee_id and e.tenant_id=t.tenant_id
           left join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id left join users u on u.id=m.user_id
           where t.tenant_id=$1 and t.customer_id=$2 and t.deleted_at is null order by t.due_at desc limit 20`,
          [context.tenantId, id],
        ),
        this.pool.query(
          'select action,created_at from audit_logs where tenant_id=$1 and resource_id=$2 and deleted_at is null order by created_at desc limit 30',
          [context.tenantId, id],
        ),
      ]);
    const detail = customer.rows[0];
    const anomalies = [
      ...tasks.rows
        .filter((task) => task.status === 'overdue')
        .map((task) => ({ type: 'overdue_task', title: task.title, at: task.due_at })),
      ...transfers.rows
        .filter((transfer) => transfer.status === 'pending')
        .map((transfer) => ({
          type: 'ownership_pending',
          title: `Transfer to ${transfer.to_name}`,
          at: transfer.created_at,
        })),
      ...(ownerships.rows.some((ownership) => ownership.status === 'active')
        ? []
        : [{ type: 'unassigned', title: 'No active customer owner', at: detail.created_at }]),
    ];
    const timeline = [
      ...audits.rows.map((item) => ({ kind: 'audit', label: item.action, at: item.created_at })),
      ...orders.rows.map((item) => ({
        kind: 'order',
        label: `Order ${item.order_number}`,
        at: item.occurred_at,
      })),
      ...tasks.rows.map((item) => ({
        kind: 'task',
        label: `${item.status}: ${item.title}`,
        at: item.created_at,
      })),
      ...transfers.rows.map((item) => ({
        kind: 'ownership',
        label: `Ownership ${item.status}`,
        at: item.created_at,
      })),
    ]
      .sort((left, right) => String(right.at).localeCompare(String(left.at)))
      .slice(0, 40);
    return {
      customer: {
        id: detail.id,
        displayName: detail.display_name,
        status: detail.status,
        version: detail.version,
        mergedIntoId: detail.merged_into_id,
        segment: detail.segment,
        nextTouchAt: detail.next_touch_at,
        createdAt: detail.created_at,
        identities: identities.rows.map((item) => ({
          type: item.identity_type,
          maskedValue: item.masked_value,
          status: item.status,
        })),
      },
      tags: tags.rows,
      sources: sources.rows,
      ownerships: ownerships.rows,
      transfers: transfers.rows,
      contributions: contributions.rows,
      orders: orders.rows,
      tasks: tasks.rows,
      anomalies,
      timeline,
    };
  }

  async requestExport(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 200 || !body.filters || typeof body.filters !== 'object')
      throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='customer_export_request' and idempotency_key=$2",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const id = randomUUID(),
        data = { id, status: 'pending', version: 1 };
      await client.query(
        'insert into customer_export_requests(id,tenant_id,filters,requested_by,status) values($1,$2,$3,$4,$5)',
        [id, context.tenantId, body.filters, context.userId, 'pending'],
      );
      await this.record(client, context, 'customer.export_requested', id, requestId, data);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'customer_export_request', key, data, context.userId],
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

  async approveExport(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!uuid.test(id) || !Number.isInteger(body.version) || body.decision !== 'approve')
      throw new BadRequestException('VALIDATION_ERROR');
    const row = await this.pool.query(
      "update customer_export_requests set status='approved',approved_by=$1,approved_at=now(),version=version+1,updated_at=now() where id=$2 and tenant_id=$3 and status='pending' and version=$4 returning id,status,version",
      [context.userId, id, context.tenantId, body.version],
    );
    if (!row.rowCount) throw new ConflictException('CONFLICT');
    await this.record(this.pool, context, 'customer.export_approved', id, requestId, row.rows[0]);
    return row.rows[0];
  }

  async assignees(context: OrganizationContext) {
    const rows = await this.pool.query(
      `select e.id,u.display_name,e.title
       from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id
       join users u on u.id=m.user_id
       where e.tenant_id=$1 and e.status='active' and e.deleted_at is null
         and m.status='active' and m.deleted_at is null
       order by u.display_name,e.employee_code`,
      [context.tenantId],
    );
    return rows.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      title: row.title,
    }));
  }

  async requestBulkOwnership(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (
      !key.trim() ||
      key.length > 160 ||
      !Array.isArray(body.items) ||
      body.items.length < 1 ||
      body.items.length > 50
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const toEmployeeId = text(body.toEmployeeId, 36);
    const reason = text(body.reason, 320);
    if (!toEmployeeId || !uuid.test(toEmployeeId) || !reason)
      throw new BadRequestException('VALIDATION_ERROR');
    const items = body.items.map((item) => {
      if (!item || typeof item !== 'object') throw new BadRequestException('VALIDATION_ERROR');
      const value = item as Record<string, unknown>;
      const customerId = text(value.customerId, 36);
      if (!customerId || !uuid.test(customerId) || !Number.isInteger(value.version))
        throw new BadRequestException('VALIDATION_ERROR');
      return { customerId, version: value.version as number };
    });
    const transfers = [];
    for (const item of items) {
      transfers.push(
        await this.attribution.requestTransfer(
          context,
          item.customerId,
          { customerVersion: item.version, toEmployeeId, reason },
          `${key}:${item.customerId}`,
          requestId,
        ),
      );
    }
    return { count: transfers.length, transfers };
  }

  async downloadExport(context: OrganizationContext, id: string, requestId: string) {
    if (!uuid.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const exportRequest = await this.pool.query(
      "select filters from customer_export_requests where id=$1 and tenant_id=$2 and status='approved'",
      [id, context.tenantId],
    );
    if (!exportRequest.rowCount) throw new NotFoundException('NOT_FOUND');
    const filters = exportRequest.rows[0].filters;
    if (!filters || typeof filters !== 'object' || Array.isArray(filters))
      throw new BadRequestException('VALIDATION_ERROR');
    const customers = await this.list(context, filters as Record<string, unknown>);
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [
      'customer_id,display_name,segment,owner,tags,active_orders',
      ...customers.map((customer) =>
        [
          customer.id,
          customer.displayName,
          customer.segment,
          customer.owner.name,
          customer.tags.join('|'),
          customer.orders,
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
    await this.record(this.pool, context, 'customer.export_downloaded', id, requestId, {
      count: customers.length,
    });
    return { filename: `customer-assets-${id}.csv`, csv };
  }
  private async record(
    client: Pool | PoolClient,
    context: OrganizationContext,
    action: string,
    id: string,
    requestId: string,
    details: unknown,
  ) {
    const correlation = uuid.test(requestId) ? requestId : randomUUID();
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'customer_export_request',$5,$6,'page-m-003',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, id, correlation, details],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'customer_export_request',$4,$5,$6,'page-m-003',$7,$7)",
      [
        randomUUID(),
        context.tenantId,
        `${action}.v1`,
        id,
        { action, details },
        correlation,
        context.userId,
      ],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
