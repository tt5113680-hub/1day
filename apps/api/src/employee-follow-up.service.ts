import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type { OrganizationContext } from './organization.service';
const UUID = /^[0-9a-f-]{36}$/i;
const ACTIONS = new Set(['call', 'visit', 'message', 'other']);
const optional = (v: unknown, n: number) =>
  v === undefined || v === null || v === ''
    ? null
    : typeof v === 'string' && v.trim().length <= n
      ? v.trim()
      : (() => {
          throw new BadRequestException('VALIDATION_ERROR');
        })();
@Injectable()
export class EmployeeFollowUpService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async list(c: OrganizationContext, id: string) {
    const e = await this.employee(c);
    await this.task(this.pool, c.tenantId, e.id, id);
    return (
      await this.pool.query(
        'select id,action_type,raw_note,voice_transcript,summary,next_task_id,created_at,version from task_follow_ups where tenant_id=$1 and task_id=$2 and deleted_at is null order by created_at desc',
        [c.tenantId, id],
      )
    ).rows;
  }
  async create(
    c: OrganizationContext,
    id: string,
    b: Record<string, unknown>,
    key: string,
    r: string,
  ) {
    if (!UUID.test(id) || !key.trim() || key.length > 200)
      throw new BadRequestException('VALIDATION_ERROR');
    const action = String(b.actionType);
    if (!ACTIONS.has(action)) throw new BadRequestException('VALIDATION_ERROR');
    const raw = optional(b.rawNote, 4000),
      voice = optional(b.voiceTranscript, 4000),
      summary = optional(b.summary, 2000);
    if (!raw && !voice && !summary) throw new BadRequestException('VALIDATION_ERROR');
    const nextTitle = optional(b.nextTaskTitle, 160),
      nextDue = optional(b.nextTaskDueAt, 40);
    if (
      (nextTitle && !nextDue) ||
      (!nextTitle && nextDue) ||
      (nextDue && Number.isNaN(Date.parse(nextDue)))
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const e = await this.employee(c);
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const replay = await q.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='task_follow_up' and idempotency_key=$2 and deleted_at is null",
        [c.tenantId, key],
      );
      if (replay.rowCount) {
        await q.query('commit');
        return replay.rows[0].response;
      }
      const task = await this.task(q, c.tenantId, e.id, id);
      let nextId: null | string = null;
      if (nextTitle && nextDue) {
        nextId = randomUUID();
        await q.query(
          'insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8)',
          [
            nextId,
            c.tenantId,
            task.customer_id,
            e.id,
            nextTitle,
            `Follow-up for ${task.title}`,
            nextDue,
            c.userId,
          ],
        );
      }
      const data = (
        await q.query(
          'insert into task_follow_ups(id,tenant_id,task_id,employee_id,action_type,raw_note,voice_transcript,summary,next_task_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning id,action_type,raw_note,voice_transcript,summary,next_task_id,created_at,version',
          [randomUUID(), c.tenantId, id, e.id, action, raw, voice, summary, nextId, c.userId],
        )
      ).rows[0];
      const correlation = UUID.test(r) ? r : randomUUID();
      await this.audit(q, c, id, correlation, data);
      await q.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'employee.task.follow_up_recorded.v1','task',$3,$4,$5,'page-e-004',$6,$6)",
        [randomUUID(), c.tenantId, id, { data }, correlation, c.userId],
      );
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), c.tenantId, 'task_follow_up', key, data, c.userId],
      );
      await q.query('commit');
      return data;
    } catch (x) {
      await q.query('rollback');
      throw x;
    } finally {
      q.release();
    }
  }
  private async employee(c: OrganizationContext) {
    const r = await this.pool.query(
      "select e.id from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id where e.tenant_id=$1 and m.user_id=$2 and e.status='active' and m.status='active' and e.deleted_at is null and m.deleted_at is null",
      [c.tenantId, c.userId],
    );
    if (!r.rowCount) throw new ForbiddenException('FORBIDDEN');
    return r.rows[0];
  }
  private async task(q: Pool | PoolClient, t: string, e: string, id: string) {
    if (!UUID.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const r = await q.query(
      'select id,customer_id,title from tasks where id=$1 and tenant_id=$2 and assignee_employee_id=$3 and deleted_at is null',
      [id, t, e],
    );
    if (!r.rowCount) throw new NotFoundException('NOT_FOUND');
    return r.rows[0];
  }
  private async audit(
    q: PoolClient,
    c: OrganizationContext,
    id: string,
    correlation: string,
    data: unknown,
  ) {
    await q.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'employee.task_follow_up_recorded','task',$4,$5,'page-e-004',$6,$3,$3)",
      [randomUUID(), c.tenantId, c.userId, id, correlation, data],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
