'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useState } from 'react';
import styles from './notification-center.module.css';

type Notification = {
  id: string;
  category: 'task' | 'anomaly' | 'approval' | 'system';
  title: string;
  body: string;
  deepLink: string;
  sentAt: string;
  readAt: string | null;
  version: number;
};
type Payload = { items: Notification[]; unreadCount: number };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const labels = { task: '任务', anomaly: '异常', approval: '审批', system: '系统' };

export function NotificationCenter() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Payload>({ items: [], unreadCount: 0 });
  const [category, setCategory] = useState('');
  const [readState, setReadState] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const headers = () => ({
    'content-type': 'application/json',
  });
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const params = new URLSearchParams({ state: readState });
      if (category) params.set('category', category);
      const response = await sessionApi.request(`${api}/api/v1/employee/notifications?${params}`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [category, readState]);
  useEffect(() => {
    void load();
  }, [load]);
  const markRead = async (notification: Notification) => {
    setBusy(notification.id);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/notifications/${notification.id}/read`,
        {
          method: 'PATCH',
          headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ version: notification.version }),
        },
      );
      if (!response.ok) throw Error('READ');
      setMessage('通知已标记为已读。');
      await load();
    } catch {
      setMessage('更新未完成，通知状态可能已变化。请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在整理你的通知"
          description="正在同步当前员工的任务与工具提醒。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看通知"
          description="请使用已授权的员工账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="通知中心暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>推广员工具 · 执行提醒</p>
          <h1>把该处理的事，留在眼前</h1>
          <span>
            任务、异常、审批与系统提醒仅显示给当前员工；不含第三方订单履约或支付成功态。
          </span>
        </div>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <Card className={styles.summary}>
        <strong>{data.unreadCount}</strong>
        <span>条未读通知</span>
        <a href="/e/workbench">回到工作台</a>
      </Card>
      <Card className={styles.filters}>
        <label>
          类型
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">全部类型</option>
            <option value="task">任务</option>
            <option value="anomaly">异常</option>
            <option value="approval">审批</option>
            <option value="system">系统</option>
          </select>
        </label>
        <label>
          状态
          <select value={readState} onChange={(event) => setReadState(event.target.value)}>
            <option value="all">全部</option>
            <option value="unread">未读</option>
            <option value="read">已读</option>
          </select>
        </label>
      </Card>
      <section className={styles.list} aria-label="通知列表">
        {data.items.length ? (
          data.items.map((notification) => (
            <Card
              className={`${styles.card} ${notification.readAt ? styles.read : styles.unread}`}
              key={notification.id}
            >
              <div>
                <StatusBadge
                  tone={
                    notification.category === 'anomaly'
                      ? 'danger'
                      : notification.category === 'approval'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {labels[notification.category]}
                </StatusBadge>
                <h2>{notification.title}</h2>
                <p>{notification.body}</p>
                <small>{new Date(notification.sentAt).toLocaleString()}</small>
              </div>
              <div className={styles.actions}>
                <a href={notification.deepLink}>查看处理</a>
                {!notification.readAt && (
                  <Button
                    tone="secondary"
                    loading={busy === notification.id}
                    onClick={() => void markRead(notification)}
                  >
                    标为已读
                  </Button>
                )}
              </div>
            </Card>
          ))
        ) : (
          <AppStatePanel
            kind="empty"
            title="这里暂时没有通知"
            description="任务提醒、超时异常、归属审批和系统消息会在产生后汇总到这里。"
          />
        )}
      </section>
    </main>
  );
}
