'use client';
import { SessionApiClient } from '@oneday/session-client';

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
  const load = useCallback(async (preserveMessage = false) => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    if (!preserveMessage) setMessage('');
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
      setState('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
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
        <p>正在汇总今天的行动…</p>
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>需要员工登录</h1>
          <p>请使用已授权的员工账号登录后，再打开工作台。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>工作台暂时不可用</h1>
          <p>网络或服务连接出现问题。</p>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / 今日执行</p>
          <h1>你好，{data.employee.displayName}</h1>
          <span>{data.employee.title ?? '员工'} · 所有行动仅显示你的任务范围</span>
        </div>
        <button className={styles.refresh} onClick={() => void load()}>
          刷新
        </button>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <section className={styles.hero} aria-labelledby="today-title">
        <div>
          <p>今日任务</p>
          <strong>{data.tasks.length}</strong>
          <span>项待推进</span>
        </div>
        <p>优先完成有时限的客户动作，完成后会自动保留执行记录。</p>
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
                <span className={task.status === 'overdue' ? styles.overdue : styles.badge}>
                  {task.status === 'overdue' ? '已逾期' : `${time(task.dueAt)} 前`}
                </span>
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
                <button disabled={busy === task.id} onClick={() => void complete(task)}>
                  {busy === task.id ? '处理中…' : '完成'}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
      <section className={styles.section} aria-labelledby="opportunity-title">
        <div className={styles.sectionHead}>
          <h2 id="opportunity-title">智能机会</h2>
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
      <nav className={styles.nav} aria-label="员工工作流">
        <strong>工作台</strong>
        <span>客户</span>
        <span>提醒</span>
        <span>我的</span>
      </nav>
    </main>
  );
}
