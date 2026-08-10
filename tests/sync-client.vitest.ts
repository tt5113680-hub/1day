import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorefrontSyncClient, TenantSyncClient } from '../packages/sync-client/src/clients';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TenantSyncClient', () => {
  it('maps 304 to not-modified and keeps etag', async () => {
    const session = {
      request: vi.fn(async () => new Response(null, { status: 304, headers: { etag: '"v1"' } })),
    };
    const client = new TenantSyncClient('http://api.test', session as never);
    const result = await client.pollChanges(['operating'], { etag: '"v1"' });
    expect(result).toEqual({ status: 'not-modified', etag: '"v1"', pollAfterSeconds: 30 });
    expect(session.request).toHaveBeenCalledOnce();
  });

  it('returns modified changes payload', async () => {
    const session = {
      request: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                cursor: 'c1',
                pollAfterSeconds: 15,
                topics: ['operating'],
                changes: [{ id: 'n1', topic: 'operating', eventType: 'employee.task.created.v1' }],
              },
              meta: { etag: '"v2"' },
            }),
            { status: 200, headers: { etag: '"v2"', 'content-type': 'application/json' } },
          ),
      ),
    };
    const client = new TenantSyncClient('http://api.test', session as never);
    const result = await client.pollChanges(['operating']);
    expect(result.status).toBe('modified');
    if (result.status === 'modified') {
      expect(result.etag).toBe('"v2"');
      expect(result.changes).toHaveLength(1);
      expect(result.pollAfterSeconds).toBe(15);
    }
  });
});

describe('StorefrontSyncClient', () => {
  it('detects version fingerprint change across polls', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              publishedVersion: 'v1',
              authEpoch: 1,
              updatedAt: null,
              etag: '"s1"',
              pollAfterSeconds: 1,
            },
            meta: { etag: '"s1"', pollAfterSeconds: 1 },
          }),
          { status: 200, headers: { etag: '"s1"', 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              publishedVersion: 'v2',
              authEpoch: 1,
              updatedAt: null,
              etag: '"s2"',
              pollAfterSeconds: 1,
            },
            meta: { etag: '"s2"', pollAfterSeconds: 1 },
          }),
          { status: 200, headers: { etag: '"s2"', 'content-type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const client = new StorefrontSyncClient('http://api.test');
    const updates: string[] = [];
    const sub = client.startPolling('demo', '00000000-0000-4000-8000-000000000099', (result) => {
      updates.push(result.publishedVersion ?? '');
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await vi.waitFor(() => expect(updates).toEqual(['v2']), { timeout: 3000 });
    sub.stop();
  });
});
