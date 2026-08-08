'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { BrowserSession } from './index.js';

export function SessionLogin({
  apiBase,
  deviceName,
  destination,
  title,
}: {
  apiBase: string;
  deviceName: string;
  destination: string;
  title: string;
}) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (form: FormData) => {
    setSubmitting(true);
    setError('');
    try {
      await new BrowserSession(apiBase).login(
        String(form.get('email')),
        String(form.get('password')),
        { slug: String(form.get('tenantSlug')).trim() },
        deviceName,
      );
      window.location.assign(destination);
    } catch {
      setError('登录失败，请检查租户、账号和密码。');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main>
      <h1>{title}</h1>
      <form action={submit}>
        <input name="tenantSlug" required autoComplete="organization" placeholder="租户标识" />
        <input name="email" type="email" required autoComplete="username" placeholder="邮箱" />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="密码"
        />
        <button disabled={submitting}>{submitting ? '正在登录…' : '登录'}</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}

export function SessionGuard({
  apiBase,
  loginPath,
  children,
}: {
  apiBase: string;
  loginPath: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.location.pathname === loginPath) return setReady(true);
    void new BrowserSession(apiBase).accessToken().then((token) => {
      if (!token) return window.location.replace(loginPath);
      setReady(true);
    });
  }, [apiBase, loginPath]);
  return ready ? <>{children}</> : <main>正在恢复安全会话…</main>;
}

export function SessionControls({ apiBase, loginPath }: { apiBase: string; loginPath: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void new BrowserSession(apiBase).accessToken().then((token) => setSignedIn(Boolean(token)));
  }, [apiBase]);
  if (!signedIn) return null;
  return (
    <button
      onClick={async () => {
        await new BrowserSession(apiBase).logout();
        window.location.assign(loginPath);
      }}
    >
      退出登录
    </button>
  );
}
