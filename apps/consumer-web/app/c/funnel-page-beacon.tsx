'use client';

import { useEffect } from 'react';
import { bindPageFunnel, type FunnelSurface } from './entry-funnel-client';

/** Drop-in for server-rendered pages that need visit/dwell/scroll traces. */
export function FunnelPageBeacon(props: {
  tenantSlug: string;
  surface: FunnelSurface;
  moduleKey?: string;
  targetStoreId?: string;
  shareCode?: string | null;
  source?: string;
  scene?: string;
}) {
  useEffect(
    () =>
      bindPageFunnel({
        tenantSlug: props.tenantSlug,
        surface: props.surface,
        moduleKey: props.moduleKey,
        targetStoreId: props.targetStoreId,
        shareCode: props.shareCode,
        source: props.source,
        scene: props.scene,
      }),
    [
      props.tenantSlug,
      props.surface,
      props.moduleKey,
      props.targetStoreId,
      props.shareCode,
      props.source,
      props.scene,
    ],
  );
  return null;
}
