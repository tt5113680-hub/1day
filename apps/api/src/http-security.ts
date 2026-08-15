import { createHash, randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';

export type RateLimitBucket = 'auth' | 'public-write';

export interface HttpSecurityConfiguration {
  corsOrigins: string[];
  trustProxy: boolean;
  rateLimitEnabled: boolean;
  rateLimitNamespace: string;
  rateLimitWindowMs: number;
  authRateLimit: number;
  publicWriteRateLimit: number;
}

function enabled(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function parseCorsOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  for (const origin of origins) {
    if (origin === '*' || origin.includes('*'))
      throw new Error(
        'CORS_ORIGINS must contain explicit HTTP(S) origins; wildcards are forbidden.',
      );
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin)
      throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
  }
  return [...new Set(origins)];
}

export function getHttpSecurityConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): HttpSecurityConfiguration {
  const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS);
  const production = env.NODE_ENV === 'production';
  const trustProxy = enabled(env.TRUST_PROXY);
  const rateLimitNamespace = (env.RATE_LIMIT_NAMESPACE ?? 'development').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(rateLimitNamespace))
    throw new Error(
      'RATE_LIMIT_NAMESPACE must use 1-32 letters, numbers, underscores, or hyphens.',
    );

  if (production) {
    if (!corsOrigins.length) throw new Error('CORS_ORIGINS is required in production.');
    const publicUrl = env.PUBLIC_BASE_URL?.trim();
    if (!publicUrl || new URL(publicUrl).protocol !== 'https:')
      throw new Error('PUBLIC_BASE_URL must be an HTTPS URL in production.');
    if (!enabled(env.TLS_TERMINATED_BY_PROXY))
      throw new Error('TLS_TERMINATED_BY_PROXY=true is required in production.');
    if (!trustProxy)
      throw new Error('TRUST_PROXY=true is required with production TLS termination.');
    if (!enabled(env.RATE_LIMIT_TRUSTED_EDGE))
      throw new Error('RATE_LIMIT_TRUSTED_EDGE=true is required in production.');
    if (rateLimitNamespace === 'development')
      throw new Error('RATE_LIMIT_NAMESPACE is required in production.');
  }

  return {
    corsOrigins,
    trustProxy,
    rateLimitEnabled: production || enabled(env.RATE_LIMIT_ENABLED),
    rateLimitNamespace,
    rateLimitWindowMs: positiveInteger(env.RATE_LIMIT_WINDOW_MS, 60_000, 'RATE_LIMIT_WINDOW_MS'),
    authRateLimit: positiveInteger(env.RATE_LIMIT_AUTH_MAX, 10, 'RATE_LIMIT_AUTH_MAX'),
    publicWriteRateLimit: positiveInteger(
      env.RATE_LIMIT_PUBLIC_WRITE_MAX,
      30,
      'RATE_LIMIT_PUBLIC_WRITE_MAX',
    ),
  };
}

export function routeRateLimit(pathname: string, method: string): RateLimitBucket | undefined {
  if (method === 'POST' && ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/owner-activate'].includes(pathname))
    return 'auth';
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
    (pathname.startsWith('/api/v1/consumer/') || pathname.startsWith('/api/v1/public/'))
  )
    return 'public-write';
  return undefined;
}

export class DatabaseRateLimiter {
  private readonly pool = createApiPool();
  private attemptsSincePrune = 0;

  async consume(bucket: string, subject: string, max: number, windowMs: number): Promise<boolean> {
    const now = new Date();
    const windowStartedAt = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    const expiresAt = new Date(windowStartedAt.getTime() + windowMs * 2);
    const subjectHash = createHash('sha256').update(subject).digest('hex');
    const result = await this.pool.query<{ request_count: number }>(
      `insert into rate_limit_windows (bucket, subject_hash, window_started_at, request_count, expires_at)
       values ($1, $2, $3, 1, $4)
       on conflict (bucket, subject_hash, window_started_at)
       do update set request_count = rate_limit_windows.request_count + 1, updated_at = now()
       returning request_count`,
      [bucket, subjectHash, windowStartedAt, expiresAt],
    );
    this.attemptsSincePrune += 1;
    if (this.attemptsSincePrune >= 100) {
      this.attemptsSincePrune = 0;
      await this.pool.query('delete from rate_limit_windows where expires_at < now()');
    }
    const count = result.rows[0]?.request_count;
    if (count === undefined) throw new Error('Rate limit counter did not return a request count.');
    return count <= max;
  }
}

export function addRequestId(
  request: { headers: Record<string, string | string[] | undefined> },
  reply: { header(name: string, value: string): unknown },
): void {
  const requestId = request.headers['x-request-id'];
  reply.header(
    'x-request-id',
    typeof requestId === 'string' && requestId.length <= 128 ? requestId : randomUUID(),
  );
}
