import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const TYPES = new Set(['task', 'approval']);
type Step = {
  name: string;
  type: string;
  employeeId: string;
  timeoutMinutes: number;
  condition: Record<string, unknown>;
};
const text = (value: unknown, max: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const expectedVersion = (value: unknown) => {
  if (!Number.isInteger(value) || (value as number) < 1)
    throw new BadRequestException('VALIDATION_ERROR');
  return value as number;
};
const correlation = (requestId: string) => (UUID.test(requestId) ? requestId : randomUUID());
const object = (value: unknown, max = 5000) => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(value).length > max
  )
    throw new BadRequestException('VALIDATION_ERROR');
  return value as Record<string, unknown>;
};

@Injectable()
export class WorkflowService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(c: OrganizationContext) {
    return (
      await this.pool.query(
        'select id,code,name,published_version_id,status,version from workflow_definitions where tenant_id=$1 and deleted_at is null order by created_at desc',
        [c.tenantId],
      )
    ).rows;
  }

  async managementOverview(c: OrganizationContext, query: Record<string, unknown>) {
    const status =
      query.status === undefined || query.status === '' ? null : text(query.status, 32);
    const allowed = new Set(['active', 'completed', 'rejected', 'timed_out']);
    if (status && !allowed.has(status)) throw new BadRequestException('VALIDATION_ERROR');
    const [templates, instances, approvals] = await Promise.all([
      this.pool.query(
        `select d.id,d.code,d.name,d.status,d.version,d.published_version_id,
          count(i.id) filter(where i.status='active')::int active_instances,
          count(i.id) filter(where i.status='timed_out')::int timed_out_instances
         from workflow_definitions d left join workflow_instances i on i.definition_id=d.id and i.tenant_id=d.tenant_id and i.deleted_at is null
         where d.tenant_id=$1 and d.deleted_at is null group by d.id order by d.updated_at desc`,
        [c.tenantId],
      ),
      this.pool.query(
        `select i.id,i.status,i.current_step_position,i.version,i.created_at,i.completed_at,d.name definition_name,
          s.id step_id,s.name step_name,s.step_type,s.due_at,s.status step_status,coalesce(u.display_name,'Unassigned') assignee_name
         from workflow_instances i join workflow_definitions d on d.id=i.definition_id and d.tenant_id=i.tenant_id
         left join workflow_instance_steps s on s.workflow_instance_id=i.id and s.tenant_id=i.tenant_id and s.status='active' and s.deleted_at is null
         left join employees e on e.id=s.assignee_employee_id and e.tenant_id=s.tenant_id
         left join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id left join users u on u.id=m.user_id
         where i.tenant_id=$1 and i.deleted_at is null and ($2::text is null or i.status=$2)
         order by case i.status when 'timed_out' then 0 when 'active' then 1 else 2 end,i.created_at desc limit 100`,
        [c.tenantId, status],
      ),
      this.pool.query(
        `select s.id,s.workflow_instance_id,s.name,s.due_at,s.version,coalesce(u.display_name,'Unassigned') assignee_name,d.name definition_name
         from workflow_instance_steps s join workflow_instances i on i.id=s.workflow_instance_id and i.tenant_id=s.tenant_id
         join workflow_definitions d on d.id=i.definition_id and d.tenant_id=i.tenant_id
         left join employees e on e.id=s.assignee_employee_id and e.tenant_id=s.tenant_id
         left join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id left join users u on u.id=m.user_id
         where s.tenant_id=$1 and s.step_type='approval' and s.status='active' and s.deleted_at is null order by s.due_at`,
        [c.tenantId],
      ),
    ]);
    return { templates: templates.rows, instances: instances.rows, approvals: approvals.rows };
  }

  async detail(c: OrganizationContext, id: string) {
    if (!UUID.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const definition = (
      await this.pool.query(
        'select id,code,name,published_version_id,status,version from workflow_definitions where id=$1 and tenant_id=$2 and deleted_at is null',
        [id, c.tenantId],
      )
    ).rows[0];
    if (!definition) throw new NotFoundException('NOT_FOUND');
    const versions = (
      await this.pool.query(
        'select id,sequence,status,version from workflow_versions where definition_id=$1 and tenant_id=$2 and deleted_at is null order by sequence',
        [id, c.tenantId],
      )
    ).rows;
    return { definition, versions };
  }

  async create(
    c: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      code: text(body.code, 80),
      name: text(body.name, 160),
      steps: this.steps(body.steps),
    };
    return this.idempotent(c, 'workflow_definition', key, async (q) => {
      await this.assertEmployees(q, c, input.steps);
      const id = randomUUID(),
        versionId = randomUUID();
      const definition = (
        await q.query(
          'insert into workflow_definitions(id,tenant_id,code,name,created_by,updated_by) values($1,$2,$3,$4,$5,$5) returning id,code,name,status,version',
          [id, c.tenantId, input.code, input.name, c.userId],
        )
      ).rows[0];
      await q.query(
        'insert into workflow_versions(id,tenant_id,definition_id,sequence,created_by,updated_by) values($1,$2,$3,1,$4,$4)',
        [versionId, c.tenantId, id, c.userId],
      );
      await this.insertSteps(q, c, versionId, input.steps);
      const data = { ...definition, draftVersionId: versionId };
      await this.audit(q, c, 'workflow.definition_created', id, requestId, data);
      await this.event(q, c, 'workflow.definition.created.v1', id, requestId, data);
      return data;
    });
  }

  async createVersion(
    c: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const steps = this.steps(body.steps),
      version = expectedVersion(body.definitionVersion),
      q = await this.pool.connect();
    try {
      await q.query('begin');
      const definition = (
        await q.query(
          'select id from workflow_definitions where id=$1 and tenant_id=$2 and deleted_at is null and version=$3 for update',
          [id, c.tenantId, version],
        )
      ).rows[0];
      if (!definition) throw new ConflictException('CONFLICT');
      await this.assertEmployees(q, c, steps);
      const sequence = (
        await q.query(
          'select coalesce(max(sequence),0)+1 as value from workflow_versions where definition_id=$1',
          [id],
        )
      ).rows[0].value;
      const versionId = randomUUID();
      await q.query(
        'insert into workflow_versions(id,tenant_id,definition_id,sequence,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
        [versionId, c.tenantId, id, sequence, c.userId],
      );
      await this.insertSteps(q, c, versionId, steps);
      const data = (
        await q.query(
          'update workflow_definitions set version=version+1,updated_by=$1,updated_at=now() where id=$2 returning version',
          [c.userId, id],
        )
      ).rows[0];
      const result = { id: versionId, sequence, definitionVersion: data.version };
      await this.audit(q, c, 'workflow.version_created', id, requestId, result);
      await this.event(q, c, 'workflow.version.created.v1', id, requestId, result);
      await q.query('commit');
      return result;
    } catch (error) {
      await q.query('rollback');
      throw error;
    } finally {
      q.release();
    }
  }

  async publish(
    c: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    const versionId = String(body.versionId);
    if (!UUID.test(id) || !UUID.test(versionId)) throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const definition = (
        await q.query(
          'select id from workflow_definitions where id=$1 and tenant_id=$2 and deleted_at is null and version=$3 for update',
          [id, c.tenantId, expectedVersion(body.definitionVersion)],
        )
      ).rows[0];
      if (!definition) throw new ConflictException('CONFLICT');
      const selected = (
        await q.query(
          'select id from workflow_versions where id=$1 and definition_id=$2 and tenant_id=$3 and status=$4 and deleted_at is null',
          [versionId, id, c.tenantId, 'active'],
        )
      ).rows[0];
      if (!selected) throw new NotFoundException('NOT_FOUND');
      await q.query(
        "update workflow_versions set status='archived',updated_by=$1,updated_at=now() where definition_id=$2 and tenant_id=$3 and status='published'",
        [c.userId, id, c.tenantId],
      );
      await q.query(
        "update workflow_versions set status='published',updated_by=$1,updated_at=now() where id=$2",
        [c.userId, versionId],
      );
      const data = (
        await q.query(
          'update workflow_definitions set published_version_id=$1,version=version+1,updated_by=$2,updated_at=now() where id=$3 returning id,published_version_id,version',
          [versionId, c.userId, id],
        )
      ).rows[0];
      await this.audit(q, c, 'workflow.version_published', id, requestId, data);
      await this.event(q, c, 'workflow.version.published.v1', id, requestId, data);
      await q.query('commit');
      return data;
    } catch (error) {
      await q.query('rollback');
      throw error;
    } finally {
      q.release();
    }
  }

  async start(
    c: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!UUID.test(id) || !key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = body.context === undefined ? {} : object(body.context);
    return this.idempotent(c, 'workflow_instance', key, async (q) => {
      const definition = (
        await q.query(
          "select * from workflow_definitions where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
          [id, c.tenantId],
        )
      ).rows[0];
      if (!definition?.published_version_id) throw new ConflictException('CONFLICT');
      const sourceSteps = (
        await q.query(
          "select * from workflow_steps where workflow_version_id=$1 and tenant_id=$2 and status='active' and deleted_at is null order by position",
          [definition.published_version_id, c.tenantId],
        )
      ).rows;
      if (!sourceSteps.length) throw new ConflictException('CONFLICT');
      const instanceId = randomUUID();
      await q.query(
        'insert into workflow_instances(id,tenant_id,definition_id,workflow_version_id,context,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [instanceId, c.tenantId, id, definition.published_version_id, context, c.userId],
      );
      for (const step of sourceSteps) {
        const applicable = this.applies(step.condition, context);
        await q.query(
          'insert into workflow_instance_steps(id,tenant_id,workflow_instance_id,workflow_step_id,position,name,step_type,assignee_employee_id,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)',
          [
            randomUUID(),
            c.tenantId,
            instanceId,
            step.id,
            step.position,
            step.name,
            step.step_type,
            step.assignee_employee_id,
            applicable ? 'pending' : 'skipped',
            c.userId,
          ],
        );
      }
      const data = await this.activateNext(q, c, instanceId, requestId);
      await this.audit(q, c, 'workflow.instance_started', instanceId, requestId, data);
      await this.event(q, c, 'workflow.instance.started.v1', instanceId, requestId, data);
      return data;
    });
  }

  async instance(c: OrganizationContext, id: string) {
    if (!UUID.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const instance = (
      await this.pool.query(
        'select id,definition_id,workflow_version_id,status,current_step_position,context,version from workflow_instances where id=$1 and tenant_id=$2 and deleted_at is null',
        [id, c.tenantId],
      )
    ).rows[0];
    if (!instance) throw new NotFoundException('NOT_FOUND');
    const steps = (
      await this.pool.query(
        'select id,position,name,step_type,assignee_employee_id,task_id,due_at,status,version from workflow_instance_steps where workflow_instance_id=$1 and tenant_id=$2 and deleted_at is null order by position',
        [id, c.tenantId],
      )
    ).rows;
    return { instance, steps };
  }

  async decide(
    c: OrganizationContext,
    instanceId: string,
    stepId: string,
    body: Record<string, unknown>,
    action: 'complete' | 'approve' | 'reject',
    requestId: string,
  ) {
    if (!UUID.test(instanceId) || !UUID.test(stepId))
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const instance = (
        await q.query(
          "select * from workflow_instances where id=$1 and tenant_id=$2 and status='active' and deleted_at is null and version=$3 for update",
          [instanceId, c.tenantId, expectedVersion(body.instanceVersion)],
        )
      ).rows[0];
      if (!instance) throw new ConflictException('CONFLICT');
      const step = (
        await q.query(
          "select * from workflow_instance_steps where id=$1 and workflow_instance_id=$2 and tenant_id=$3 and status='active' and deleted_at is null for update",
          [stepId, instanceId, c.tenantId],
        )
      ).rows[0];
      if (!step) throw new ConflictException('CONFLICT');
      if (
        (action === 'complete' && step.step_type !== 'task') ||
        (action !== 'complete' && step.step_type !== 'approval')
      )
        throw new BadRequestException('VALIDATION_ERROR');
      await this.assertAssignee(q, c, step.assignee_employee_id);
      if (action === 'reject') {
        await q.query(
          "update workflow_instance_steps set status='rejected',completed_at=now(),version=version+1,updated_by=$1,updated_at=now() where id=$2",
          [c.userId, stepId],
        );
        const data = (
          await q.query(
            "update workflow_instances set status='rejected',completed_at=now(),version=version+1,updated_by=$1,updated_at=now() where id=$2 returning id,status,version",
            [c.userId, instanceId],
          )
        ).rows[0];
        await this.audit(q, c, 'workflow.step_rejected', instanceId, requestId, { stepId, data });
        await this.event(q, c, 'workflow.instance.rejected.v1', instanceId, requestId, {
          stepId,
          data,
        });
        await q.query('commit');
        return data;
      }
      await q.query(
        'update workflow_instance_steps set status=$1,completed_at=now(),version=version+1,updated_by=$2,updated_at=now() where id=$3',
        [action === 'complete' ? 'completed' : 'approved', c.userId, stepId],
      );
      if (step.task_id)
        await q.query(
          "update tasks set status='completed',version=version+1,updated_by=$1,updated_at=now() where id=$2 and tenant_id=$3 and status in ('open','overdue')",
          [c.userId, step.task_id, c.tenantId],
        );
      const data = await this.activateNext(q, c, instanceId, requestId);
      await this.audit(q, c, `workflow.step_${action}d`, instanceId, requestId, { stepId, data });
      await this.event(q, c, `workflow.step.${action}d.v1`, instanceId, requestId, {
        stepId,
        data,
      });
      await q.query('commit');
      return data;
    } catch (error) {
      await q.query('rollback');
      throw error;
    } finally {
      q.release();
    }
  }

  async processTimeouts(c: OrganizationContext, requestId: string) {
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const due = await q.query(
        "select s.id,s.workflow_instance_id,s.task_id from workflow_instance_steps s join workflow_instances i on i.id=s.workflow_instance_id and i.tenant_id=s.tenant_id where s.tenant_id=$1 and s.status='active' and s.due_at<=now() and i.status='active' for update of s skip locked",
        [c.tenantId],
      );
      for (const row of due.rows) {
        await q.query(
          "update workflow_instance_steps set status='timed_out',completed_at=now(),version=version+1,updated_by=$1,updated_at=now() where id=$2",
          [c.userId, row.id],
        );
        if (row.task_id)
          await q.query(
            "update tasks set status='overdue',version=version+1,updated_by=$1,updated_at=now() where id=$2 and status='open'",
            [c.userId, row.task_id],
          );
        await q.query(
          "update workflow_instances set status='timed_out',completed_at=now(),version=version+1,updated_by=$1,updated_at=now() where id=$2",
          [c.userId, row.workflow_instance_id],
        );
        await this.audit(q, c, 'workflow.step_timed_out', row.workflow_instance_id, requestId, row);
        await this.event(
          q,
          c,
          'workflow.instance.timed_out.v1',
          row.workflow_instance_id,
          requestId,
          row,
        );
      }
      await q.query('commit');
      return { timedOut: due.rowCount };
    } catch (error) {
      await q.query('rollback');
      throw error;
    } finally {
      q.release();
    }
  }

  private steps(value: unknown): Step[] {
    if (!Array.isArray(value) || !value.length || value.length > 20)
      throw new BadRequestException('VALIDATION_ERROR');
    return value.map((item) => {
      const data = object(item);
      const type = text(data.type, 32);
      if (!TYPES.has(type)) throw new BadRequestException('VALIDATION_ERROR');
      const timeoutMinutes = data.timeoutMinutes;
      if (
        !Number.isInteger(timeoutMinutes) ||
        (timeoutMinutes as number) < 1 ||
        (timeoutMinutes as number) > 43200
      )
        throw new BadRequestException('VALIDATION_ERROR');
      const condition = data.condition === undefined ? {} : object(data.condition, 500);
      if (
        Object.keys(condition).length &&
        (typeof condition.key !== 'string' ||
          !condition.key ||
          !['string', 'number', 'boolean'].includes(typeof condition.equals))
      )
        throw new BadRequestException('VALIDATION_ERROR');
      const employeeId = text(data.assigneeEmployeeId, 36);
      if (!UUID.test(employeeId)) throw new BadRequestException('VALIDATION_ERROR');
      return {
        name: text(data.name, 160),
        type,
        employeeId,
        timeoutMinutes: timeoutMinutes as number,
        condition,
      };
    });
  }

  private async insertSteps(
    q: PoolClient,
    c: OrganizationContext,
    versionId: string,
    steps: Step[],
  ) {
    for (const [index, step] of steps.entries())
      await q.query(
        'insert into workflow_steps(id,tenant_id,workflow_version_id,position,name,step_type,assignee_employee_id,timeout_minutes,condition,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)',
        [
          randomUUID(),
          c.tenantId,
          versionId,
          index + 1,
          step.name,
          step.type,
          step.employeeId,
          step.timeoutMinutes,
          step.condition,
          c.userId,
        ],
      );
  }

  private async activateNext(
    q: PoolClient,
    c: OrganizationContext,
    instanceId: string,
    requestId: string,
  ) {
    const step = (
      await q.query(
        "select s.*,w.timeout_minutes from workflow_instance_steps s join workflow_steps w on w.id=s.workflow_step_id where s.workflow_instance_id=$1 and s.tenant_id=$2 and s.status='pending' order by s.position limit 1 for update",
        [instanceId, c.tenantId],
      )
    ).rows[0];
    if (!step)
      return (
        await q.query(
          "update workflow_instances set status='completed',completed_at=now(),version=version+1,updated_by=$1,updated_at=now() where id=$2 returning id,status,current_step_position,version",
          [c.userId, instanceId],
        )
      ).rows[0];
    const dueAt = new Date(Date.now() + Number(step.timeout_minutes) * 60000).toISOString();
    let taskId: string | null = null;
    if (step.step_type === 'task') {
      taskId = randomUUID();
      await q.query(
        'insert into tasks(id,tenant_id,assignee_employee_id,title,due_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [taskId, c.tenantId, step.assignee_employee_id, `[Workflow] ${step.name}`, dueAt, c.userId],
      );
    }
    await q.query(
      "update workflow_instance_steps set status='active',task_id=$1,due_at=$2,updated_by=$3,updated_at=now() where id=$4",
      [taskId, dueAt, c.userId, step.id],
    );
    const data = (
      await q.query(
        'update workflow_instances set current_step_position=$1,version=version+1,updated_by=$2,updated_at=now() where id=$3 returning id,status,current_step_position,version',
        [step.position, c.userId, instanceId],
      )
    ).rows[0];
    await this.event(q, c, 'workflow.step.activated.v1', instanceId, requestId, {
      stepId: step.id,
      taskId,
    });
    return data;
  }

  private applies(condition: Record<string, unknown>, context: Record<string, unknown>) {
    if (!Object.keys(condition).length) return true;
    return context[condition.key as string] === condition.equals;
  }

  private async assertEmployees(q: PoolClient, c: OrganizationContext, steps: Step[]) {
    const ids = [...new Set(steps.map((step) => step.employeeId))];
    const found = await q.query(
      "select id from employees where tenant_id=$1 and status='active' and id=any($2::uuid[])",
      [c.tenantId, ids],
    );
    if (found.rowCount !== ids.length) throw new NotFoundException('NOT_FOUND');
  }

  private async assertAssignee(q: PoolClient, c: OrganizationContext, employeeId: string) {
    const found = await q.query(
      "select 1 from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id where e.id=$1 and e.tenant_id=$2 and e.status='active' and m.user_id=$3 and m.status='active'",
      [employeeId, c.tenantId, c.userId],
    );
    if (!found.rowCount) throw new ForbiddenException('FORBIDDEN');
  }

  private async idempotent(
    c: OrganizationContext,
    type: string,
    key: string,
    work: (q: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const previous = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [c.tenantId, type, key],
      );
      if (previous.rowCount) {
        await q.query('commit');
        return previous.rows[0].response;
      }
      const data = await work(q);
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), c.tenantId, type, key, data, c.userId],
      );
      await q.query('commit');
      return data;
    } catch (error) {
      await q.query('rollback');
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      )
        throw new ConflictException('CONFLICT');
      throw error;
    } finally {
      q.release();
    }
  }

  private async audit(
    q: Pool | PoolClient,
    c: OrganizationContext,
    action: string,
    id: string,
    requestId: string,
    details: unknown,
  ) {
    await q.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        c.tenantId,
        c.userId,
        action,
        'workflow',
        id,
        correlation(requestId),
        'core-010',
        details,
      ],
    );
  }

  private async event(
    q: Pool | PoolClient,
    c: OrganizationContext,
    type: string,
    id: string,
    requestId: string,
    payload: unknown,
  ) {
    await q.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        c.tenantId,
        type,
        'workflow',
        id,
        { payload },
        correlation(requestId),
        'core-010',
        c.userId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
