import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';
import { warmStorefrontReadModelCache } from './storefront-read-model-cache';

const UUID = /^[0-9a-f-]{36}$/i;
const TARGETS = new Set(['consumer', 'employee', 'management']);
const MODULES = new Set([
  'hero',
  'action_grid',
  'content',
  'result_list',
  'store_hero',
  'banner_carousel',
  'quick_actions',
  'operating_channels',
  'service_catalog',
  'offer_compare',
  'member_entry',
  'content_feed',
  'store_info',
  'discovery_entry',
  'member_wallet',
]);
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
        `select pt.id,pt.code,pt.name,pt.target,pt.industry_config,pt.published_version_id,pt.status,pt.version,
                coalesce(sb.id,pb.id) as binding_id,sb.store_id,s.name as store_name,
                coalesce(sb.draft_version_id,pb.draft_version_id) as draft_version_id,
                coalesce(sb.live_version_id,pb.live_version_id) as live_version_id,
                coalesce(sb.version,pb.version) as binding_version,
                coalesce(sb.published_at,pb.published_at) as published_at
         from page_templates pt
         left join storefront_bindings sb on sb.template_id=pt.id and sb.tenant_id=pt.tenant_id and sb.deleted_at is null
         left join portal_bindings pb on pb.template_id=pt.id and pb.tenant_id=pt.tenant_id and pb.deleted_at is null
         left join stores s on s.id=sb.store_id and s.tenant_id=sb.tenant_id and s.deleted_at is null
         where pt.tenant_id=$1 and pt.deleted_at is null order by pt.created_at desc`,
        [c.tenantId],
      )
    ).rows;
  }
  async preview(c: OrganizationContext, id: string, versionId?: string) {
    if (!UUID.test(id) || (versionId && !UUID.test(versionId)))
      throw new BadRequestException('VALIDATION_ERROR');
    const template = (
      await this.pool.query(
        `select pt.*,coalesce(sb.id,pb.id) as binding_id,sb.store_id,
                coalesce(sb.draft_version_id,pb.draft_version_id) as draft_version_id,
                coalesce(sb.live_version_id,pb.live_version_id) as live_version_id,
                coalesce(sb.version,pb.version) as binding_version,
                coalesce(sb.published_at,pb.published_at) as published_at,s.name as store_name
         from page_templates pt
         left join storefront_bindings sb on sb.template_id=pt.id and sb.tenant_id=pt.tenant_id and sb.deleted_at is null
         left join portal_bindings pb on pb.template_id=pt.id and pb.tenant_id=pt.tenant_id and pb.deleted_at is null
         left join stores s on s.id=sb.store_id and s.tenant_id=sb.tenant_id and s.deleted_at is null
         where pt.id=$1 and pt.tenant_id=$2 and pt.deleted_at is null`,
        [id, c.tenantId],
      )
    ).rows[0];
    if (!template) throw new NotFoundException('NOT_FOUND');
    const selected =
      versionId ??
      template.draft_version_id ??
      (
        await this.pool.query(
          "select id from page_template_versions where template_id=$1 and tenant_id=$2 and status='draft' order by sequence desc limit 1",
          [id, c.tenantId],
        )
      ).rows[0]?.id ??
      template.live_version_id ??
      template.published_version_id;
    if (!selected)
      return {
        template: this.template(template),
        binding: this.binding(template),
        version: null,
        versions: [],
        modules: [],
      };
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
    const versions = (
      await this.pool.query(
        'select id,sequence,status,version,updated_at from page_template_versions where template_id=$1 and tenant_id=$2 and deleted_at is null order by sequence desc',
        [id, c.tenantId],
      )
    ).rows;
    return {
      template: this.template(template),
      binding: this.binding(template),
      version: item,
      versions,
      modules,
    };
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
      if (target === 'employee' || target === 'management') {
        await q.query(
          'insert into portal_bindings(id,tenant_id,target,template_id,draft_version_id,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
          [randomUUID(), c.tenantId, target, id, vid, 'active', c.userId],
        );
      }
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
          `select pt.id,sb.id as binding_id,pb.id as portal_binding_id
           from page_templates pt
           left join storefront_bindings sb on sb.template_id=pt.id and sb.tenant_id=pt.tenant_id and sb.deleted_at is null
           left join portal_bindings pb on pb.template_id=pt.id and pb.tenant_id=pt.tenant_id and pb.deleted_at is null
           where pt.id=$1 and pt.tenant_id=$2 and pt.deleted_at is null for update of pt`,
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
      if (template.binding_id)
        await q.query(
          'update storefront_bindings set draft_version_id=$1,updated_at=now(),updated_by=$2,version=version+1 where id=$3 and tenant_id=$4',
          [versionId, c.userId, template.binding_id, c.tenantId],
        );
      if (template.portal_binding_id)
        await q.query(
          'update portal_bindings set draft_version_id=$1,updated_at=now(),updated_by=$2,version=version+1 where id=$3 and tenant_id=$4',
          [versionId, c.userId, template.portal_binding_id, c.tenantId],
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
  async updateDraft(
    c: OrganizationContext,
    id: string,
    versionId: string,
    body: Record<string, unknown>,
    r: string,
  ) {
    if (!UUID.test(id) || !UUID.test(versionId)) throw new BadRequestException('VALIDATION_ERROR');
    const modules = this.modules(body.modules);
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const draft = (
        await q.query(
          `select pv.id,pv.version from page_template_versions pv
           join page_templates pt on pt.id=pv.template_id and pt.tenant_id=pv.tenant_id and pt.deleted_at is null
           where pv.id=$1 and pv.template_id=$2 and pv.tenant_id=$3 and pv.status='draft'
             and pv.deleted_at is null and pv.version=$4 for update`,
          [versionId, id, c.tenantId, version(body.version)],
        )
      ).rows[0];
      if (!draft) throw new ConflictException('CONFLICT');
      await q.query('delete from page_modules where template_version_id=$1 and tenant_id=$2', [
        versionId,
        c.tenantId,
      ]);
      await this.insertModules(q, c, versionId, modules);
      const data = (
        await q.query(
          'update page_template_versions set version=version+1,updated_at=now(),updated_by=$1 where id=$2 returning id,sequence,status,version',
          [c.userId, versionId],
        )
      ).rows[0];
      await this.audit(q, c, 'storefront.draft_updated', id, r, {
        ...data,
        modules: modules.length,
      });
      await this.event(q, c, 'storefront.draft.updated.v1', id, r, data);
      await q.query('commit');
      return data;
    } catch (error) {
      await q.query('rollback');
      throw error;
    } finally {
      q.release();
    }
  }
  async previewLink(c: OrganizationContext, id: string, body: Record<string, unknown>, r: string) {
    if (!UUID.test(id) || !UUID.test(String(body.versionId)))
      throw new BadRequestException('VALIDATION_ERROR');
    const binding = (
      await this.pool.query(
        `select sb.id,sb.store_id,t.slug,'consumer'::text as target
         from storefront_bindings sb
         join page_templates pt on pt.id=sb.template_id and pt.tenant_id=sb.tenant_id and pt.deleted_at is null
         join page_template_versions pv on pv.id=$3 and pv.template_id=pt.id and pv.tenant_id=pt.tenant_id and pv.deleted_at is null
         join tenants t on t.id=sb.tenant_id and t.status='active' and t.deleted_at is null
         where pt.id=$1 and sb.tenant_id=$2 and sb.status='active' and sb.deleted_at is null`,
        [id, c.tenantId, body.versionId],
      )
    ).rows[0];
    const portal = binding
      ? null
      : (
          await this.pool.query(
            `select pb.id,pb.target
             from portal_bindings pb
             join page_templates pt on pt.id=pb.template_id and pt.tenant_id=pb.tenant_id and pt.deleted_at is null
             join page_template_versions pv on pv.id=$3 and pv.template_id=pt.id and pv.tenant_id=pt.tenant_id and pv.deleted_at is null
             where pt.id=$1 and pb.tenant_id=$2 and pb.status='active' and pb.deleted_at is null`,
            [id, c.tenantId, body.versionId],
          )
        ).rows[0];
    if (!binding && !portal) throw new NotFoundException('NOT_FOUND');
    const token = randomBytes(24).toString('base64url');
    let path: string;
    if (binding) {
      await this.pool.query(
        "insert into storefront_preview_tokens(id,tenant_id,store_id,template_version_id,token_hash,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,$5,now()+interval '30 minutes','active',$6,$6)",
        [
          randomUUID(),
          c.tenantId,
          binding.store_id,
          body.versionId,
          this.tokenHash(token),
          c.userId,
        ],
      );
      path = `/c/stores/${binding.store_id}?tenant=${encodeURIComponent(binding.slug)}&preview=${encodeURIComponent(token)}&scene=storefront_preview`;
      await this.audit(this.pool, c, 'storefront.preview_created', binding.id, r, {
        versionId: body.versionId,
        expiresInSeconds: 1800,
      });
    } else {
      await this.pool.query(
        "insert into portal_preview_tokens(id,tenant_id,target,template_version_id,token_hash,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,$5,now()+interval '30 minutes','active',$6,$6)",
        [randomUUID(), c.tenantId, portal.target, body.versionId, this.tokenHash(token), c.userId],
      );
      path =
        portal.target === 'employee'
          ? `/e/workbench?preview=${encodeURIComponent(token)}`
          : `/?preview=${encodeURIComponent(token)}`;
      await this.audit(this.pool, c, 'portal.preview_created', portal.id, r, {
        versionId: body.versionId,
        target: portal.target,
        expiresInSeconds: 1800,
      });
    }
    return { expiresInSeconds: 1800, path, target: binding ? 'consumer' : portal!.target };
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
          'select id,status,sequence from page_template_versions where id=$1 and template_id=$2 and tenant_id=$3 and deleted_at is null',
          [body.versionId, id, c.tenantId],
        )
      ).rows[0];
      if (!v) throw new NotFoundException('NOT_FOUND');
      const binding = (
        await q.query(
          "select id,store_id,version from storefront_bindings where template_id=$1 and tenant_id=$2 and status='active' and deleted_at is null for update",
          [id, c.tenantId],
        )
      ).rows[0];
      const portalBinding = binding
        ? null
        : (
            await q.query(
              "select id,target,version from portal_bindings where template_id=$1 and tenant_id=$2 and status='active' and deleted_at is null for update",
              [id, c.tenantId],
            )
          ).rows[0];
      if (binding) {
        if (body.bindingVersion !== undefined && binding.version !== version(body.bindingVersion))
          throw new ConflictException('CONFLICT');
        await this.validateStorefront(q, c, t, v.id);
      } else if (portalBinding) {
        if (
          body.bindingVersion !== undefined &&
          portalBinding.version !== version(body.bindingVersion)
        )
          throw new ConflictException('CONFLICT');
        await this.validatePortal(q, c, v.id);
      }
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
      if (binding) {
        const bindingData = (
          await q.query(
            'update storefront_bindings set live_version_id=$1,draft_version_id=$1,published_at=now(),version=version+1,updated_at=now(),updated_by=$2 where id=$3 returning id,store_id,draft_version_id,live_version_id,published_at,version',
            [v.id, c.userId, binding.id],
          )
        ).rows[0];
        const publicationSequence = (
          await q.query(
            'select coalesce(max(sequence),0)+1 value from storefront_publications where binding_id=$1',
            [binding.id],
          )
        ).rows[0].value;
        const publicationType = action.includes('rolled_back') ? 'rollback' : 'publish';
        await q.query(
          'insert into storefront_publications(id,tenant_id,binding_id,template_version_id,publication_type,sequence,correlation_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8)',
          [
            randomUUID(),
            c.tenantId,
            binding.id,
            v.id,
            publicationType,
            publicationSequence,
            correlation(r),
            c.userId,
          ],
        );
        Object.assign(data, { binding: bindingData, publicationType, publicationSequence });
        const authEpoch = (
          await q.query('select auth_epoch from tenants where id=$1', [c.tenantId])
        ).rows[0] as { auth_epoch: number };
        await warmStorefrontReadModelCache(q, {
          tenantId: c.tenantId,
          storeId: bindingData.store_id,
          bindingId: bindingData.id,
          liveVersionId: bindingData.live_version_id,
          bindingVersion: bindingData.version,
          authEpoch: authEpoch?.auth_epoch ?? 0,
          correlationId: correlation(r),
          actorId: c.userId,
        });
        await this.event(
          q,
          c,
          publicationType === 'rollback' ? 'storefront.rolled_back.v1' : 'storefront.published.v1',
          binding.id,
          r,
          { ...bindingData, templateId: id },
        );
      } else if (portalBinding) {
        const bindingData = (
          await q.query(
            'update portal_bindings set live_version_id=$1,draft_version_id=$1,published_at=now(),version=version+1,updated_at=now(),updated_by=$2 where id=$3 returning id,target,draft_version_id,live_version_id,published_at,version',
            [v.id, c.userId, portalBinding.id],
          )
        ).rows[0];
        const publicationType = action.includes('rolled_back') ? 'rollback' : 'publish';
        const publicationSequence = (
          await q.query(
            'select coalesce(max(sequence),0)+1 value from portal_publications where binding_id=$1',
            [portalBinding.id],
          )
        ).rows[0].value;
        await q.query(
          'insert into portal_publications(id,tenant_id,binding_id,template_version_id,publication_type,sequence,correlation_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8)',
          [
            randomUUID(),
            c.tenantId,
            portalBinding.id,
            v.id,
            publicationType,
            publicationSequence,
            correlation(r),
            c.userId,
          ],
        );
        Object.assign(data, {
          binding: bindingData,
          publicationType,
          publicationSequence,
          target: portalBinding.target,
        });
        await this.event(
          q,
          c,
          publicationType === 'rollback' ? 'portal.rolled_back.v1' : 'portal.published.v1',
          portalBinding.id,
          r,
          { ...bindingData, templateId: id },
        );
      }
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
  private binding(t: Record<string, unknown>) {
    if (!t.binding_id) return null;
    const target = String(t.target ?? '');
    const isPortal = target === 'employee' || target === 'management';
    return {
      id: t.binding_id,
      storeId: isPortal ? null : t.store_id,
      storeName: isPortal ? (target === 'employee' ? '员工工作台' : '管理工作台') : t.store_name,
      target,
      draftVersionId: t.draft_version_id,
      liveVersionId: t.live_version_id,
      publishedAt: t.published_at,
      version: t.binding_version,
    };
  }
  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private async validateStorefront(
    q: PoolClient,
    c: OrganizationContext,
    template: Record<string, unknown>,
    versionId: string,
  ) {
    const modules = (
      await q.query(
        "select module_type,config from page_modules where template_version_id=$1 and tenant_id=$2 and status='active' and deleted_at is null order by position",
        [versionId, c.tenantId],
      )
    ).rows as { module_type: string; config: unknown }[];
    if (!modules.length || modules.length > 20) throw new BadRequestException('VALIDATION_ERROR');
    const industry = template.industry_config as { family?: string } | null;
    if (industry?.family) {
      const types = new Set(modules.map((module) => module.module_type));
      if (!types.has('store_hero') || !types.has('store_info'))
        throw new BadRequestException('STOREFRONT_REQUIRED_MODULE_MISSING');
      if (types.has('operating_channels')) {
        const channelModule = modules.find((module) => module.module_type === 'operating_channels');
        const channels = (channelModule?.config as { channels?: unknown })?.channels;
        if (Array.isArray(channels) && channels.length > 3)
          throw new BadRequestException('STOREFRONT_CHANNEL_LIMIT');
      }
    }
  }
  private async validatePortal(q: PoolClient, c: OrganizationContext, versionId: string) {
    const modules = (
      await q.query(
        "select module_type,config from page_modules where template_version_id=$1 and tenant_id=$2 and status='active' and deleted_at is null order by position",
        [versionId, c.tenantId],
      )
    ).rows as { module_type: string; config: unknown }[];
    if (!modules.length || modules.length > 20) throw new BadRequestException('VALIDATION_ERROR');
    const types = new Set(modules.map((module) => module.module_type));
    const hasGrid = types.has('action_grid') || types.has('quick_actions');
    if (!types.has('hero') || !hasGrid)
      throw new BadRequestException('PORTAL_REQUIRED_MODULE_MISSING');
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
