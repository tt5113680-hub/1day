import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';
const uuid = /^[0-9a-f-]{36}$/i;
const value = (input: unknown, max: number) => {
  if (typeof input !== 'string' || !input.trim() || input.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return input.trim();
};
@Injectable()
export class ManagementAiSuggestionService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async list(context: OrganizationContext) {
    return (
      await this.pool.query(
        "select id,title,reason,impact,action_type,action_payload,model_name,model_version,status,feedback,accepted_at,version,created_at from ai_suggestions where tenant_id=$1 order by case status when 'pending' then 0 else 1 end,created_at desc limit 100",
        [context.tenantId],
      )
    ).rows;
  }
  async accept(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    return this.change(context, id, body, requestId, 'accepted');
  }
  async feedback(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    return this.change(context, id, body, requestId, 'feedback');
  }
  private async change(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
    mode: 'accepted' | 'feedback',
  ) {
    if (!uuid.test(id) || !Number.isInteger(body.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const feedback = mode === 'feedback' ? value(body.feedback, 500) : null;
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const row = (
        await client.query('select * from ai_suggestions where id=$1 and tenant_id=$2 for update', [
          id,
          context.tenantId,
        ])
      ).rows[0];
      if (!row) throw new NotFoundException('NOT_FOUND');
      if (row.version !== body.version || (mode === 'accepted' && row.status !== 'pending'))
        throw new ConflictException('CONFLICT');
      const updated = (
        await client.query(
          mode === 'accepted'
            ? "update ai_suggestions set status='accepted',accepted_by=$1,accepted_at=now(),version=version+1,updated_at=now() where id=$2 returning *"
            : 'update ai_suggestions set feedback=$1,version=version+1,updated_at=now() where id=$2 returning *',
          mode === 'accepted' ? [context.userId, id] : [feedback, id],
        )
      ).rows[0];
      const correlation = uuid.test(requestId) ? requestId : randomUUID();
      const action = `ai.suggestion_${mode}`;
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'ai_suggestion',$5,$6,'page-m-006',$7,$3,$3)",
        [
          randomUUID(),
          context.tenantId,
          context.userId,
          action,
          id,
          correlation,
          {
            modelName: row.model_name,
            modelVersion: row.model_version,
            actionType: row.action_type,
          },
        ],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'ai_suggestion',$4,$5,$6,'page-m-006',$7,$7)",
        [
          randomUUID(),
          context.tenantId,
          `${action}.v1`,
          id,
          { status: updated.status, modelName: row.model_name, modelVersion: row.model_version },
          correlation,
          context.userId,
        ],
      );
      await client.query('commit');
      return updated;
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
