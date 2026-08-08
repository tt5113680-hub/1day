import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() && value.trim().length <= max
    ? value.trim()
    : (() => {
        throw new BadRequestException('VALIDATION_ERROR');
      })();
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const EVIDENCE_TYPES = new Set(['screenshot', 'photo']);
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const date = (value: unknown) => {
  const result = text(value, 40);
  if (Number.isNaN(Date.parse(result))) throw new BadRequestException('VALIDATION_ERROR');
  return result;
};
const resultEvidence = (input: Record<string, unknown>) => {
  const evidenceType = text(input.evidenceType, 32);
  const originalFilename = text(input.originalFilename, 180);
  const mediaType = text(input.mediaType, 100).toLowerCase();
  const contentBase64 = text(input.contentBase64, 7_000_000);
  if (!EVIDENCE_TYPES.has(evidenceType) || !IMAGE_TYPES.has(mediaType))
    throw new BadRequestException('VALIDATION_ERROR');
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._ -]*$/.test(originalFilename) ||
    originalFilename.includes('..') ||
    originalFilename.includes('/') ||
    originalFilename.includes('\\') ||
    !/^[a-zA-Z0-9+/]+={0,2}$/.test(contentBase64)
  )
    throw new BadRequestException('VALIDATION_ERROR');
  const content = Buffer.from(contentBase64, 'base64');
  if (!content.length || content.length > MAX_EVIDENCE_BYTES)
    throw new BadRequestException('VALIDATION_ERROR');
  const png = content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = content.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const webp =
    content.subarray(0, 4).toString() === 'RIFF' && content.subarray(8, 12).toString() === 'WEBP';
  if (
    (mediaType === 'image/png' && !png) ||
    (mediaType === 'image/jpeg' && !jpeg) ||
    (mediaType === 'image/webp' && !webp)
  )
    throw new BadRequestException('VALIDATION_ERROR');
  return { evidenceType, originalFilename, mediaType, content };
};

