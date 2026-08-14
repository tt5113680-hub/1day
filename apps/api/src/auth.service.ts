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
      "select m.id from memberships m join tenants t on t.id=m.tenant_id and t.status='active' and t.deleted_at is null where m.user_id=$1 and m.tenant_id=$2 and m.status='active' and m.deleted_at is null",
      [user.rows[0].id, tenantId],
    );
    if (membership.rowCount !== 1) throw new UnauthorizedException('AUTH_REQUIRED');
    return this.createSession(user.rows[0].id, tenantId, deviceName ?? null);
  }

  async refresh(refreshToken: string) {
    const session = await this.pool.query(
      "select s.id,s.user_id,s.tenant_id,s.expires_at,s.auth_epoch,t.auth_epoch as tenant_auth_epoch from auth_sessions s join tenants t on t.id=s.tenant_id and t.status='active' and t.deleted_at is null where s.refresh_token_hash=$1 and s.revoked_at is null and s.status='active' and s.deleted_at is null",
      [hashRefreshToken(refreshToken)],
    );
    if (session.rowCount !== 1 || new Date(session.rows[0].expires_at).getTime() <= Date.now())
      throw new UnauthorizedException('AUTH_REQUIRED');
    // Epoch belt-and-suspenders: a session minted in an earlier auth_epoch cannot be
    // rotated, even if the mass-revoke UPDATE missed it — tenant suspension already
    // bumped `tenants.auth_epoch`, so old-epoch sessions are permanently dead.
    if (session.rows[0].auth_epoch !== session.rows[0].tenant_auth_epoch)
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
      "select 1 from auth_sessions s join tenants t on t.id=s.tenant_id and t.status='active' and t.deleted_at is null where s.id=$1 and s.user_id=$2 and s.tenant_id=$3 and s.status='active' and s.revoked_at is null and s.expires_at>now() and s.deleted_at is null and s.auth_epoch=t.auth_epoch",
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
    // Snapshot the tenant's current auth_epoch into the session. On suspend the tenant
    // auth_epoch bumps, so any session minted in an earlier epoch is immediately dead
    // (claims()/refresh() compare s.auth_epoch = t.auth_epoch). On the same connection
    // we read the epoch right before insert to keep the snapshot truthful.
    const tenantRow = await this.pool.query(
      'select auth_epoch from tenants where id=$1 and deleted_at is null',
      [tenantId],
    );
    const authEpoch = tenantRow.rowCount === 1 ? Number(tenantRow.rows[0].auth_epoch) : 0;
    await this.pool.query(
      'insert into auth_sessions (id, tenant_id, user_id, refresh_token_hash, device_name, auth_epoch, expires_at, status) values ($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        sessionId,
        tenantId,
        userId,
        hashRefreshToken(refreshToken),
        deviceName,
        authEpoch,
        new Date(Date.now() + refreshLifetimeMs),
        'active',
      ],
    );
    return {
      accessToken: signAccessToken({ sub: userId, tenantId, sessionId, exp }, this.secret),
      refreshToken,
      expiresAt: exp,
      authEpoch,
    };
  }
}
