'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppStatePanel, Button, FormField, Input } from '@oneday/ui';
import { BrowserSession } from './index.js';

export function SessionLogin({
  apiBase,
  deviceName,
  destination,
  title,
  subtitle,
}: {
  apiBase: string;
  deviceName: string;
  destination: string;
  title: string;
  subtitle?: string;
}) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
    <main className="od-session-login">
      <section className="od-session-login__card">
        <p className="od-session-login__brand">ONEDAY · 安全登录</p>
        <h1>{title}</h1>
        {subtitle ? <p className="od-session-login__subtitle">{subtitle}</p> : null}
        <form onSubmit={submit} noValidate>
          <FormField label="租户标识" htmlFor="tenantSlug">
            <Input
              id="tenantSlug"
              name="tenantSlug"
              required
              autoComplete="organization"
              placeholder="例如 luckin-oneday-human-pilot"
            />
          </FormField>
          <FormField label="邮箱" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="name@company.com"
            />
          </FormField>
          <FormField label="密码" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="请输入密码"
            />
          </FormField>
          <Button type="submit" loading={submitting} className="od-session-login__submit">
            登录
          </Button>
          {error ? <AppStatePanel kind="error" title="登录未成功" description={error} /> : null}
        </form>
      </section>
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
  return ready ? (
    <>{children}</>
  ) : (
    <main className="od-session-recovery">
      <AppStatePanel kind="loading" title="正在恢复安全会话" description="请稍候…" />
    </main>
  );
}

export function SessionControls({ apiBase, loginPath }: { apiBase: string; loginPath: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void new BrowserSession(apiBase).accessToken().then((token) => setSignedIn(Boolean(token)));
  }, [apiBase]);
  if (!signedIn) return null;
  return (
    <Button
      tone="quiet"
      className="od-session-control"
      onClick={async () => {
        await new BrowserSession(apiBase).logout();
        window.location.assign(loginPath);
      }}
    >
      退出登录
    </Button>
  );
}
