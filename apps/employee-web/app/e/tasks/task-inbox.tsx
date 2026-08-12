'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

type Bucket = { label: string; value: number };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const time = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const statusLabel = (status: string) =>
  ({ overdue: '已逾期', open: '待推进', done: '已完成', cancelled: '已取消' })[status] ??
  (status ? status : '未标注');

const escalationBucket = (level: number) => {
  if (!level) return '未升级';
  if (level <= 2) return '轻度升级 1-2';
  return '多次升级 3+';
};

const dueBucket = (dueAt: string, status: string) => {
  if (status === 'overdue') return '已逾期';
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return '时间待定';
  const hours = (due - Date.now()) / 36e5;
  if (hours <= 24) return '24 小时内';
  if (hours <= 72) return '1-3 天内';
  return '3 天以上';
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
  useTenantSync(
    api,
    sessionApi,
    ['operating'],
    () => void load('quiet'),
    state === 'ready' || state === 'empty',
  );

  const openTasks = data?.tasks ?? [];
  const reminders = data?.customerReminders ?? [];
  const allRows = useMemo(() => [...openTasks, ...reminders], [openTasks, reminders]);
  const statusDist = useMemo(
    () => countBy(allRows.map((task) => statusLabel(task.status))),
    [allRows],
  );
  const escalationDist = useMemo(
    () => countBy(allRows.map((task) => escalationBucket(task.escalationLevel ?? 0))),
    [allRows],
  );
  const customerDist = useMemo(
    () =>
      countBy(allRows.map((task) => (task.customer?.displayName ? '关联客户' : '内部执行'))),
    [allRows],
  );
  const dueDist = useMemo(
    () => countBy(allRows.map((task) => dueBucket(task.dueAt, task.status))),
    [allRows],
  );
  const sourceDist = useMemo(
    () =>
      [
        { label: '今日待办', value: openTasks.length },
        { label: '客户提醒', value: reminders.length },
      ].filter((item) => item.value > 0),
    [openTasks.length, reminders.length],
  );

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
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载任务收件箱" />
      </main>
    );
  }
  if (state === 'forbidden') {
    return (
      <main className={styles.centered}>
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
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="任务收件箱暂时不可用"
          description="请稍后重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  }

  return (
    <main className={styles.page} data-testid="employee-task-inbox">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 任务收件箱</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="任务收件箱概览">
        <h1>任务收件箱</h1>
        <p>
          {data?.employee.displayName ?? '员工'} · 仅显示你范围内的待办与客户提醒；不含第三方订单履约。
        </p>
      </section>

      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.panel} aria-label="任务概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>全部待办</span>
            <strong>{allRows.length}</strong>
          </div>
          <div>
            <span>今日待办</span>
            <strong>{openTasks.length}</strong>
          </div>
          <div>
            <span>客户提醒</span>
            <strong>{reminders.length}</strong>
          </div>
          <div>
            <span>已逾期</span>
            <strong>{allRows.filter((task) => task.status === 'overdue').length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="任务待办分布">
        <div className={styles.panelHead}>
          <h2>任务待办分布</h2>
          <span className={styles.panelMeta}>由收件箱真实行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>状态分布</h3>
            <Bars items={statusDist} total={allRows.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>升级分布</h3>
            <Bars items={escalationDist} total={allRows.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>客户关联分布</h3>
            <Bars items={customerDist} total={allRows.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>到期窗口分布</h3>
            <Bars items={dueDist} total={allRows.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>来源分布</h3>
            <Bars items={sourceDist} total={allRows.length} />
          </div>
        </div>
      </section>

      {state === 'empty' ? (
        <section className={styles.section}>
          <AppStatePanel
            kind="empty"
            title="暂无待办任务"
            description="新的任务与客户提醒会在这里出现。"
            action={<a href="/e/workbench">返回工作台</a>}
          />
        </section>
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

      <p className={styles.honest} role="note">
        以上分布全部由已抓取任务收件箱档案行现场推导(source=local)：状态/升级/客户关联/到期窗口/来源均由真实
        tasks 与 customerReminders 行统计。推广员工具任务收件箱跟进门店服务痕迹，不含第三方订单履约，不代履约美团/抖音订单，非本平台下单。
      </p>
      <p className={styles.note}>
        推广员工具任务收件箱：菜单「任务」进入 `/e/tasks`；跟进门店服务痕迹，不代履约美团/抖音订单。
      </p>
    </main>
  );
}
