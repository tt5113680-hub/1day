import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createApiPool } from './database-pool';

const PREVIEW = /^[A-Za-z0-9_-]{24,80}$/;
const PORTAL_TARGETS = new Set(['employee', 'management']);

export type PortalLayoutModule = {
  id: string;
  module_type: string;
  position: number;
  config: Record<string, unknown>;
};

export type PortalLayout = {
  mode: 'published' | 'preview';
  bindingId: string;
  bindingVersion: number;
  templateVersionId: string;
  publishedAt: string | null;
  modules: PortalLayoutModule[];
};

@Injectable()
export class PortalLayoutService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async resolve(
    tenantId: string,
    target: 'employee' | 'management',
    previewToken?: string,
  ): Promise<PortalLayout | null> {
    if (!PORTAL_TARGETS.has(target)) throw new BadRequestException('VALIDATION_ERROR');

    let versionId: string | null = null;
    let bindingId: string | null = null;
    let bindingVersion: number | null = null;
    let publishedAt: string | null = null;
    let mode: PortalLayout['mode'] = 'published';

    if (previewToken) {
      if (!PREVIEW.test(previewToken)) throw new BadRequestException('VALIDATION_ERROR');
      const row = (
        await this.pool.query(
          `select ppt.template_version_id, pb.id as binding_id, pb.version as binding_version, pb.published_at
           from portal_preview_tokens ppt
           join portal_bindings pb on pb.tenant_id=ppt.tenant_id and pb.target=ppt.target
             and pb.status='active' and pb.deleted_at is null
           where ppt.tenant_id=$1 and ppt.target=$2 and ppt.token_hash=$3 and ppt.status='active'
             and ppt.expires_at>now() and ppt.deleted_at is null`,
          [tenantId, target, createHash('sha256').update(previewToken).digest('hex')],
        )
      ).rows[0];
      if (!row) return null;
      versionId = row.template_version_id;
      bindingId = row.binding_id;
      bindingVersion = row.binding_version;
      publishedAt = row.published_at;
      mode = 'preview';
    } else {
      const row = (
        await this.pool.query(
          `select pb.id as binding_id, pb.live_version_id as template_version_id, pb.version as binding_version, pb.published_at
           from portal_bindings pb
           where pb.tenant_id=$1 and pb.target=$2 and pb.status='active'
             and pb.live_version_id is not null and pb.deleted_at is null`,
          [tenantId, target],
        )
      ).rows[0];
      if (!row) return null;
      versionId = row.template_version_id;
      bindingId = row.binding_id;
      bindingVersion = row.binding_version;
      publishedAt = row.published_at;
    }

    const modules = (
      await this.pool.query(
        "select id,module_type,position,config from page_modules where tenant_id=$1 and template_version_id=$2 and status='active' and deleted_at is null order by position",
        [tenantId, versionId],
      )
    ).rows.map((row) => ({
      id: row.id,
      module_type: row.module_type,
      position: row.position,
      config: (row.config ?? {}) as Record<string, unknown>,
    }));

    if (!modules.length) return null;

    return {
      mode,
      bindingId: bindingId!,
      bindingVersion: bindingVersion!,
      templateVersionId: versionId!,
      publishedAt: publishedAt ?? null,
      modules,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
