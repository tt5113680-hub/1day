'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
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
type Bucket = { label: string; value: number };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const labels = { task: '任务', anomaly: '异常', approval: '审批', system: '系统' };

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const ageBucket = (sentAt: string) => {
  const sent = new Date(sentAt).getTime();
  if (Number.isNaN(sent)) return '时间待定';
  const hours = (Date.now() - sent) / 36e5;
  if (hours <= 24) return '24 小时内';
  if (hours <= 72) return '1-3 天内';
  if (hours <= 168) return '3-7 天内';
  return '7 天以上';
};

const linkBucket = (deepLink: string) => {
  if (deepLink.startsWith('/e/tasks')) return '任务跟进';
  if (deepLink.startsWith('/e/customers')) return '客户跟进';
  if (deepLink.startsWith('/e/memberships')) return '会员核销';
  if (deepLink.startsWith('/e/leads')) return '获客线索';
  if (deepLink.startsWith('/e/workbench')) return '工作台';
  return '其他入口';
};

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

export function NotificationCenter() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Payload>({ items: [], unreadCount: 0 });
  const [category, setCategory] = useState('');
  const [readState, setReadState] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const params = new URLSearchParams({ state: readState });
      if (category) params.set('category', category);
      const response = await sessionApi.request(`${api}/api/v1/employee/notifications?${params}`, {
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
  }, [category, readState]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data.items ?? [];
  const categoryDist = useMemo(
    () => countBy(items.map((row) => labels[row.category] ?? '未标注')),
    [items],
  );
  const readDist = useMemo(
    () => countBy(items.map((row) => (row.readAt ? '已读' : '未读'))),
    [items],
  );
  const ageDist = useMemo(() => countBy(items.map((row) => ageBucket(row.sentAt))), [items]);
  const linkDist = useMemo(() => countBy(items.map((row) => linkBucket(row.deepLink))), [items]);

  const markRead = async (notification: Notification) => {
    setBusy(notification.id);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/notifications/${notification.id}/read`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': crypto.randomUUID(),
          },
          body: JSON.stringify({ version: notification.version }),
        },
      );
      if (!response.ok) throw new Error('READ');
      setMessage('通知已标记为已读。');
      await load();
    } catch {
      setMessage('更新未完成，通知状态可能已变化。请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };

  if (state === 'loading') {
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在整理你的通知"
          description="正在同步当前员工的任务与工具提醒。"
        />
      </main>
    );
  }
  if (state === 'forbidden') {
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看通知"
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
          title="通知中心暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  }

  return (
    <main className={styles.page} data-testid="employee-notification-center">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 执行提醒</span>
        <div className={styles.topBarActions}>
          <a className={styles.topBarLink} href="/e/workbench">
            工作台
          </a>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </div>
      </header>

      <section className={styles.heroCard} aria-label="执行提醒概览">
        <h1>执行提醒</h1>
        <p>任务、异常、审批与系统提醒仅显示给当前员工；不含第三方订单履约或支付成功态。</p>
      </section>

      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.panel} aria-label="通知概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>当前列表</span>
            <strong>{items.length}</strong>
          </div>
          <div>
            <span>未读</span>
            <strong>{data.unreadCount}</strong>
          </div>
          <div>
            <span>已读</span>
            <strong>{items.filter((row) => row.readAt).length}</strong>
          </div>
          <div>
            <span>异常类</span>
            <strong>{items.filter((row) => row.category === 'anomaly').length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="执行提醒分布">
        <div className={styles.panelHead}>
          <h2>执行提醒分布</h2>
          <span className={styles.panelMeta}>由通知真实行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>类型分布</h3>
            <Bars items={categoryDist} total={items.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>已读状态分布</h3>
            <Bars items={readDist} total={items.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>发送窗口分布</h3>
            <Bars items={ageDist} total={items.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>处理入口分布</h3>
            <Bars items={linkDist} total={items.length} />
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="筛选">
        <div className={styles.filters}>
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
        </div>
      </section>

      <section className={styles.section} aria-label="通知列表">
        <div className={styles.sectionHead}>
          <h2>通知列表</h2>
          <span>{items.length} 条</span>
        </div>
        {items.length === 0 ? (
          <AppStatePanel
            kind="empty"
            title="这里暂时没有通知"
            description="任务提醒、超时异常、归属审批和系统消息会在产生后汇总到这里。"
          />
        ) : (
          items.map((notification) => (
            <article
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
                <h3>{notification.title}</h3>
                <p>{notification.body}</p>
                <small>{new Date(notification.sentAt).toLocaleString()}</small>
              </div>
              <div className={styles.actions}>
                <a href={notification.deepLink}>查看处理</a>
                {!notification.readAt ? (
                  <Button
                    tone="secondary"
                    loading={busy === notification.id}
                    onClick={() => void markRead(notification)}
                  >
                    标为已读
                  </Button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>

      <p className={styles.honest} role="note">
        以上分布全部由已抓取执行提醒档案行现场推导(source=local)：类型/已读状态/发送窗口/处理入口均由真实
        notifications 行统计。推广员工具执行提醒不含第三方订单履约或支付成功态，非本平台下单。
      </p>
    </main>
  );
}
