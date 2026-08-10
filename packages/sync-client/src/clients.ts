import type { SessionApiClient } from '@oneday/session-client';

export type SyncTopic =
  | 'operating'
  | 'storefront'
  | 'content'
  | 'membership'
  | 'lifecycle'
  | 'rbac'
  | 'circle';

export type SyncChange = {
  id: string;
  topic: SyncTopic | string;
  eventType: string;
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  correlationId: string | null;
  occurredAt: string;
  storeId: string | null;
};

export type PollChangesResult =
  | {
      status: 'modified';
      etag: string;
      pollAfterSeconds: number;
      cursor: string;
      topics: string[];
      changes: SyncChange[];
    }
  | { status: 'not-modified'; etag: string; pollAfterSeconds: number };

export type StorefrontVersionResult =
  | {
      status: 'modified';
      etag: string;
      pollAfterSeconds: number;
      publishedVersion: string | null;
      authEpoch: number;
      updatedAt: string | null;
    }
  | { status: 'not-modified'; etag: string; pollAfterSeconds: number };

export type SyncSubscription = { stop: () => void };

const DEFAULT_POLL_SECONDS = 30;

function requestId() {
  return crypto.randomUUID();
}

function pollDelay(seconds: number) {
  return Math.max(1, Number.isFinite(seconds) ? seconds : DEFAULT_POLL_SECONDS) * 1000;
}

/** Authenticated ETag poll for Management / Employee surfaces. */
export class TenantSyncClient {
  constructor(
    private readonly apiBase: string,
    private readonly session: SessionApiClient,
  ) {}

  async pollChanges(
    topics: SyncTopic[],
    options: { etag?: string; since?: string; signal?: AbortSignal } = {},
  ): Promise<PollChangesResult> {
    const params = new URLSearchParams();
    if (topics.length) params.set('topics', topics.join(','));
    if (options.since) params.set('since', options.since);
    const headers: Record<string, string> = {};
    if (options.etag) headers['if-none-match'] = options.etag;
    const response = await this.session.request(
      `${this.apiBase}/api/v1/sync/changes?${params.toString()}`,
      { headers, signal: options.signal },
    );
    const etag = response.headers.get('etag') ?? options.etag ?? '';
    if (response.status === 304) {
      return { status: 'not-modified', etag, pollAfterSeconds: DEFAULT_POLL_SECONDS };
    }
    if (!response.ok) throw new Error(`SYNC_POLL_FAILED:${response.status}`);
    const body = (await response.json()) as {
      data: {
        cursor: string;
        pollAfterSeconds: number;
        topics: string[];
        changes: SyncChange[];
      };
      meta?: { etag?: string };
    };
    return {
      status: 'modified',
      etag: body.meta?.etag ?? etag,
      pollAfterSeconds: body.data.pollAfterSeconds ?? DEFAULT_POLL_SECONDS,
      cursor: body.data.cursor,
      topics: body.data.topics,
      changes: body.data.changes ?? [],
    };
  }

  startPolling(
    topics: SyncTopic[],
    onInvalidate: (changes: SyncChange[]) => void,
    options: { etag?: string } = {},
  ): SyncSubscription {
    let stopped = false;
    let etag = options.etag;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const tick = async () => {
      if (stopped) return;
      try {
        const result = await this.pollChanges(topics, { etag, signal: controller.signal });
        etag = result.etag;
        if (result.status === 'modified' && result.changes.length) onInvalidate(result.changes);
        if (!stopped) timer = setTimeout(() => void tick(), pollDelay(result.pollAfterSeconds));
      } catch {
        if (!stopped) timer = setTimeout(() => void tick(), pollDelay(DEFAULT_POLL_SECONDS));
      }
    };

    timer = setTimeout(() => void tick(), 250);
    return {
      stop: () => {
        stopped = true;
        controller.abort();
        if (timer) clearTimeout(timer);
      },
    };
  }
}

/** Public storefront version poll for Consumer. */
export class StorefrontSyncClient {
  constructor(private readonly apiBase: string) {}

  async pollVersion(
    tenant: string,
    storeId: string,
    options: { etag?: string; signal?: AbortSignal } = {},
  ): Promise<StorefrontVersionResult> {
    const params = new URLSearchParams({ tenant, storeId });
    const headers: Record<string, string> = { 'x-request-id': requestId() };
    if (options.etag) headers['if-none-match'] = options.etag;
    const response = await fetch(
      `${this.apiBase}/api/v1/public/sync/storefront?${params.toString()}`,
      { headers, signal: options.signal },
    );
    const etag = response.headers.get('etag') ?? options.etag ?? '';
    if (response.status === 304) {
      return { status: 'not-modified', etag, pollAfterSeconds: DEFAULT_POLL_SECONDS };
    }
    if (!response.ok) throw new Error(`STOREFRONT_SYNC_FAILED:${response.status}`);
    const body = (await response.json()) as {
      data: {
        publishedVersion: string | null;
        authEpoch: number;
        updatedAt: string | null;
        etag: string;
        pollAfterSeconds: number;
      };
      meta?: { etag?: string; pollAfterSeconds?: number };
    };
    return {
      status: 'modified',
      etag: body.meta?.etag ?? body.data.etag ?? etag,
      pollAfterSeconds:
        body.meta?.pollAfterSeconds ?? body.data.pollAfterSeconds ?? DEFAULT_POLL_SECONDS,
      publishedVersion: body.data.publishedVersion,
      authEpoch: body.data.authEpoch,
      updatedAt: body.data.updatedAt,
    };
  }

  startPolling(
    tenant: string,
    storeId: string,
    onUpdate: (result: Extract<StorefrontVersionResult, { status: 'modified' }>) => void,
    options: { etag?: string } = {},
  ): SyncSubscription {
    let stopped = false;
    let etag = options.etag;
    let baseline: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const tick = async () => {
      if (stopped) return;
      try {
        const result = await this.pollVersion(tenant, storeId, {
          etag,
          signal: controller.signal,
        });
        etag = result.etag;
        if (result.status === 'modified') {
          const fingerprint = `${result.publishedVersion ?? ''}:${result.authEpoch}`;
          if (baseline === null) baseline = fingerprint;
          else if (fingerprint !== baseline) {
            baseline = fingerprint;
            onUpdate(result);
          }
        }
        if (!stopped) timer = setTimeout(() => void tick(), pollDelay(result.pollAfterSeconds));
      } catch {
        if (!stopped) timer = setTimeout(() => void tick(), pollDelay(DEFAULT_POLL_SECONDS));
      }
    };

    timer = setTimeout(() => void tick(), 500);
    return {
      stop: () => {
        stopped = true;
        controller.abort();
        if (timer) clearTimeout(timer);
      },
    };
  }
}
