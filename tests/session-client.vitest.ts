import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionApiClient } from '../packages/session-client/src/index.js';

const keys = ['oneday.accessToken', 'oneday.refreshToken', 'oneday.accessExpiresAt'];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SessionApiClient', () => {
  it('refreshes an otherwise unexpired session after a protected request receives 401', async () => {
    const values = new Map<string, string>([
      ['oneday.accessToken', 'old-access'],
      ['oneday.refreshToken', 'refresh-token'],
      ['oneday.accessExpiresAt', String(Date.now() + 60_000)],
    ]);
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const responses = [
      new Response(null, { status: 401 }),
      new Response(
        JSON.stringify({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresAt: Date.now() + 120_000,
        }),
        { status: 201 },
      ),
      new Response(JSON.stringify({ data: 'ok' }), { status: 200 }),
    ];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({
        url,
        authorization: new Headers(init?.headers).get('authorization'),
      });
      return responses.shift()!;
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await new SessionApiClient('https://api.example.test').request('/protected');

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requests).toEqual([
      { url: 'https://api.example.test/protected', authorization: 'Bearer old-access' },
      { url: 'https://api.example.test/api/v1/auth/refresh', authorization: null },
      { url: 'https://api.example.test/protected', authorization: 'Bearer new-access' },
    ]);
    expect(values.get('oneday.accessToken')).toBe('new-access');
    expect(keys.every((key) => values.has(key))).toBe(true);
  });
});
