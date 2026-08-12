'use client';
import { SessionApiClient } from '@oneday/session-client';
import { useTenantSync } from '@oneday/sync-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './workbench.module.css';
import { EmployeeDeepPageNav, EmployeeWorkbenchKpiStrip } from '../employee-workbench-kpi';
import { PortalWorkbenchLayout } from './workbench-layout-modules';

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
  stats: {
    allOpenTasks: number;
    overdueTasks: number;
    claimedLeads: number;
    poolLeads: number;
    activeShareCodes: number;
    shareOpensToday: number;
    redemptionsToday: number;
  };
  queues: {
    leads: { id: string; title: string; status: string; occurredAt: string; deepLink: string }[];
    shareCodes: {
      id: string;
      title: string;
      scenario: string;
      expiresAt: string | null;
      deepLink: string;
    }[];
  };
  generatedAt: string;
  layout: {
    mode: 'published' | 'preview';
    modules: { id: string; module_type: string; position: number; config: Record<string, unknown> }[];
  } | null;
};
type State = 'loading' | 'ready' | 'forbidden' | 'error';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const time = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

type Bucket = { label: string; value: number };

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

const FUNCTION_ICONS: Record<string, string> = {
  任务待办: '✓',
  客户: '客',
  会员核销: '会',
  获客线索: '线',
  分享推广: '享',
  客户跟进: '跟',
  门店: '店',
  消息: '讯',
};

