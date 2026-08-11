'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useState } from 'react';
import styles from './nurture-workbench.module.css';

type Profile = {
  customerId: string;
  customerName: string;
  segment: 'active' | 'repurchase' | 'dormant';
  nextTouchAt: string | null;
  lastOrderAt: string | null;
  orderCount: number;
  openTasks: number;
  version: number;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const labels = { active: '持续跟进', repurchase: '回访机会', dormant: '沉睡唤醒' };

export function NurtureWorkbench() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [segment, setSegment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const headers = () => ({
    'content-type': 'application/json',
  });
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const query = segment ? `?segment=${encodeURIComponent(segment)}` : '';
      const response = await sessionApi.request(`${api}/api/v1/employee/nurture${query}`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setProfiles((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [segment]);
  useEffect(() => {
    void load();
  }, [load]);
  const send = async (
    profile: Profile,
    path: string,
    body: Record<string, unknown>,
    success: string,
  ) => {
    setBusy(profile.customerId);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/nurture/${profile.customerId}${path}`,
        {
          method: path ? 'POST' : 'PATCH',
          headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ version: profile.version, ...body }),
        },
      );
      if (!response.ok) throw Error('ACTION');
      setMessage(success);
      await load();
    } catch {
      setMessage('操作未完成，记录可能已更新。请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载养客工作台"
          description="正在同步客户分层与下一次触达安排。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法访问养客工作台"
          description="请使用具备客户权限的员工账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="养客工作台暂不可用"
          description="客户经营队列未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>推广员工具 · 客户跟进</p>
          <h1>把下一次触达变成今天的行动</h1>
          <span>
            分层查看回访机会与沉睡客户，记录每次触达并转成可执行任务；不碰销售成交、不含支付金额。
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
      <Card className={styles.toolbar}>
        <label>
          客户分层
          <select
            aria-label="客户分层"
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
          >
            <option value="">全部客户</option>
            <option value="repurchase">回访机会</option>
            <option value="dormant">沉睡唤醒</option>
            <option value="active">持续跟进</option>
          </select>
        </label>
        <strong>{profiles.length} 位</strong>
      </Card>
      <section className={styles.list}>
        {profiles.length ? (
          profiles.map((profile) => (
            <Card className={styles.card} key={profile.customerId}>
              <div>
                <StatusBadge
                  tone={
                    profile.segment === 'dormant'
                      ? 'warning'
                      : profile.segment === 'repurchase'
                        ? 'success'
                        : 'info'
                  }
                >
                  {labels[profile.segment]}
                </StatusBadge>
                <h2>{profile.customerName}</h2>
                <p>
                  服务痕迹 {profile.orderCount} 次 ·{' '}
                  {profile.openTasks ? `${profile.openTasks} 个待办` : '暂无待办'}
                </p>
                <small>
                  {profile.lastOrderAt
                    ? `最近服务 ${new Date(profile.lastOrderAt).toLocaleDateString()}`
                    : '尚无服务痕迹'}
                  {profile.nextTouchAt
                    ? ` · 下次触达 ${new Date(profile.nextTouchAt).toLocaleDateString()}`
                    : ''}
                </small>
              </div>
              <div className={styles.actions}>
                <select
                  aria-label={`调整 ${profile.customerName} 分层`}
                  value={profile.segment}
                  disabled={busy === profile.customerId}
                  onChange={(event) =>
                    void send(
                      profile,
                      '',
                      { segment: event.target.value, nextTouchAt: profile.nextTouchAt },
                      '客户分层已更新。',
                    )
                  }
                >
                      <option value="active">持续跟进</option>
                      <option value="repurchase">回访机会</option>
                      <option value="dormant">沉睡唤醒</option>
                </select>
                <Button
                  tone="secondary"
                  loading={busy === profile.customerId}
                  onClick={() =>
                    void send(
                      profile,
                      '/touchpoints',
                      { actionType: 'message', note: '员工端记录触达' },
                      '触达已留痕。',
                    )
                  }
                >
                  记录触达
                </Button>
                <Button
                  loading={busy === profile.customerId}
                  onClick={() =>
                    void send(
                      profile,
                      '/touchpoints',
                      {
                        actionType: 'call',
                        note: '安排养客跟进',
                        createTask: true,
                        taskTitle: `养客跟进 ${profile.customerName}`,
                        dueAt: new Date(Date.now() + 86400000).toISOString(),
                      },
                      '跟进任务已创建。',
                    )
                  }
                >
                  安排跟进
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <AppStatePanel
            kind="empty"
            title="暂时没有需要养护的客户"
            description="把获客池中的线索转入跟进后，会在这里形成可执行的服务队列。"
          />
        )}
      </section>
    </main>
  );
}
