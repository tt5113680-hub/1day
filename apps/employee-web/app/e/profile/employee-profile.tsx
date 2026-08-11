'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, Card, StatusBadge, businessLabel } from '@oneday/ui';

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
  ['任务收件箱', '/e/tasks'],
  ['客户目录', '/e/customers'],
  ['获客池', '/e/leads'],
  ['会员核销', '/e/memberships'],
  ['分享工具', '/e/share'],
  ['通知中心', '/e/notifications'],
];
const permissionNames: Record<string, string> = {
  'action.manage': '管理外部行动',
  'action.read': '查看外部行动',
  'attribution.manage': '管理归因',
  'attribution.read': '查看归因',
  'circle.manage': '管理商圈',
  'customer.manage': '管理客户',
  'customer.read': '查看客户',
  'employee.manage': '管理员工',
  'employee.read': '查看员工',
  'evidence.manage': '管理业务证据',
  'evidence.read': '查看业务证据',
  'organization.manage': '管理组织',
  'organization.read': '查看组织',
  'ownership.approve': '审批客户归属',
  'page.manage': '管理页面模板',
  'page.read': '查看页面模板',
  'platform.manage': '管理平台治理',
  'platform.read': '查看平台治理',
  'task.manage': '管理任务',
  'task.read': '查看任务',
  'tenant.manage': '管理租户经营',
  'tenant.read': '查看租户经营',
  'workflow.manage': '管理运营流程',
  'workflow.read': '查看运营流程',
};

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
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在整理个人工作空间"
          description="正在同步你的组织、门店与权限上下文。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看个人空间"
          description="请使用已授权的员工账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="个人空间暂不可用"
          description="个人与组织信息未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const muted = Boolean(
    data.notificationPreference.doNotDisturbUntil &&
    new Date(data.notificationPreference.doNotDisturbUntil) > new Date(),
  );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>推广员工具 · 我的工作空间</p>
          <h1>{data.employee.displayName}</h1>
          <span>
            {data.employee.title ?? '员工'} · {data.employee.employeeCode} · 不含第三方订单履约
          </span>
        </div>
        <Button tone="quiet" onClick={() => void load()}>
          刷新
        </Button>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <Card className={styles.card}>
        <h2>个人与组织</h2>
        <p>{data.employee.email}</p>
        <strong>{data.organization.name}</strong>
        <small>
          {data.organization.type} · {data.organization.code}
        </small>
      </Card>
      <Card className={styles.card}>
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
      </Card>
      <Card className={styles.card}>
        <h2>已授予权限</h2>
        <div className={styles.chips}>
          {data.permissions.length ? (
            data.permissions.map((permission) => (
              <StatusBadge tone="info" key={permission}>
                {permissionNames[permission] ?? businessLabel(permission)}
              </StatusBadge>
            ))
          ) : (
            <StatusBadge tone="neutral">暂无可用权限</StatusBadge>
          )}
        </div>
      </Card>
      <Card className={styles.card}>
        <h2>通知设置</h2>
        <p>
          {muted
            ? `免打扰至 ${new Date(data.notificationPreference.doNotDisturbUntil!).toLocaleString()}`
            : '提醒处于开启状态'}
        </p>
        <Button loading={busy} onClick={() => void dnd()}>
          {muted ? '恢复提醒' : '免打扰 8 小时'}
        </Button>
      </Card>
      <Card className={styles.card}>
        <h2>常用工具</h2>
        <nav className={styles.tools}>
          {tools.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
              <span>›</span>
            </a>
          ))}
        </nav>
      </Card>
    </main>
  );
}
