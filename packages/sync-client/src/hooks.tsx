'use client';

import { useEffect, useRef } from 'react';
import type { SessionApiClient } from '@oneday/session-client';
import {
  StorefrontSyncClient,
  TenantSyncClient,
  type SyncChange,
  type SyncTopic,
} from './clients.js';

export function useTenantSync(
  apiBase: string,
  session: SessionApiClient,
  topics: SyncTopic[],
  onInvalidate: (changes: SyncChange[]) => void,
  enabled = true,
) {
  const callback = useRef(onInvalidate);
  callback.current = onInvalidate;
  const topicKey = topics.join(',');
  useEffect(() => {
    if (!enabled || !topics.length) return;
    const client = new TenantSyncClient(apiBase, session);
    const sub = client.startPolling([...topics], (changes) => callback.current(changes));
    return () => sub.stop();
    // topics identity is represented by topicKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, enabled, session, topicKey]);
}

export function useStorefrontSync(
  apiBase: string,
  tenant: string,
  storeId: string,
  onUpdate: () => void,
  enabled = true,
) {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  useEffect(() => {
    if (!enabled || !tenant || !storeId) return;
    const client = new StorefrontSyncClient(apiBase);
    const sub = client.startPolling(tenant, storeId, () => callback.current());
    return () => sub.stop();
  }, [apiBase, enabled, storeId, tenant]);
}