@Injectable()
export class EmployeeTaskDetailService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async detail(context: OrganizationContext, taskId: string) {
    if (!UUID.test(taskId)) throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const task = await this.task(this.pool, context.tenantId, employee.id, taskId);
    const [evidence, availableEvidence] = await Promise.all([
      this.pool.query(
        `select e.id,e.evidence_type,e.original_filename,e.media_type,e.byte_size,e.created_at,l.version
         from task_evidence_links l join evidence_files e on e.id=l.evidence_file_id and e.tenant_id=l.tenant_id
         where l.tenant_id=$1 and l.task_id=$2 and l.deleted_at is null and e.status='active' and e.deleted_at is null
         order by l.created_at desc`,
        [context.tenantId, taskId],
      ),
      task.customer_id
        ? this.pool.query(
            `select e.id,e.evidence_type,e.original_filename,e.media_type,e.byte_size,e.created_at
             from evidence_files e join customer_orders o on o.id=e.order_id and o.tenant_id=e.tenant_id
             where e.tenant_id=$1 and o.customer_id=$2 and e.status='active' and e.deleted_at is null
               and not exists(select 1 from task_evidence_links l where l.tenant_id=e.tenant_id and l.task_id=$3 and l.evidence_file_id=e.id and l.deleted_at is null)
             order by e.created_at desc limit 12`,
            [context.tenantId, task.customer_id, taskId],
          )
        : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    ]);
    return {
      task: {
        id: task.id,
        title: task.title,
        reason: task.reason,
        dueAt: task.due_at,
        status: task.status,
        escalationLevel: task.escalation_level,
        version: task.version,
      },
      customer: task.customer_id ? { id: task.customer_id, displayName: task.customer_name } : null,
      evidence: evidence.rows,
      availableEvidence: availableEvidence.rows,
    };
  }

  async linkEvidence(
    context: OrganizationContext,
    taskId: string,
    input: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!UUID.test(taskId) || !key.trim() || key.length > 200)
      throw new BadRequestException('VALIDATION_ERROR');
    const evidenceId = text(input.evidenceId, 36);
    if (!UUID.test(evidenceId)) throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='task_evidence_link' and idempotency_key=$2 and deleted_at is null",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const task = await this.task(client, context.tenantId, employee.id, taskId);
      if (!task.customer_id) throw new ConflictException('CONFLICT');
      const evidence = await client.query(
        `select e.id,e.evidence_type,e.original_filename,e.media_type,e.byte_size
         from evidence_files e join customer_orders o on o.id=e.order_id and o.tenant_id=e.tenant_id
         where e.id=$1 and e.tenant_id=$2 and o.customer_id=$3 and e.status='active' and e.deleted_at is null`,
        [evidenceId, context.tenantId, task.customer_id],
      );
      if (!evidence.rowCount) throw new NotFoundException('NOT_FOUND');
      const existing = await client.query(
        'select id from task_evidence_links where tenant_id=$1 and task_id=$2 and evidence_file_id=$3 and deleted_at is null',
        [context.tenantId, taskId, evidenceId],
      );
      if (existing.rowCount) throw new ConflictException('CONFLICT');
      const data = (
        await client.query(
          'insert into task_evidence_links(id,tenant_id,task_id,evidence_file_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5) returning id,task_id,evidence_file_id,version',
          [randomUUID(), context.tenantId, taskId, evidenceId, context.userId],
        )
      ).rows[0];
      const correlationId = UUID.test(requestId) ? requestId : randomUUID();
      await this.audit(
        client,
        context,
        'employee.task_evidence_linked',
        taskId,
        correlationId,
        data,
      );
      await this.event(client, context, taskId, correlationId, data);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'task_evidence_link', key, data, context.userId],
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

  async recordResult(
    context: OrganizationContext,
    taskId: string,
    input: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!UUID.test(taskId) || !key.trim() || key.length > 200)
      throw new BadRequestException('VALIDATION_ERROR');
    const orderNumber = text(input.orderNumber, 120);
    const occurredAt = date(input.occurredAt);
    const evidenceInput = resultEvidence(input);
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='employee_task_result' and idempotency_key=$2 and deleted_at is null",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const task = await this.task(client, context.tenantId, employee.id, taskId);
      if (!task.customer_id || !['open', 'overdue'].includes(task.status))
        throw new ConflictException('CONFLICT');
      const order = (
        await client.query(
          'insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6) returning id,customer_id,order_number,occurred_at,status,version',
          [
            randomUUID(),
            context.tenantId,
            task.customer_id,
            orderNumber,
            occurredAt,
            context.userId,
          ],
        )
      ).rows[0];
      const evidence = (
        await client.query(
          'insert into evidence_files(id,tenant_id,order_id,evidence_type,original_filename,media_type,byte_size,content_sha256,content,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning id,order_id,evidence_type,original_filename,media_type,byte_size,content_sha256,status,version',
          [
            randomUUID(),
            context.tenantId,
            order.id,
            evidenceInput.evidenceType,
            evidenceInput.originalFilename,
            evidenceInput.mediaType,
            evidenceInput.content.length,
            createHash('sha256').update(evidenceInput.content).digest('hex'),
            evidenceInput.content,
            context.userId,
          ],
        )
      ).rows[0];
      const link = (
        await client.query(
          'insert into task_evidence_links(id,tenant_id,task_id,evidence_file_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5) returning id,task_id,evidence_file_id,version',
          [randomUUID(), context.tenantId, taskId, evidence.id, context.userId],
        )
      ).rows[0];
      const data = { taskId, order, evidence, link };
      const correlationId = UUID.test(requestId) ? requestId : randomUUID();
      await this.audit(
        client,
        context,
        'employee.task_result_recorded',
        taskId,
        correlationId,
        data,
      );
      await this.event(
        client,
        context,
        taskId,
        correlationId,
        data,
        'employee.task.result_recorded.v1',
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'employee_task_result', key, data, context.userId],
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

  private async employee(context: OrganizationContext) {
    const result = await this.pool.query(
      `select e.id from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id
       where e.tenant_id=$1 and m.user_id=$2 and e.status='active' and m.status='active' and e.deleted_at is null and m.deleted_at is null`,
      [context.tenantId, context.userId],
    );
    if (!result.rowCount) throw new ForbiddenException('FORBIDDEN');
    return result.rows[0];
  }

  private async task(
    client: Pool | PoolClient,
    tenantId: string,
    employeeId: string,
    taskId: string,
  ) {
    const result = await client.query(
      `select t.id,t.customer_id,t.title,t.reason,t.due_at,t.status,t.escalation_level,t.version,c.display_name as customer_name
       from tasks t left join customers c on c.id=t.customer_id and c.tenant_id=t.tenant_id and c.deleted_at is null
       where t.id=$1 and t.tenant_id=$2 and t.assignee_employee_id=$3 and t.deleted_at is null`,
      [taskId, tenantId, employeeId],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
    return result.rows[0];
  }

  private async audit(
    client: PoolClient,
    context: OrganizationContext,
    action: string,
    taskId: string,
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
        'task',
        taskId,
        correlationId,
        'page-e-002',
        details,
      ],
    );
  }

  private async event(
    client: PoolClient,
    context: OrganizationContext,
    taskId: string,
    correlationId: string,
    payload: unknown,
    eventType = 'employee.task.evidence_linked.v1',
  ) {
    await client.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        context.tenantId,
        eventType,
        'task',
        taskId,
        { payload },
        correlationId,
        'page-e-002',
        context.userId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
