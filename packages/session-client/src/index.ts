export type Session = { accessToken: string; refreshToken: string; expiresAt: number };
export type LoginTenant = { id?: string; slug?: string };
const accessKey = 'oneday.accessToken';
const refreshKey = 'oneday.refreshToken';
const expiryKey = 'oneday.accessExpiresAt';

export class BrowserSession {
  private static refreshInFlight: Promise<Session> | null = null;
  constructor(private readonly apiBase: string) {}
  private get storage() {
    return window.sessionStorage;
  }
  async login(
    email: string,
    password: string,
    tenant: LoginTenant,
    deviceName: string,
  ): Promise<Session> {
    const response = await fetch(`${this.apiBase}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        deviceName,
      }),
    });
    if (!response.ok) throw new Error('LOGIN_FAILED');
    return this.save((await response.json()) as Session);
  }
  async accessToken(): Promise<string | null> {
    const token = this.storage.getItem(accessKey);
    const expiresAt = Number(this.storage.getItem(expiryKey) ?? 0);
    if (token && expiresAt > Date.now() + 30_000) return token;
    try {
      return (await this.refresh()).accessToken;
    } catch {
      this.clear();
      return null;
    }
  }
  async refresh(): Promise<Session> {
    if (BrowserSession.refreshInFlight) return BrowserSession.refreshInFlight;
    BrowserSession.refreshInFlight = this.performRefresh();
    try {
      return await BrowserSession.refreshInFlight;
    } finally {
      BrowserSession.refreshInFlight = null;
    }
  }
  private async performRefresh(): Promise<Session> {
    const refreshToken = this.storage.getItem(refreshKey);
    if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');
    const response = await fetch(`${this.apiBase}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) throw new Error('REFRESH_FAILED');
    return this.save((await response.json()) as Session);
  }
  async logout(): Promise<void> {
    const token = this.storage.getItem(accessKey);
    try {
      if (token)
        await fetch(`${this.apiBase}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        });
    } finally {
      this.clear();
    }
  }
  private save(session: Session): Session {
    this.storage.setItem(accessKey, session.accessToken);
    this.storage.setItem(refreshKey, session.refreshToken);
    this.storage.setItem(expiryKey, String(session.expiresAt));
    return session;
  }
  clear() {
    this.storage.removeItem(accessKey);
    this.storage.removeItem(refreshKey);
    this.storage.removeItem(expiryKey);
  }
}

export { SessionControls, SessionGuard, SessionLogin } from './components.js';
