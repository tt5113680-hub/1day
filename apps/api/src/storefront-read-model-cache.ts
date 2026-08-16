import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

/** Same fingerprint as SyncGatewayService.publicStorefrontVersion. */
export const storefrontPublishedFingerprint = (
  bindingId: string,
  bindingVersion: number,
  liveVersionId: string | null,
) => `${bindingId}:${bindingVersion}:${liveVersionId ?? 'none'}`;

export const storefrontCacheEtag = (publishedVersion: string, authEpoch: number) =>
  `"${createHash('sha256')
    .update(`${publishedVersion}:${authEpoch}`)
    .digest('hex')
    .slice(0, 32)}"`;

type WarmInput = {
  tenantId: string;
  storeId: string;
  bindingId: string;
  liveVersionId: string;
  bindingVersion: number;
  authEpoch?: number;
  correlationId?: string | null;
  actorId?: string | null;
};

/**
 * Upsert the warmed Consumer published read-model cache row for a storefront binding.
 */
export async function warmStorefrontReadModelCache(client: PoolClient, input: WarmInput) {
  const authEpoch = input.authEpoch ?? 0;
  const publishedVersion = storefrontPublishedFingerprint(
    input.bindingId,
    input.bindingVersion,
    input.liveVersionId,
  );
  const etag = storefrontCacheEtag(publishedVersion, authEpoch);
  const existing = (
    await client.query(
      'select id,cache_version from storefront_read_model_cache where store_id=$1 and deleted_at is null for update',
      [input.storeId],
    )
  ).rows[0] as { id: string; cache_version: number } | undefined;
  if (existing) {
    await client.query(
      `update storefront_read_model_cache
       set binding_id=$2, live_version_id=$3, binding_version=$4, published_version=$5, etag=$6,
           cache_version=cache_version+1, auth_epoch=$7, warmed_at=now(), correlation_id=$8,
           updated_at=now(), updated_by=$9, version=version+1, deleted_at=null
       where id=$1`,
      [
        existing.id,
        input.bindingId,
        input.liveVersionId,
        input.bindingVersion,
        publishedVersion,
        etag,
        authEpoch,
        input.correlationId ?? null,
        input.actorId ?? null,
      ],
    );
    return {
      publishedVersion,
      etag,
      cacheVersion: existing.cache_version + 1,
      authEpoch,
    };
  }
  await client.query(
    `insert into storefront_read_model_cache(
       id,tenant_id,store_id,binding_id,live_version_id,binding_version,published_version,etag,
       cache_version,auth_epoch,correlation_id,created_by,updated_by
     ) values($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10,$11,$11)`,
    [
      randomUUID(),
      input.tenantId,
      input.storeId,
      input.bindingId,
      input.liveVersionId,
      input.bindingVersion,
      publishedVersion,
      etag,
      authEpoch,
      input.correlationId ?? null,
      input.actorId ?? null,
    ],
  );
  return { publishedVersion, etag, cacheVersion: 1, authEpoch };
}
