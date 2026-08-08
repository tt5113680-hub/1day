import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { type Pool } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;
const text = (v: unknown, max: number) => {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return v.trim();
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class EmployeeService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async list(context: OrganizationContext) {
    return (
      await this.pool.query(
        'select e.id,e.employee_code,e.title,e.status,e.organization_id,e.version,u.email,u.display_name from employees e join memberships m on m.id=e.membership_id join users u on u.id=m.user_id where e.tenant_id=$1 and e.deleted_at is null order by e.employee_code',
        [context.tenantId],
      )
    ).rows;
  }
  async invite(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    correlationId: string,
  ) {
    if (!key) throw new BadRequestException('VALIDATION_ERROR');
    const email = text(body.email, 320).toLowerCase(),
      organizationId = text(body.organizationId, 36),
      employeeCode = text(body.employeeCode, 80),
      title = body.title === undefined ? null : text(body.title, 160);
    if (!uuid.test(organizationId)) throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const prior = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'employee_invitation', key],
      );
      if (prior.rowCount) {
        await client.query('commit');
        return prior.rows[0].response;
      }
      if (
        !(
          await client.query(
            "select 1 from organizations where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
            [organizationId, context.tenantId],
          )
        ).rowCount
      )
        throw new NotFoundException('NOT_FOUND');
      const token = randomBytes(24).toString('base64url'),
        id = randomUUID();
      const created = await client.query(
        "insert into membership_invitations (id,tenant_id,organization_id,email,employee_code,title,token_hash,expires_at,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,now()+interval '7 days',$8,$8) returning id,email,employee_code,title,status,expires_at,version",
        [
          id,
          context.tenantId,
          organizationId,
          email,
          employeeCode,
          title,
          hash(token),
          context.userId,
        ],
      );
      const data = { ...created.rows[0], invitationToken: token };
      await client.query(
        'insert into idempotency_keys (id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'employee_invitation', key, data, context.userId],
      );
      await this.record(
        client,
        context,
        'employee.invited',
        'membership_invitation',
        id,
        correlationId,
        data,
      );
      await client.query('commit');
      return data;
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
  async accept(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    correlationId: string,
  ) {
    const token = text(body.invitationToken, 128),
      displayName = text(body.displayName, 160);
    if (!uuid.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const invite = await client.query(
        "select * from membership_invitations where id=$1 and tenant_id=$2 and token_hash=$3 and status='pending' and expires_at>now() for update",
        [id, context.tenantId, hash(token)],
      );
      if (!invite.rowCount) throw new NotFoundException('NOT_FOUND');
      const user = await client.query(
        'select id from users where email=$1 and deleted_at is null',
        [invite.rows[0].email],
      );
      let userId = user.rows[0]?.id;
      if (!userId) {
        userId = randomUUID();
        await client.query(
          'insert into users(id,email,display_name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
          [userId, invite.rows[0].email, displayName, 'active', context.userId],
        );
      }
      const membershipId = randomUUID();
      await client.query(
        'insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
        [membershipId, context.tenantId, userId, 'active', context.userId],
      );
      const employeeId = randomUUID();
      const result = await client.query(
        'insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7) returning id,employee_code,status,organization_id,version',
        [
          employeeId,
          context.tenantId,
          membershipId,
          invite.rows[0].organization_id,
          invite.rows[0].employee_code,
          invite.rows[0].title,
          context.userId,
        ],
      );
      await client.query(
        "update membership_invitations set status='accepted',accepted_at=now(),updated_by=$2,version=version+1 where id=$1",
        [id, context.userId],
      );
      const data = result.rows[0];
      await this.record(
        client,
        context,
        'employee.accepted',
        'employee',
        employeeId,
        correlationId,
        data,
      );
      await client.query('commit');
      return data;
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
  async offboard(
    context: OrganizationContext,
    id: string,
    version: unknown,
    correlationId: string,
  ) {
    if (!uuid.test(id) || typeof version !== 'number')
      throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      "update employees set status='offboarded',ended_at=now(),updated_at=now(),updated_by=$1,version=version+1 where id=$2 and tenant_id=$3 and version=$4 and status='active' returning *",
      [context.userId, id, context.tenantId, version],
    );
    if (!result.rowCount) throw new ConflictException('CONFLICT');
    await this.pool.query(
      "update memberships set status='inactive',updated_at=now(),updated_by=$1,version=version+1 where id=$2",
      [context.userId, result.rows[0].membership_id],
    );
    await this.record(this.pool, context, 'employee.offboarded', 'employee', id, correlationId, {
      status: 'offboarded',
    });
    return result.rows[0];
  }
  private async record(
    client: Pool | import('pg').PoolClient,
    context: OrganizationContext,
    action: string,
    type: string,
    id: string,
    correlationId: string,
    details: unknown,
  ) {
    await client.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        type,
        id,
        uuid.test(correlationId) ? correlationId : randomUUID(),
        'core-002',
        details,
      ],
    );
    await client.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        context.tenantId,
        action + '.v1',
        type,
        id,
        details,
        uuid.test(correlationId) ? correlationId : randomUUID(),
        'core-002',
        context.userId,
      ],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
