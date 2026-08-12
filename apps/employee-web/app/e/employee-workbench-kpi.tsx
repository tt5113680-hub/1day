'use client';

import { SessionApiClient } from '@oneday/session-client';
import { useCallback, useEffect, useState } from 'react';
import styles from './employee-workbench-kpi.module.css';

export type EmployeeDeepPageId = 'workbench' | 'share' | 'nurture' | 'leads' | 'memberships';

type WorkbenchStats = {
  allOpenTasks: number;
  overdueTasks: number;
  claimedLeads: number;
  poolLeads: number;
  activeShareCodes: number;
  shareOpensToday: number;
  redemptionsToday: number;
};

const NAV: { id: EmployeeDeepPageId; href: string; label: string }[] = [
  { id: 'workbench', href: '/e/workbench', label: '工作台' },
  { id: 'share', href: '/e/share', label: '分享' },
  { id: 'nurture', href: '/e/nurture', label: '跟进' },
  { id: 'leads', href: '/e/leads', label: '线索' },
  { id: 'memberships', href: '/e/memberships', label: '核销' },
];

/** 员工今日作业 KPI — 工作台与深页必须一致 */
export function employeeWorkbenchKpiItems(stats: WorkbenchStats) {
  return [
    { label: '全部待办', value: stats.allOpenTasks },
    { label: '已逾期', value: stats.overdueTasks },
    { label: '线索池', value: stats.poolLeads },
    { label: '已认领线索', value: stats.claimedLeads },
    { label: '活跃分享码', value: stats.activeShareCodes },
    { label: '分享打开', value: stats.shareOpensToday },
    { label: '今日核销', value: stats.redemptionsToday },
  ] as const;
}

const pageNote = (page: EmployeeDeepPageId) => {
  if (page === 'share') return ' 本页分享码列表为明细展开。';
  if (page === 'leads') return ' 本页线索池为可操作队列。';
  if (page === 'nurture') return ' 本页跟进队列为养客明细。';
  if (page === 'memberships') return ' 本页核销台账为权益明细。';
  return '';
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export function EmployeeDeepPageNav({ page }: { page: EmployeeDeepPageId }) {
  return (
    <nav className={styles.deepNav} aria-label="员工工作台互链">
      {NAV.map((item) => (
        <a key={item.id} href={item.href} aria-current={item.id === page ? 'page' : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function EmployeeWorkbenchKpiStrip({
  page,
  stats,
  state = stats ? 'ready' : 'loading',
}: {
  page: EmployeeDeepPageId;
  stats?: WorkbenchStats | null;
  state?: 'loading' | 'ready' | 'error';
}) {
  return (
    <section
      className={styles.kpiStrip}
      aria-label="今日作业 KPI（与工作台同源）"
      data-testid="employee-workbench-kpi"
    >
      <span className={styles.kpiTitle}>
        今日作业 KPI · 与工作台同源 · 不含 GMV/第三方履约
      </span>
      {state === 'loading' ? (
        <p className={styles.kpiLoading}>正在同步工作台指标…</p>
      ) : state === 'error' || !stats ? (
        <p className={styles.kpiError}>
          概况暂不可用。请刷新或返回
          <a href="/e/workbench"> 工作台 </a>
          查看。
        </p>
      ) : (
        <>
          {employeeWorkbenchKpiItems(stats).map((item) => (
            <div className={styles.kpiItem} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <p className={styles.kpiNote} role="note">
            以上 7 项与员工工作台 summaryStrip 同源（/api/v1/employee/workbench）。
            {pageNote(page)}
          </p>
        </>
      )}
    </section>
  );
}

export function EmployeeWorkbenchKpi({ page }: { page: EmployeeDeepPageId }) {
  const [stats, setStats] = useState<WorkbenchStats | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      if (!(await sessionApi.context())) {
        setState('error');
        return;
      }
      const response = await sessionApi.request(`${api}/api/v1/employee/workbench`, {
        headers: { 'content-type': 'application/json' },
      });
      if (!response.ok) throw Error('LOAD');
      setStats((await response.json()).data.stats as WorkbenchStats);
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
      <EmployeeDeepPageNav page={page} />
      <EmployeeWorkbenchKpiStrip page={page} stats={stats} state={state} />
    </>
  );
}
