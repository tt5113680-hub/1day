'use client';
import { SessionApiClient } from '@oneday/session-client';

import { useCallback, useEffect, useState } from 'react';
import styles from './employee-profile.module.css';

type Data = {
  employee: {
    id: string;
    displayName: string;
    email: string;
    employeeCode: string;
    title: string | null;
  };
  organization: { name: string; code: string; type: string };
  stores: { id: string; name: string; code: string; address: string | null }[];
  permissions: string[];
  notificationPreference: { doNotDisturbUntil: string | null; version: number };
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const tools = [
  ['我的任务', '/e/workbench'],
  ['客户与跟进', '/e/nurture'],
  ['获客池', '/e/leads'],
  ['通知中心', '/e/notifications'],
  ['分享工具', '/e/share'],
];

export function EmployeeProfile() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const headers = () => ({
    'content-type': 'application/json',
  });
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/profile`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const dnd = async () => {
    if (!data) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/profile/notification-preferences`,
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            version: data.notificationPreference.version,
            doNotDisturbUntil: data.notificationPreference.doNotDisturbUntil
              ? null
              : new Date(Date.now() + 8 * 3600000).toISOString(),
          }),
        },
      );
      if (!response.ok) throw Error('DND');
      setMessage('通知设置已更新。');
      await load();
    } catch {
      setMessage('设置未更新，请刷新后重试。');
    } finally {
      setBusy(false);
    }
  };
  if (state === 'loading') return <main className={styles.centered}>正在整理个人工作空间…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无法查看个人空间</h1>
          <p>请使用已授权的员工账号登录。</p>
          <a href="/e/workbench">返回工作台</a>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>个人空间暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  const muted = Boolean(
    data.notificationPreference.doNotDisturbUntil &&
    new Date(data.notificationPreference.doNotDisturbUntil) > new Date(),
  );
  return (
    <main className={styles.page}>
      <header>
        <p>ONEDAY / 我的工作空间</p>
        <h1>{data.employee.displayName}</h1>
        <span>
          {data.employee.title ?? '员工'} · {data.employee.employeeCode}
        </span>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <section className={styles.card}>
        <h2>个人与组织</h2>
        <p>{data.employee.email}</p>
        <strong>{data.organization.name}</strong>
        <small>
          {data.organization.type} · {data.organization.code}
        </small>
      </section>
      <section className={styles.card}>
        <h2>服务门店</h2>
        {data.stores.length ? (
          data.stores.map((store) => (
            <p key={store.id}>
              <strong>{store.name}</strong> · {store.address ?? store.code}
            </p>
          ))
        ) : (
          <p>当前组织尚未配置门店。</p>
        )}
      </section>
      <section className={styles.card}>
        <h2>已授予权限</h2>
        <div className={styles.chips}>
          {data.permissions.length ? (
            data.permissions.map((permission) => <span key={permission}>{permission}</span>)
          ) : (
            <span>暂无可用权限</span>
          )}
        </div>
      </section>
      <section className={styles.card}>
        <h2>通知设置</h2>
        <p>
          {muted
            ? `免打扰至 ${new Date(data.notificationPreference.doNotDisturbUntil!).toLocaleString()}`
            : '提醒处于开启状态'}
        </p>
        <button disabled={busy} onClick={() => void dnd()}>
          {busy ? '处理中…' : muted ? '恢复提醒' : '免打扰 8 小时'}
        </button>
      </section>
      <section className={styles.card}>
        <h2>常用工具</h2>
        <nav className={styles.tools}>
          {tools.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
              <span>›</span>
            </a>
          ))}
        </nav>
      </section>
    </main>
  );
}
