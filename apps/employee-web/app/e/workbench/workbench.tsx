'use client';
import { SessionApiClient } from '@oneday/session-client';
import { useTenantSync } from '@oneday/sync-client';
import { AppStatePanel, Button, MetricCard, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useState } from 'react';
import styles from './workbench.module.css';

type Task = {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  escalationLevel: number;
  version: number;
  customer: { id: string; displayName: string | null } | null;
};
type Data = {
  employee: { id: string; displayName: string; title: string | null };
  tasks: Task[];
  customerReminders: Task[];
  opportunities: { taskId: string; title: string; reason: string; source: string }[];
  generatedAt: string;
};
type State = 'loading' | 'ready' | 'forbidden' | 'error';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const time = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export function Workbench() {
  const [state, setState] = useState<State>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const headers = () => ({
    'content-type': 'application/json',
  });
  const load = useCallback(async (preserveMessage = false, mode: 'full' | 'quiet' = 'full') => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    if (mode === 'full') setState('loading');
    if (!preserveMessage && mode === 'full') setMessage('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/workbench`, {
        headers: headers(),
      });
      if (response.status === 401 || response.status === 403) {
        setState('forbidden');
        return;
      }
      if (!response.ok) throw Error('LOAD_FAILED');
      setData((await response.json()).data as Data);
      setState('ready');
    } catch {
      if (mode === 'full') setState('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useTenantSync(api, sessionApi, ['operating'], () => void load(true, 'quiet'), state === 'ready');
  const complete = async (task: Task) => {
    setBusy(task.id);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/workbench/tasks/${task.id}/complete`,
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ version: task.version }),
        },
      );
      if (response.status === 409) throw Error('CONFLICT');
      if (!response.ok) throw Error('COMPLETE_FAILED');
      setMessage(`已完成「${task.title}」，行动记录已同步。`);
      await load(true);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'CONFLICT'
          ? '任务已被更新，请刷新后重试。'
          : '操作未完成，请检查网络后重试。',
      );
    } finally {
      setBusy(null);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总今天的行动"
          description="正在同步你的任务与客户提醒。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="需要员工登录"
          description="请使用已授权的员工账号登录后，再打开工作台。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="工作台暂时不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const overview = [
    { label: '今日任务', value: data.tasks.length, hint: '项待推进' },
    { label: '客户提醒', value: data.customerReminders.length, hint: '与你有关' },
    { label: '行动机会', value: data.opportunities.length, hint: '时限信号' },
  ] as const;
  const functions = [
    { href: '/e/tasks', label: '订单待办', desc: '今日任务' },
    { href: '/e/customers', label: '顾客', desc: '客户档案' },
    { href: '/e/memberships', label: '会员核销', desc: '权益核销' },
    { href: '/e/leads', label: '获客线索', desc: '线索池' },
    { href: '/e/store', label: '门店', desc: '店长工作台' },
    { href: '/e/notifications', label: '消息', desc: '通知提醒' },
  ] as const;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>美团商家 · 工作台</p>
          <h1>你好，{data.employee.displayName}</h1>
          <span>{data.employee.title ?? '员工'} · 仅显示你的任务与客户范围</span>
        </div>
        <Button className={styles.refresh} tone="quiet" onClick={() => void load()}>
          刷新
        </Button>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}

      <section className={styles.business} aria-labelledby="overview-title">
        <div className={styles.businessHead}>
          <span id="overview-title">今日经营概览</span>
          <span className={styles.businessDate}>{time(data.generatedAt)}</span>
        </div>
        <div className={styles.metrics}>
          {overview.map((item) => (
            <MetricCard key={item.label} hint={item.hint} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <section className={styles.section} aria-label="经营功能网格">
        <div className={styles.sectionHead}>
          <h2>常用功能</h2>
          <span>商家工作台</span>
        </div>
        <div className={styles.functions}>
          {functions.map((item) => (
            <a className={styles.function} href={item.href} key={item.href}>
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="today-title">
        <div className={styles.sectionHead}>
          <h2 id="today-title">今天要做</h2>
          <span>可直接完成</span>
        </div>
        {data.tasks.length === 0 ? (
          <div className={styles.empty}>
            <strong>今天没有待办</strong>
            <p>保持节奏，新的任务会在这里出现。</p>
          </div>
        ) : (
          data.tasks.map((task) => (
            <article className={styles.task} key={task.id}>
              <div>
                <StatusBadge tone={task.status === 'overdue' ? 'danger' : 'info'}>
                  {task.status === 'overdue' ? '已逾期' : `${time(task.dueAt)} 前`}
                </StatusBadge>
                <h3>{task.title}</h3>
                <p>
                  {task.customer?.displayName
                    ? `客户：${task.customer.displayName}`
                    : '内部执行任务'}
                  {task.escalationLevel ? ` · 已升级 ${task.escalationLevel} 次` : ''}
                </p>
              </div>
              <div className={styles.taskActions}>
                <a href={`/e/tasks/${task.id}`}>详情</a>
                <Button loading={busy === task.id} onClick={() => void complete(task)}>
                  完成
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
      <section className={styles.section} aria-labelledby="opportunity-title">
        <div className={styles.sectionHead}>
          <h2 id="opportunity-title">行动机会</h2>
          <span>来自任务时限信号</span>
        </div>
        {data.opportunities.length === 0 ? (
          <div className={styles.empty}>
            <strong>暂未识别到紧急机会</strong>
            <p>当新的待办或逾期信号出现时，这里会给出可执行建议。</p>
          </div>
        ) : (
          data.opportunities.map((item) => (
            <article className={styles.opportunity} key={item.taskId}>
              <span>行动建议</span>
              <h3>{item.title}</h3>
              <p>{item.reason}</p>
            </article>
          ))
        )}
      </section>
      <section className={styles.section} aria-labelledby="customer-title">
        <div className={styles.sectionHead}>
          <h2 id="customer-title">客户提醒</h2>
          <span>与你有关的待办</span>
        </div>
        {data.customerReminders.length === 0 ? (
          <div className={styles.empty}>
            <strong>暂无客户提醒</strong>
            <p>客户关联任务会在这里提示你。</p>
          </div>
        ) : (
          data.customerReminders.map((task) => (
            <article className={styles.reminder} key={task.id}>
              <div>
                <strong>{task.customer?.displayName ?? '待确认客户'}</strong>
                <p>{task.title}</p>
              </div>
              <span>{task.status === 'overdue' ? '尽快处理' : time(task.dueAt)}</span>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
