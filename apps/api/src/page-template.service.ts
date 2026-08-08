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
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const TARGETS = new Set(['consumer', 'employee', 'management']);
const MODULES = new Set(['hero', 'action_grid', 'content', 'result_list']);
const text = (v: unknown, n: number) => {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > n)
    throw new BadRequestException('VALIDATION_ERROR');
  return v.trim();
};
const version = (v: unknown) => {
  if (!Number.isInteger(v) || (v as number) < 1) throw new BadRequestException('VALIDATION_ERROR');
  return v as number;
};
const configuration = (v: unknown) => {
  if (v === undefined) return {};
  if (!v || typeof v !== 'object' || Array.isArray(v) || JSON.stringify(v).length > 5000)
    throw new BadRequestException('VALIDATION_ERROR');
  return v as Record<string, unknown>;
};
const correlation = (r: string) => (UUID.test(r) ? r : randomUUID());

@Injectable()
export class PageTemplateService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async list(c: OrganizationContext) {
    return (
      await this.pool.query(
        'select id,code,name,target,industry_config,published_version_id,status,version from page_templates where tenant_id=$1 and deleted_at is null order by created_at desc',
        [c.tenantId],
      )
    ).rows;
  }
  async preview(c: OrganizationContext, id: string, versionId?: string) {
    if (!UUID.test(id) || (versionId && !UUID.test(versionId)))
      throw new BadRequestException('VALIDATION_ERROR');
    const template = (
      await this.pool.query(
        'select * from page_templates where id=$1 and tenant_id=$2 and deleted_at is null',
        [id, c.tenantId],
      )
    ).rows[0];
    if (!template) throw new NotFoundException('NOT_FOUND');
    const selected =
      versionId ??
      template.published_version_id ??
      (
        await this.pool.query(
          "select id from page_template_versions where template_id=$1 and tenant_id=$2 and status='draft' order by sequence desc limit 1",
          [id, c.tenantId],
        )
      ).rows[0]?.id;
    if (!selected) return { template: this.template(template), version: null, modules: [] };
    const item = (
      await this.pool.query(
        'select id,sequence,status,version from page_template_versions where id=$1 and template_id=$2 and tenant_id=$3 and deleted_at is null',
        [selected, id, c.tenantId],
      )
    ).rows[0];
    if (!item) throw new NotFoundException('NOT_FOUND');
    const modules = (
      await this.pool.query(
        'select id,module_type,position,config,status,version from page_modules where template_version_id=$1 and tenant_id=$2 and deleted_at is null order by position',
        [selected, c.tenantId],
      )
    ).rows;
    return { template: this.template(template), version: item, modules };
  }
  async create(c: OrganizationContext, body: Record<string, unknown>, key: string, r: string) {
    if (!key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const target = text(body.target, 32);
    if (!TARGETS.has(target)) throw new BadRequestException('VALIDATION_ERROR');
    const modules = this.modules(body.modules);
    const input = {
      code: text(body.code, 80),
      name: text(body.name, 120),
      target,
      modules,
      industryConfig: configuration(body.industryConfig),
    };
    return this.idempotent(c, 'page_template', key, async (q) => {
      const id = randomUUID(),
        vid = randomUUID();
      const row = (
        await q.query(
          'insert into page_templates(id,tenant_id,code,name,target,industry_config,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7) returning id,code,name,target,industry_config,status,version',
          [id, c.tenantId, input.code, input.name, input.target, input.industryConfig, c.userId],
        )
      ).rows[0];
      await q.query(
        'insert into page_template_versions(id,tenant_id,template_id,sequence,created_by,updated_by) values($1,$2,$3,1,$4,$4)',
        [vid, c.tenantId, id, c.userId],
      );
      await this.insertModules(q, c, vid, input.modules);
      const data = { ...row, draftVersionId: vid };
      await this.audit(q, c, 'page.template_created', id, r, data);
      await this.event(q, c, 'page.template.created.v1', id, r, data);
      return data;
    });
  }
  async publish(c: OrganizationContext, id: string, body: Record<string, unknown>, r: string) {
    return this.switch(
      c,
      id,
      body,
      r,
      'published',
      'page.template_published',
      'page.template.published.v1',
    );
  }
  async rollback(c: OrganizationContext, id: string, body: Record<string, unknown>, r: string) {
    return this.switch(
      c,
      id,
      body,
      r,
      'published',
      'page.template_rolled_back',
      'page.template.rolled_back.v1',
    );
  }
  async draft(c: OrganizationContext, id: string, sourceVersionId: string, r: string) {
    if (!UUID.test(id) || !UUID.test(sourceVersionId))
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const template = (
        await q.query(
          'select id from page_templates where id=$1 and tenant_id=$2 and deleted_at is null for update',
          [id, c.tenantId],
        )
      ).rows[0];
      if (!template) throw new NotFoundException('NOT_FOUND');
      const source = (
        await q.query(
          'select id from page_template_versions where id=$1 and template_id=$2 and tenant_id=$3 and deleted_at is null',
          [sourceVersionId, id, c.tenantId],
        )
      ).rows[0];
      if (!source) throw new NotFoundException('NOT_FOUND');
      const sequence = (
        await q.query(
          'select coalesce(max(sequence),0)+1 as value from page_template_versions where template_id=$1',
          [id],
        )
      ).rows[0].value;
      const versionId = randomUUID();
      await q.query(
        'insert into page_template_versions(id,tenant_id,template_id,sequence,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
        [versionId, c.tenantId, id, sequence, c.userId],
      );
      const modules = await q.query(
        'select module_type,position,config from page_modules where template_version_id=$1 and tenant_id=$2 and deleted_at is null order by position',
        [sourceVersionId, c.tenantId],
      );
      for (const item of modules.rows)
        await q.query(
          'insert into page_modules(id,tenant_id,template_version_id,module_type,position,config,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
          [
            randomUUID(),
            c.tenantId,
            versionId,
            item.module_type,
            item.position,
            item.config,
            c.userId,
          ],
        );
      const data = { id: versionId, sequence, status: 'draft' };
      await this.audit(q, c, 'page.template_draft_created', id, r, data);
      await this.event(q, c, 'page.template.draft_created.v1', id, r, data);
      await q.query('commit');
      return data;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  private async switch(
    c: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    r: string,
    status: string,
    action: string,
    event: string,
  ) {
    if (!UUID.test(id) || !UUID.test(String(body.versionId)))
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const t = (
        await q.query(
          'select * from page_templates where id=$1 and tenant_id=$2 and deleted_at is null and version=$3 for update',
          [id, c.tenantId, version(body.templateVersion)],
        )
      ).rows[0];
      if (!t) throw new ConflictException('CONFLICT');
      const v = (
        await q.query(
          'select id from page_template_versions where id=$1 and template_id=$2 and tenant_id=$3 and deleted_at is null',
          [body.versionId, id, c.tenantId],
        )
      ).rows[0];
      if (!v) throw new NotFoundException('NOT_FOUND');
      await q.query(
        "update page_template_versions set status='archived',updated_at=now(),updated_by=$1 where template_id=$2 and tenant_id=$3 and status='published'",
        [c.userId, id, c.tenantId],
      );
      await q.query(
        'update page_template_versions set status=$1,updated_at=now(),updated_by=$2 where id=$3',
        [status, c.userId, v.id],
      );
      const data = (
        await q.query(
          'update page_templates set published_version_id=$1,version=version+1,updated_at=now(),updated_by=$2 where id=$3 returning id,published_version_id,version',
          [v.id, c.userId, id],
        )
      ).rows[0];
      await this.audit(q, c, action, id, r, data);
      await this.event(q, c, event, id, r, data);
      await q.query('commit');
      return data;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  private modules(v: unknown) {
    if (!Array.isArray(v) || !v.length || v.length > 20)
      throw new BadRequestException('VALIDATION_ERROR');
    return v.map((x, i) => {
      if (!x || typeof x !== 'object' || Array.isArray(x))
        throw new BadRequestException('VALIDATION_ERROR');
      const b = x as Record<string, unknown>,
        type = text(b.moduleType, 48);
      if (!MODULES.has(type)) throw new BadRequestException('VALIDATION_ERROR');
      const config = b.config === undefined ? {} : b.config;
      if (
        !config ||
        typeof config !== 'object' ||
        Array.isArray(config) ||
        JSON.stringify(config).length > 5000
      )
        throw new BadRequestException('VALIDATION_ERROR');
      return { type, position: i + 1, config };
    });
  }
  private async insertModules(
    q: PoolClient,
    c: OrganizationContext,
    versionId: string,
    modules: ReturnType<PageTemplateService['modules']>,
  ) {
    for (const m of modules)
      await q.query(
        'insert into page_modules(id,tenant_id,template_version_id,module_type,position,config,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
        [randomUUID(), c.tenantId, versionId, m.type, m.position, m.config, c.userId],
      );
  }
  private template(t: Record<string, unknown>) {
    return {
      id: t.id,
      code: t.code,
      name: t.name,
      target: t.target,
      industryConfig: t.industry_config,
      publishedVersionId: t.published_version_id,
      version: t.version,
    };
  }
  private async idempotent(
    c: OrganizationContext,
    type: string,
    key: string,
    action: (q: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const p = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [c.tenantId, type, key],
      );
      if (p.rowCount) {
        await q.query('commit');
        return p.rows[0].response;
      }
      const data = await action(q);
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), c.tenantId, type, key, data, c.userId],
      );
      await q.query('commit');
      return data;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  private async audit(
    q: Pool | PoolClient,
    c: OrganizationContext,
    action: string,
    id: string,
    r: string,
    details: unknown,
  ) {
    await q.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        c.tenantId,
        c.userId,
        action,
        'page_template',
        id,
        correlation(r),
        'core-008',
        details,
      ],
    );
  }
  private async event(
    q: Pool | PoolClient,
    c: OrganizationContext,
    type: string,
    id: string,
    r: string,
    payload: unknown,
  ) {
    const x = correlation(r);
    await q.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [randomUUID(), c.tenantId, type, 'page_template', id, { payload }, x, 'core-008', c.userId],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
