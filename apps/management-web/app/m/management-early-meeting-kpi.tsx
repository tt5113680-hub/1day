'use client';

import { SessionApiClient } from '@oneday/session-client';
import { useCallback, useEffect, useState } from 'react';
import styles from './management-kpi.module.css';

export type ManagementDeepPageId =
  | 'workbench'
  | 'analytics'
  | 'orders'
  | 'reviews'
  | 'notifications';

type DashboardMetrics = {
  consultsToday: number;
  openLeads: number;
  leadsToday: number;
  enrollmentsToday: number;
  redemptionsToday: number;
  entryVisitsToday: number;
  taskCompletionRateToday: number | null;
  openTasksToday: number;
  completedTasksToday: number;
  overdueTasks: number;
};

const NAV: { id: ManagementDeepPageId; href: string; label: string }[] = [
  { id: 'workbench', href: '/', label: '工作台' },
  { id: 'analytics', href: '/m/analytics', label: '经营日报' },
  { id: 'orders', href: '/m/orders', label: '订单痕迹' },
  { id: 'reviews', href: '/m/reviews', label: '评价' },
  { id: 'notifications', href: '/m/notifications', label: '通知' },
];

/** 早会条 A 固定口径（无 GMV）— 工作台与深页必须一致 */
export function earlyMeetingKpiItems(metrics: DashboardMetrics) {
  return [
    { label: '今日咨询', value: metrics.consultsToday },
    { label: '开放线索', value: metrics.openLeads },
    { label: '今日线索', value: metrics.leadsToday },
    {
      label: '任务完成率',
      value: metrics.taskCompletionRateToday != null ? `${metrics.taskCompletionRateToday}%` : '—',
    },
    { label: '今日入会', value: metrics.enrollmentsToday },
    { label: '今日核销', value: metrics.redemptionsToday },
    { label: '入口 L0–L2', value: metrics.entryVisitsToday },
  ] as const;
}

const pageNote = (page: ManagementDeepPageId) => {
  if (page === 'analytics')
    return ' 本页下方「入口痕迹日报」为 L0–L2 逐日展开，与「入口 L0–L2」计数口径相关但粒度不同。';
  if (page === 'orders') return ' 本页「订单痕迹」为第三方档案试点，不计入早会 GMV。';
  if (page === 'notifications')
    return ' 本页待办与 dashboard anomalies 队列同源类别（逾期/审批/会员到期提醒）。';
  if (page === 'reviews') return ' 本页「评价档案」为 store_reviews 试点，不计入早会 GMV。';
  return '';
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export function ManagementDeepPageNav({ page }: { page: ManagementDeepPageId }) {
  return (
    <nav className={styles.deepNav} aria-label="管理工作台互链">
      {NAV.map((item) => (
        <a key={item.id} href={item.href} aria-current={item.id === page ? 'page' : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function ManagementEarlyMeetingKpiStrip({
  page,
  metrics,
  state = metrics ? 'ready' : 'loading',
}: {
  page: ManagementDeepPageId;
  metrics?: DashboardMetrics | null;
  state?: 'loading' | 'ready' | 'error';
}) {
  return (
    <section
      className={styles.kpiStrip}
      aria-label="早会经营信号（与工作台同源）"
      data-testid="management-early-meeting-kpi"
    >
      <span className={styles.kpiTitle}>早会经营信号 · 与工作台同源 · 不含 GMV/支付金额</span>
      {state === 'loading' ? (
        <p className={styles.kpiLoading}>正在同步工作台指标…</p>
      ) : state === 'error' || !metrics ? (
        <p className={styles.kpiError}>
          概况暂不可用。请刷新或返回
          <a href="/"> 工作台 </a>
          查看。
        </p>
      ) : (
        <>
          {earlyMeetingKpiItems(metrics).map((item) => (
            <div className={styles.kpiItem} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <p className={styles.kpiNote} role="note">
            以上 7 项与管理工作台「早会经营信号」同源（/api/v1/management/dashboard）。条 B：逾期{' '}
            {metrics.overdueTasks}、今日待办 {metrics.openTasksToday}、今日完成{' '}
            {metrics.completedTasksToday}。{pageNote(page)}
          </p>
        </>
      )}
    </section>
  );
}

export function ManagementEarlyMeetingKpi({ page }: { page: ManagementDeepPageId }) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      if (!(await sessionApi.context())) {
        setState('error');
        return;
      }
      const response = await sessionApi.request(`${api}/api/v1/management/dashboard`, {
        headers: {},
      });
      if (!response.ok) throw Error('LOAD');
      setMetrics((await response.json()).data.metrics as DashboardMetrics);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <ManagementDeepPageNav page={page} />
      <ManagementEarlyMeetingKpiStrip page={page} metrics={metrics} state={state} />
    </>
  );
}
