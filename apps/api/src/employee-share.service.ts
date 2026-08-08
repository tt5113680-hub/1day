import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const CODE = /^[A-Za-z0-9_-]{8,48}$/;
const SCENARIOS = new Set(['employee', 'campaign', 'channel']);

const text = (value: unknown, max: number, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new BadRequestException('VALIDATION_ERROR');
    return null;
  }
  if (typeof value !== 'string' || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};

const targetPath = (value: unknown) => {
  const path = text(value, 300) ?? '/c/entry';
  if (!path.startsWith('/c/') || path.startsWith('//') || path.includes('\\'))
    throw new BadRequestException('VALIDATION_ERROR');
  return path;
};

@Injectable()
export class EmployeeShareService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext) {
    const employee = await this.employee(context);
    const result = await this.pool.query(
      `select s.id,s.code,s.scenario,s.target_path,s.expires_at,s.status,s.created_at,s.version,
        count(e.id)::int as opens
       from employee_share_codes s
       left join employee_share_code_events e on e.share_code_id=s.id and e.tenant_id=s.tenant_id and e.deleted_at is null
       where s.tenant_id=$1 and s.employee_id=$2 and s.deleted_at is null
       group by s.id order by s.created_at desc`,
      [context.tenantId, employee.id],
    );
    return result.rows.map((row) => this.output(row));
  }

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 200) throw new BadRequestException('VALIDATION_ERROR');
    const scenario = text(body.scenario, 32, true);
    if (!scenario || !SCENARIOS.has(scenario)) throw new BadRequestException('VALIDATION_ERROR');
    const path = targetPath(body.targetPath);
    const expiryValue = text(body.expiresAt, 40);
    const expiresAt = expiryValue ? new Date(expiryValue) : null;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()))
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='employee_share_code' and idempotency_key=$2 and deleted_at is null",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const row = (
        await client.query(
          `insert into employee_share_codes(id,tenant_id,employee_id,code,scenario,target_path,expires_at,created_by,updated_by)
           values($1,$2,$3,$4,$5,$6,$7,$8,$8)
           returning id,code,scenario,target_path,expires_at,status,created_at,version`,
          [
            randomUUID(),
            context.tenantId,
            employee.id,
            randomBytes(12).toString('base64url'),
            scenario,
            path,
            expiresAt,
            context.userId,
          ],
        )
      ).rows[0];
      const data = this.output(row);
      const correlation = UUID.test(requestId) ? requestId : randomUUID();
      await this.audit(client, context, 'employee.share_code_created', row.id, correlation, data);
      await this.outbox(
        client,
        context,
        'employee.share_code.created.v1',
        row.id,
        correlation,
        data,
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'employee_share_code', key, data, context.userId],
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

  async revoke(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(id) || !Number.isInteger(body.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const current = await client.query(
        'select id,code,scenario,target_path,expires_at,status,created_at,version from employee_share_codes where id=$1 and tenant_id=$2 and employee_id=$3 and deleted_at is null for update',
        [id, context.tenantId, employee.id],
      );
      if (!current.rowCount) throw new NotFoundException('NOT_FOUND');
      const row = current.rows[0];
      if (row.version !== body.version) throw new BadRequestException('VERSION_CONFLICT');
      if (row.status !== 'revoked') {
        row.status = (
          await client.query(
            "update employee_share_codes set status='revoked',version=version+1,updated_at=now(),updated_by=$1 where id=$2 and tenant_id=$3 returning status,version",
            [context.userId, id, context.tenantId],
          )
        ).rows[0].status;
        row.version += 1;
        const correlation = UUID.test(requestId) ? requestId : randomUUID();
        const data = this.output(row);
        await this.audit(client, context, 'employee.share_code_revoked', id, correlation, data);
        await this.outbox(client, context, 'employee.share_code.revoked.v1', id, correlation, data);
      }
      await client.query('commit');
      return this.output(row);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async open(code: string) {
    if (!CODE.test(code)) throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const found = await client.query(
        `select s.id,s.tenant_id,s.code,s.scenario,s.target_path,s.expires_at,s.status,s.created_at,s.version,t.slug as tenant_slug
         from employee_share_codes s join tenants t on t.id=s.tenant_id
         where s.code=$1 and s.status='active' and s.deleted_at is null and t.status='active' and t.deleted_at is null
           and (s.expires_at is null or s.expires_at > now()) for update`,
        [code],
      );
      if (!found.rowCount) throw new NotFoundException('NOT_FOUND');
      const row = found.rows[0];
      const eventId = randomUUID(),
        correlation = randomUUID();
      await client.query(
        "insert into employee_share_code_events(id,tenant_id,share_code_id,event_type,created_by,updated_by) values($1,$2,$3,'opened',null,null)",
        [eventId, row.tenant_id, row.id],
      );
      const details = { shareCodeId: row.id, scenario: row.scenario, eventId };
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,null,'employee.share_code_opened','employee_share_code',$3,$4,'page-e-005',$5,null,null)",
        [randomUUID(), row.tenant_id, row.id, correlation, details],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'employee.share_code.opened.v1','employee_share_code',$3,$4,$5,'page-e-005',null,null)",
        [randomUUID(), row.tenant_id, row.id, details, correlation],
      );
      await client.query('commit');
      return {
        code: row.code,
        scenario: row.scenario,
        targetPath: row.target_path,
        tenant: row.tenant_slug,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private output(row: Record<string, unknown>) {
    const expiry = row.expires_at ? new Date(String(row.expires_at)) : null;
    return {
      id: row.id,
      code: row.code,
      scenario: row.scenario,
      targetPath: row.target_path,
      expiresAt: row.expires_at,
      status: row.status === 'active' && expiry && expiry <= new Date() ? 'expired' : row.status,
      createdAt: row.created_at,
      version: row.version,
      opens: Number(row.opens ?? 0),
    };
  }

  private async employee(context: OrganizationContext) {
    const result = await this.pool.query(
      "select e.id from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id where e.tenant_id=$1 and m.user_id=$2 and e.status='active' and m.status='active' and e.deleted_at is null and m.deleted_at is null",
      [context.tenantId, context.userId],
    );
    if (!result.rowCount) throw new ForbiddenException('FORBIDDEN');
    return result.rows[0];
  }

  private async audit(
    client: PoolClient,
    context: OrganizationContext,
    action: string,
    id: string,
    correlation: string,
    details: unknown,
  ) {
    await client.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        'employee_share_code',
        id,
        correlation,
        'page-e-005',
        details,
      ],
    );
  }

  private async outbox(
    client: PoolClient,
    context: OrganizationContext,
    event: string,
    id: string,
    correlation: string,
    payload: unknown,
  ) {
    await client.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        context.tenantId,
        event,
        'employee_share_code',
        id,
        payload,
        correlation,
        'page-e-005',
        context.userId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
