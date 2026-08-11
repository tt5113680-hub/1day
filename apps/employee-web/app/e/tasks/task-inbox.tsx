'use client';

import { useCallback, useEffect, useState } from 'react';
import { SessionApiClient } from '@oneday/session-client';
import { useTenantSync } from '@oneday/sync-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import styles from './task-inbox.module.css';

type Task = {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  escalationLevel: number;
  version: number;
  customer: { id: string; displayName: string | null } | null;
};

type InboxData = {
  employee: { id: string; displayName: string; title: string | null };
  tasks: Task[];
  customerReminders: Task[];
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const time = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export function TaskInbox() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error' | 'empty'>(
    'loading',
  );
  const [data, setData] = useState<InboxData | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (mode: 'full' | 'quiet' = 'full') => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    if (mode === 'full') setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/workbench`, {
        headers: { 'content-type': 'application/json' },
      });
      if ([401, 403].includes(response.status)) {
        setState('forbidden');
        return;
      }
      if (!response.ok) throw new Error('LOAD');
      const payload = (await response.json()).data as InboxData;
      setData(payload);
      const open = [...(payload.tasks ?? []), ...(payload.customerReminders ?? [])];
      setState(open.length ? 'ready' : 'empty');
    } catch {
      if (mode === 'full') setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useTenantSync(api, sessionApi, ['operating'], () => void load('quiet'), state === 'ready');

  const complete = async (task: Task) => {
    setBusy(task.id);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/workbench/tasks/${task.id}/complete`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: task.version }),
        },
      );
      if (response.status === 409) throw new Error('CONFLICT');
      if (!response.ok) throw new Error('COMPLETE');
      setMessage(`已完成「${task.title}」`);
      await load('quiet');
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'CONFLICT'
          ? '任务已被更新，请刷新后重试。'
          : '完成失败，请稍后重试。',
      );
    } finally {
      setBusy(null);
    }
  };

  if (state === 'loading') {
    return (
      <main className={styles.page}>
        <AppStatePanel kind="loading" title="正在加载任务收件箱" />
      </main>
    );
  }
  if (state === 'forbidden') {
    return (
      <main className={styles.page}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看任务收件箱"
          description="需要有效员工会话与 task.read 权限。"
        />
      </main>
    );
  }
  if (state === 'error') {
    return (
      <main className={styles.page}>
        <AppStatePanel
          kind="error"
          title="任务收件箱暂时不可用"
          description="请稍后重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  }

  const openTasks = data?.tasks ?? [];
  const reminders = data?.customerReminders ?? [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>推广员工具 · 任务收件箱</p>
        <h1>任务收件箱</h1>
        <p>
          {data?.employee.displayName ?? '员工'} · 仅显示你范围内的待办与客户提醒；不含第三方订单履约。
        </p>
        <Button tone="quiet" onClick={() => void load()}>
          刷新
        </Button>
      </header>
      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}

      {state === 'empty' ? (
        <AppStatePanel
          kind="empty"
          title="暂无待办任务"
          description="新的任务与客户提醒会在这里出现。"
          action={<a href="/e/workbench">返回工作台</a>}
        />
      ) : (
        <>
          <section className={styles.section} aria-label="今日待办">
            <div className={styles.sectionHead}>
              <h2>今日待办</h2>
              <span>{openTasks.length} 项</span>
            </div>
            {openTasks.length === 0 ? (
              <p className={styles.emptyLine}>今天没有可直接完成的任务。</p>
            ) : (
              openTasks.map((task) => (
                <article className={styles.task} key={task.id}>
                  <div>
                    <StatusBadge tone={task.status === 'overdue' ? 'danger' : 'info'}>
                      {task.status === 'overdue' ? '已逾期' : time(task.dueAt)}
                    </StatusBadge>
                    <h3>{task.title}</h3>
                    <p>
                      {task.customer?.displayName
                        ? `客户：${task.customer.displayName}`
                        : '内部执行任务'}
                      {task.escalationLevel ? ` · 已升级 ${task.escalationLevel} 次` : ''}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <a href={`/e/tasks/${task.id}`}>详情</a>
                    <Button loading={busy === task.id} onClick={() => void complete(task)}>
                      完成
                    </Button>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className={styles.section} aria-label="客户提醒">
            <div className={styles.sectionHead}>
              <h2>客户提醒</h2>
              <span>{reminders.length} 项</span>
            </div>
            {reminders.length === 0 ? (
              <p className={styles.emptyLine}>暂无客户提醒。</p>
            ) : (
              reminders.map((task) => (
                <article className={styles.task} key={task.id}>
                  <div>
                    <strong>{task.customer?.displayName ?? '待确认客户'}</strong>
                    <h3>{task.title}</h3>
                    <p>{task.status === 'overdue' ? '尽快处理' : time(task.dueAt)}</p>
                  </div>
                  <div className={styles.actions}>
                    <a href={`/e/tasks/${task.id}`}>详情</a>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}
      <p className={styles.note}>
        推广员工具任务收件箱：菜单「任务」进入 `/e/tasks`；跟进门店服务痕迹，不代履约美团/抖音订单。
      </p>
    </main>
  );
}