export function Workbench() {
  const searchParams = useSearchParams();
  const previewToken = searchParams.get('preview') ?? undefined;
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
      const previewQuery = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
      const response = await sessionApi.request(`${api}/api/v1/employee/workbench${previewQuery}`, {
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
  }, [previewToken]);
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
  const openTasks = data?.tasks ?? [];
  const reminders = data?.customerReminders ?? [];
  const opportunities = data?.opportunities ?? [];
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
    () => countBy(allRows.map((task) => (task.customer?.displayName ? '关联客户' : '内部执行'))),
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
        { label: '行动机会', value: opportunities.length },
      ].filter((item) => item.value > 0),
    [openTasks.length, reminders.length, opportunities.length],
  );
  const opportunityDist = useMemo(
    () => countBy(opportunities.map((item) => item.source || '时限信号')),
    [opportunities],
  );
  const leadDist = useMemo(
    () =>
      [
        { label: '已认领线索', value: data?.stats.claimedLeads ?? 0 },
        { label: '线索池', value: data?.stats.poolLeads ?? 0 },
      ].filter((item) => item.value > 0),
    [data?.stats],
  );
  const shareDist = useMemo(
    () =>
      [
        { label: '活跃分享码', value: data?.stats.activeShareCodes ?? 0 },
        { label: '今日打开', value: data?.stats.shareOpensToday ?? 0 },
      ].filter((item) => item.value > 0),
    [data?.stats],
  );
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
  const stats = data.stats;
  const overview = [
    { label: '全部待办', value: stats.allOpenTasks, hint: '未完成任务' },
    { label: '已认领线索', value: stats.claimedLeads, hint: '跟进中' },
    { label: '分享打开', value: stats.shareOpensToday, hint: '今日' },
    { label: '今日核销', value: stats.redemptionsToday, hint: '权益核销' },
  ] as const;
  const functions = [
    { href: '/e/tasks', label: '任务待办', desc: '今日任务' },
    { href: '/e/customers', label: '客户', desc: '客户档案' },
    { href: '/e/share', label: '分享推广', desc: '分享码' },
    { href: '/e/nurture', label: '客户跟进', desc: '跟进队列' },
    { href: '/e/memberships', label: '会员核销', desc: '权益核销' },
    { href: '/e/leads', label: '获客线索', desc: '线索池' },
    { href: '/e/store', label: '门店', desc: '店长工作台' },
    { href: '/e/notifications', label: '消息', desc: '通知提醒' },
  ] as const;
  const initial = data.employee.displayName.slice(0, 1);
  const useLayout = Boolean(data.layout?.modules?.length);
  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 工作台</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      {useLayout ? (
        <>
          {message ? (
            <p className={styles.feedback} role="status">
              {message}
            </p>
          ) : null}
          <PortalWorkbenchLayout
            data={data}
            distribution={{
              statusDist,
              escalationDist,
              customerDist,
              dueDist,
              sourceDist,
              opportunityDist,
              leadDist,
              shareDist,
              allRows,
              opportunities,
            }}
            busy={busy}
            complete={(task) => void complete(task)}
          />
        </>
      ) : (
        <>
      <section className={styles.heroCard} aria-label="员工概览">
        <span className={styles.avatar} aria-hidden>
          {initial}
        </span>
        <div className={styles.heroCopy}>
          <h1>你好，{data.employee.displayName}</h1>
          <p>{data.employee.title ?? '员工'} · 仅显示你的任务与客户范围 · 不含第三方订单履约</p>
        </div>
      </section>

      <EmployeeDeepPageNav page="workbench" />

      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.panel} aria-labelledby="overview-title">
        <div className={styles.panelHead}>
          <span id="overview-title">今日作业概览</span>
          <span className={styles.panelMeta}>{time(data.generatedAt)} 更新</span>
        </div>
        <EmployeeWorkbenchKpiStrip page="workbench" stats={stats} state="ready" />
        <div className={styles.metrics}>
          {overview.map((item) => (
            <article className={styles.metric} key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel} aria-label="工作台作业分布">
        <div className={styles.panelHead}>
          <h2>工作台作业分布</h2>
          <span className={styles.panelMeta}>由工作台真实行推导</span>
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
            <Bars items={sourceDist} total={allRows.length + opportunities.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>行动机会分布</h3>
            <Bars items={opportunityDist} total={opportunities.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>线索分布</h3>
            <Bars items={leadDist} total={stats.claimedLeads + stats.poolLeads} />
          </div>
          <div className={styles.panelBlock}>
            <h3>分享分布</h3>
            <Bars items={shareDist} total={stats.activeShareCodes + stats.shareOpensToday} />
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="常用功能网格">
        <div className={styles.panelHead}>
          <h2>常用功能</h2>
          <span>商家工作台</span>
        </div>
        <div className={styles.functions}>
          {functions.map((item) => (
            <a className={styles.function} href={item.href} key={item.href}>
              <span className={styles.functionIcon} aria-hidden>
                {FUNCTION_ICONS[item.label] ?? '·'}
              </span>
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="today-title">
        <div className={styles.panelHead}>
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

      <section className={styles.panel} aria-labelledby="opportunity-title">
        <div className={styles.panelHead}>
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

      <section className={styles.panel} aria-labelledby="customer-title">
        <div className={styles.panelHead}>
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

      <section className={styles.panel} aria-labelledby="lead-queue-title">
        <div className={styles.panelHead}>
          <h2 id="lead-queue-title">线索队列</h2>
          <a href="/e/leads">全部 →</a>
        </div>
        {data.queues.leads.length === 0 ? (
          <div className={styles.empty}>
            <strong>暂无线索</strong>
            <p>线索池有新条目时会在这里提示。</p>
          </div>
        ) : (
          data.queues.leads.map((item) => (
            <a className={styles.reminder} href={item.deepLink} key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.status === 'open' ? '待认领' : '已认领'}</p>
              </div>
              <span>{new Date(item.occurredAt).toLocaleDateString()}</span>
            </a>
          ))
        )}
      </section>

      <section className={styles.panel} aria-labelledby="share-queue-title">
        <div className={styles.panelHead}>
          <h2 id="share-queue-title">分享码</h2>
          <a href="/e/share">管理 →</a>
        </div>
        {data.queues.shareCodes.length === 0 ? (
          <div className={styles.empty}>
            <strong>暂无活跃分享码</strong>
            <p>创建分享码后可追踪打开次数。</p>
          </div>
        ) : (
          data.queues.shareCodes.map((item) => (
            <a className={styles.reminder} href={item.deepLink} key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>
                  {item.scenario}
                  {item.expiresAt ? ` · 到期 ${new Date(item.expiresAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <span>活跃</span>
            </a>
          ))
        )}
      </section>
        </>
      )}

      <p className={styles.honest} role="note">
        以上分布全部由已抓取工作台档案行现场推导(source=local)：状态/升级/客户关联/到期窗口/来源均由真实
        tasks 与 customerReminders 行统计；线索与分享 KPI 来自 stats 与 queues
        真实字段。推广员工具工作台跟进门店服务痕迹，不含第三方订单履约，不代履约美团/抖音订单，非本平台下单。
      </p>
    </main>
  );
}
