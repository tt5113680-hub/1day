'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge, businessLabel } from '@oneday/ui';
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
type Bucket = { label: string; value: number };

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
  'tenant.manage': '管理租户工具',
  'tenant.read': '查看租户工具',
  'workflow.manage': '管理运营流程',
  'workflow.read': '查看运营流程',
};

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const permissionDomain = (code: string) => {
  const root = code.split('.')[0] ?? code;
  return (
    {
      action: '外部行动',
      attribution: '归因',
      circle: '商圈',
      customer: '客户',
      employee: '员工',
      evidence: '业务证据',
      organization: '组织',
      ownership: '归属审批',
      page: '页面模板',
      platform: '平台',
      task: '任务',
      tenant: '租户工具',
      workflow: '运营流程',
    }[root] ?? root
  );
};

const permissionLevel = (code: string) =>
  code.endsWith('.manage') || code.endsWith('.approve')
    ? '管理/审批'
    : code.endsWith('.read')
      ? '只读'
      : '其他';

function Bars({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <div className={styles.bars}>
      {items.map((item) => (
        <div className={styles.barRow} key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </div>
          <span className={styles.barValue}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function EmployeeProfile() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/profile`, {
        headers: { 'content-type': 'application/json' },
      });
      if ([401, 403].includes(response.status)) {
        setState('forbidden');
        return;
      }
      if (!response.ok) throw new Error('LOAD');
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stores = data?.stores ?? [];
  const permissions = data?.permissions ?? [];
  const storeDist = useMemo(
    () => countBy(stores.map((store) => store.name || '未命名门店')),
    [stores],
  );
  const domainDist = useMemo(
    () => countBy(permissions.map((code) => permissionDomain(code))),
    [permissions],
  );
  const levelDist = useMemo(
    () => countBy(permissions.map((code) => permissionLevel(code))),
    [permissions],
  );
  const namedDist = useMemo(
    () =>
      countBy(
        permissions.map((code) => permissionNames[code] ?? businessLabel(code)),
      ),
    [permissions],
  );

  const dnd = async () => {
    if (!data) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/profile/notification-preferences`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            version: data.notificationPreference.version,
            doNotDisturbUntil: data.notificationPreference.doNotDisturbUntil
              ? null
              : new Date(Date.now() + 8 * 3600000).toISOString(),
          }),
        },
      );
      if (!response.ok) throw new Error('DND');
      setMessage('通知设置已更新。');
      await load();
    } catch {
      setMessage('设置未更新，请刷新后重试。');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在整理个人工作空间"
          description="正在同步你的组织、门店与权限上下文。"
        />
      </main>
    );
  }
  if (state === 'forbidden') {
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看个人空间"
          description="请使用已授权的员工账号登录。"
        />
      </main>
    );
  }
  if (state === 'error') {
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
  }
  if (!data) return null;

  const muted = Boolean(
    data.notificationPreference.doNotDisturbUntil &&
      new Date(data.notificationPreference.doNotDisturbUntil) > new Date(),
  );

  return (
    <main className={styles.page} data-testid="employee-profile">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 我的工作空间</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="工作空间概览">
        <h1>{data.employee.displayName}</h1>
        <p>
          {data.employee.title ?? '员工'} · {data.employee.employeeCode} · 不含第三方订单履约
        </p>
      </section>

      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.panel} aria-label="工作空间概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>服务门店</span>
            <strong>{stores.length}</strong>
          </div>
          <div>
            <span>已授权限</span>
            <strong>{permissions.length}</strong>
          </div>
          <div>
            <span>常用工具</span>
            <strong>{tools.length}</strong>
          </div>
          <div>
            <span>提醒状态</span>
            <strong>{muted ? '免打扰' : '开启'}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="工作空间分布">
        <div className={styles.panelHead}>
          <h2>工作空间分布</h2>
          <span className={styles.panelMeta}>由档案真实行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>服务门店分布</h3>
            <Bars items={storeDist} total={stores.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>权限域分布</h3>
            <Bars items={domainDist} total={permissions.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>权限级别分布</h3>
            <Bars items={levelDist} total={permissions.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>权限项分布</h3>
            <Bars items={namedDist} total={permissions.length} />
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>个人与组织</h2>
        <p className={styles.copy}>{data.employee.email}</p>
        <strong>{data.organization.name}</strong>
        <p className={styles.copy}>
          {data.organization.type} · {data.organization.code}
        </p>
      </section>

      <section className={styles.panel}>
        <h2>服务门店</h2>
        {stores.length ? (
          stores.map((store) => (
            <p className={styles.copy} key={store.id}>
              <strong>{store.name}</strong> · {store.address ?? store.code}
            </p>
          ))
        ) : (
          <p className={styles.copy}>当前组织尚未配置门店。</p>
        )}
      </section>

      <section className={styles.panel}>
        <h2>已授予权限</h2>
        <div className={styles.chips}>
          {permissions.length ? (
            permissions.map((permission) => (
              <StatusBadge tone="info" key={permission}>
                {permissionNames[permission] ?? businessLabel(permission)}
              </StatusBadge>
            ))
          ) : (
            <StatusBadge tone="neutral">暂无可用权限</StatusBadge>
          )}
        </div>
      </section>

      <section className={styles.panel}>
        <h2>通知设置</h2>
        <p className={styles.copy}>
          {muted
            ? `免打扰至 ${new Date(data.notificationPreference.doNotDisturbUntil!).toLocaleString()}`
            : '提醒处于开启状态'}
        </p>
        <Button loading={busy} onClick={() => void dnd()}>
          {muted ? '恢复提醒' : '免打扰 8 小时'}
        </Button>
      </section>

      <section className={styles.panel}>
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

      <p className={styles.honest} role="note">
        以上分布全部由已抓取员工档案行现场推导(source=local)：服务门店/权限域/权限级别/权限项均由真实
        profile 行统计。推广员工具工作空间不含第三方订单履约，非本平台下单。
      </p>
    </main>
  );
}
