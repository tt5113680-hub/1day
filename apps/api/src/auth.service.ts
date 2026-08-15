import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import {
  hashPassword,
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from '@oneday/auth';
import { createHash, randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import { requireAuthTokenSecret } from './runtime-config';

const accessLifetimeMs = 15 * 60 * 1000;
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const CODE = /^[A-Z0-9]{12,48}$/;

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

  async activateOwner(body: {
    token?: string;
    code?: string;
    password: string;
    deviceName?: string;
  }) {
    const password = body.password?.trim() ?? '';
    if (password.length < 12) throw new BadRequestException('VALIDATION_ERROR');
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!token && !code) throw new BadRequestException('VALIDATION_ERROR');
    if (code && !CODE.test(code)) throw new BadRequestException('VALIDATION_ERROR');

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      let row: {
        id: string;
        tenant_id: string;
        run_id: string;
        user_id: string;
        email: string;
        slug: string;
      };
      if (token) {
        const found = await client.query(
          `select t.id,t.tenant_id,t.run_id,t.user_id,u.email,tn.slug
           from owner_activation_tokens t
           join users u on u.id=t.user_id and u.deleted_at is null
           join tenants tn on tn.id=t.tenant_id and tn.deleted_at is null
           where t.token_hash=$1 and t.status='pending' and t.expires_at>now() and t.deleted_at is null
           for update of t`,
          [hashToken(token)],
        );
        if (!found.rowCount) throw new NotFoundException('NOT_FOUND');
        row = found.rows[0];
      } else {
        const found = await client.query(
          `select t.id,t.tenant_id,t.run_id,t.user_id,u.email,tn.slug
           from one_code_entries oce
           join owner_activation_tokens t on t.one_code_entry_id=oce.id and t.tenant_id=oce.tenant_id
             and t.status='pending' and t.expires_at>now() and t.deleted_at is null
           join users u on u.id=t.user_id and u.deleted_at is null
           join tenants tn on tn.id=t.tenant_id and tn.deleted_at is null
           where oce.code=$1 and oce.scene='owner_activation' and oce.status='active' and oce.deleted_at is null
           for update of t`,
          [code],
        );
        if (!found.rowCount) throw new NotFoundException('NOT_FOUND');
        row = found.rows[0];
      }

      const run = await client.query(
        "select id,state from tenant_provisioning_runs where id=$1 and tenant_id=$2 and deleted_at is null for update",
        [row.run_id, row.tenant_id],
      );
      if (!run.rowCount) throw new NotFoundException('NOT_FOUND');
      if (run.rows[0].state !== 'awaiting_activation' && run.rows[0].state !== 'ready')
        throw new ConflictException('CONFLICT');

      const passwordHash = await hashPassword(password);
      await client.query(
        "update users set password_hash=$2,status='active',updated_at=now(),version=version+1 where id=$1",
        [row.user_id, passwordHash],
      );
      await client.query(
        "update owner_activation_tokens set status='used',used_at=now(),updated_at=now(),version=version+1 where id=$1",
        [row.id],
      );

      if (run.rows[0].state === 'awaiting_activation') {
        const verification = {
          owner_activated: true,
          activationMode: 'token',
          awaitingActivation: false,
        };
        await client.query(
          "update tenant_provisioning_steps set state='succeeded',attempts=attempts+1,ended_at=now(),output=coalesce(output,'{}'::jsonb)||$3::jsonb,updated_at=now(),version=version+1 where run_id=$1 and step_code=$2",
          [row.run_id, 'activate_verify', verification],
        );
        await client.query(
          "update tenant_provisioning_steps set state='succeeded',attempts=attempts+1,started_at=coalesce(started_at,now()),ended_at=now(),output=$3,updated_at=now(),version=version+1 where run_id=$1 and step_code=$2",
          [
            row.run_id,
            'ready_handoff',
            { ready: true, tenantId: row.tenant_id, activatedVia: 'owner_activation_token' },
          ],
        );
        await client.query(
          "update tenant_provisioning_runs set state='ready',ready_at=now(),verification=coalesce(verification,'{}'::jsonb)||$2::jsonb,updated_at=now(),version=version+1 where id=$1",
          [row.run_id, { owner_activated: true, awaitingActivation: false }],
        );
        const detail = {
          runId: row.run_id,
          tenantId: row.tenant_id,
          userId: row.user_id,
          activatedVia: token ? 'token' : 'owner_code',
        };
        await client.query(
          "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.tenant_ready','tenant_provisioning_run',$4,$5,'owner-activation',$6,$3,$3)",
          [randomUUID(), row.tenant_id, row.user_id, row.run_id, randomUUID(), detail],
        );
        await client.query(
          "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'tenant.provisioning.ready.v1','tenant_provisioning_run',$3,$4,$5,'owner-activation',$6,$6)",
          [randomUUID(), row.tenant_id, row.run_id, detail, randomUUID(), row.user_id],
        );
      }

      await client.query('commit');
      const session = await this.createSession(row.user_id, row.tenant_id, body.deviceName ?? null);
      return {
        ...session,
        tenantId: row.tenant_id,
        tenantSlug: row.slug,
        email: row.email,
        runId: row.run_id,
        state: 'ready',
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
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
