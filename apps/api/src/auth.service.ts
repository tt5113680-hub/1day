import { Injectable, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import {
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from '@oneday/auth';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import { requireAuthTokenSecret } from './runtime-config';

const accessLifetimeMs = 15 * 60 * 1000;
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  private readonly secret = requireAuthTokenSecret();

  async login(
    email: string,
    password: string,
    tenantId?: string,
    tenantSlug?: string,
    deviceName?: string,
  ) {
    const user = await this.pool.query(
      'select id, password_hash from users where email = $1 and deleted_at is null and status = $2',
      [email, 'active'],
    );
    if (user.rowCount !== 1 || !(await verifyPassword(password, user.rows[0].password_hash)))
      throw new UnauthorizedException('AUTH_REQUIRED');
    if (!tenantId && tenantSlug) {
      const tenant = await this.pool.query(
        'select id from tenants where slug = $1 and status = $2 and deleted_at is null',
        [tenantSlug, 'active'],
      );
      if (tenant.rowCount !== 1) throw new UnauthorizedException('AUTH_REQUIRED');
      tenantId = tenant.rows[0].id;
    }
    if (!tenantId) throw new UnauthorizedException('AUTH_REQUIRED');
    const membership = await this.pool.query(
      'select id from memberships where user_id = $1 and tenant_id = $2 and status = $3 and deleted_at is null',
      [user.rows[0].id, tenantId, 'active'],
    );
    if (membership.rowCount !== 1) throw new UnauthorizedException('AUTH_REQUIRED');
    return this.createSession(user.rows[0].id, tenantId, deviceName ?? null);
  }

  async refresh(refreshToken: string) {
    const session = await this.pool.query(
      'select id, user_id, tenant_id, expires_at from auth_sessions where refresh_token_hash = $1 and revoked_at is null and status = $2 and deleted_at is null',
      [hashRefreshToken(refreshToken), 'active'],
    );
    if (session.rowCount !== 1 || new Date(session.rows[0].expires_at).getTime() <= Date.now())
      throw new UnauthorizedException('AUTH_REQUIRED');
    await this.pool.query(
      'update auth_sessions set revoked_at = now(), status = $1 where id = $2',
      ['revoked', session.rows[0].id],
    );
    return this.createSession(session.rows[0].user_id, session.rows[0].tenant_id, null);
  }

  async revoke(accessToken: string, sessionId?: string) {
    const claims = await this.claims(accessToken);
    const id = sessionId ?? claims.sessionId;
    const result = await this.pool.query(
      'update auth_sessions set revoked_at = now(), status = $1 where id = $2 and tenant_id = $3 and user_id = $4 and revoked_at is null',
      ['revoked', id, claims.tenantId, claims.sub],
    );
    if (result.rowCount !== 1) throw new UnauthorizedException('AUTH_REQUIRED');
  }

  async claims(accessToken: string) {
    const claims = verifyAccessToken(accessToken, this.secret);
    if (!claims) throw new UnauthorizedException('AUTH_REQUIRED');
    const session = await this.pool.query(
      "select 1 from auth_sessions where id=$1 and user_id=$2 and tenant_id=$3 and status='active' and revoked_at is null and expires_at>now() and deleted_at is null",
      [claims.sessionId, claims.sub, claims.tenantId],
    );
    if (session.rowCount !== 1) throw new UnauthorizedException('AUTH_REQUIRED');
    return claims;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async createSession(userId: string, tenantId: string, deviceName: string | null) {
    const sessionId = randomUUID();
    const refreshToken = newRefreshToken();
    const exp = Date.now() + accessLifetimeMs;
    await this.pool.query(
      'insert into auth_sessions (id, tenant_id, user_id, refresh_token_hash, device_name, expires_at, status) values ($1,$2,$3,$4,$5,$6,$7)',
      [
        sessionId,
        tenantId,
        userId,
        hashRefreshToken(refreshToken),
        deviceName,
        new Date(Date.now() + refreshLifetimeMs),
        'active',
      ],
    );
    return {
      accessToken: signAccessToken({ sub: userId, tenantId, sessionId, exp }, this.secret),
      refreshToken,
      expiresAt: exp,
    };
  }
}
