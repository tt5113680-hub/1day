'use client';
import { SessionApiClient } from '@oneday/session-client';
import { useTenantSync } from '@oneday/sync-client';
import { AppStatePanel, Button, MetricCard, taskTitleCopy } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Data = {
  metrics: {
    customers: number;
    orders30d: number;
    completedTasks30d: number;
    openTasks: number;
    openTasksToday: number;
    completedTasksToday: number;
    overdueTasks: number;
    stores: number;
    activeAssignees: number;
    customersToday: number;
  };
  anomalies: { id: string; type: string; title: string; occurredAt: string; deepLink: string }[];
  suggestions: { id: string; title: string; reason: string; deepLink: string }[];
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

/** Meituan merchant-PC workbench shortcuts — real routes only (no fake 订单/评价). */
const SHORTCUTS = [
  { href: '/m/stores', label: '门店', desc: '门店入口' },
  { href: '/m/offers', label: '商品', desc: '商品与套餐' },
  { href: '/m/customers', label: '顾客', desc: '顾客管理' },
  { href: '/m/memberships', label: '会员', desc: '会员中心' },
  { href: '/m/content', label: '营销', desc: '营销内容' },
  { href: '/m/page-builder', label: '装修', desc: '入口页装修' },
  { href: '/m/attribution', label: '数据', desc: '来源分析' },
  { href: '/m/entry-funnel', label: '痕迹', desc: '入口分流痕迹' },
  { href: '/m/circles', label: '商圈', desc: '商圈双身份' },
  { href: '/m/organization-employees', label: '员工', desc: '员工管理' },
  { href: '/m/employee-process-performance', label: '表现', desc: '员工表现' },
  { href: '/m/settings', label: '设置', desc: '工具设置' },
  { href: '/m/ai-suggestions', label: '建议', desc: '作业建议' },
  { href: '/m/workflows', label: '工作流', desc: '工作流整合（定制）' },
] as const;

export default function ManagementHome() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async (mode: 'full' | 'quiet' = 'full') => {
    if (!(await sessionApi.context())) return setState('forbidden');
    if (mode === 'full') setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/management/dashboard`, {
        headers: {},
      });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error('LOAD');
      setData((await r.json()).data);
      setState('ready');
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
    ['operating', 'lifecycle'],
    () => void load('quiet'),
    state === 'ready',
  );
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载推广员工具工作台"
          description="正在汇总今日门店、顾客与待办。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法进入推广员工具工作台"
          description="请使用具备管理权限的账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="工作台暂不可用"
          description="请检查网络后重新加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const m = data.metrics;
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p>推广员工具 · 管理工作台</p>
          <h1>工作台</h1>
          <span>
            今日概况 · 常用功能 · 待办提醒 · 入口痕迹；不含支付金额与第三方订单履约
          </span>
        </div>
        <Button tone="secondary" onClick={() => void load()}>
          刷新
        </Button>
      </header>

      <section className={styles.todayStrip} aria-label="今日概况">
        <div className={styles.todayItem}>
          <span>今日顾客</span>
          <strong>{m.customersToday}</strong>
        </div>
        <div className={styles.todayItem}>
          <span>今日待办</span>
          <strong>{m.openTasksToday}</strong>
        </div>
        <div className={styles.todayItem}>
          <span>今日完成</span>
          <strong>{m.completedTasksToday}</strong>
        </div>
        <div className={styles.todayItem}>
          <span>逾期</span>
          <strong className={m.overdueTasks > 0 ? styles.danger : undefined}>{m.overdueTasks}</strong>
        </div>
        <div className={styles.todayItem}>
          <span>门店</span>
          <strong>{m.stores}</strong>
        </div>
        <div className={styles.todayItem}>
          <span>在岗跟进</span>
          <strong>{m.activeAssignees}</strong>
        </div>
      </section>

      <section className={styles.section} aria-label="常用功能">
        <div className={styles.sectionHead}>
          <h2>常用功能</h2>
          <span>推广员工具快捷入口</span>
        </div>
        <div className={styles.shortcuts}>
          {SHORTCUTS.map((item) => (
            <a className={styles.shortcut} href={item.href} key={item.href}>
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-label="作业数据">
        <div className={styles.sectionHead}>
          <h2>作业数据</h2>
          <a className={styles.link} href="/m/customers">
            顾客管理 →
          </a>
        </div>
        <div className={styles.metrics}>
          <MetricCard hint="顾客总量" label="顾客总数" value={m.customers} />
          <MetricCard hint="近 30 天服务档案（本地试点，非本平台下单）" label="近30日服务档案" value={m.orders30d} />
          <MetricCard hint="近 30 天完成任务" label="近30日完成" value={m.completedTasks30d} />
          <MetricCard hint="全部未完成任务" label="待推进任务" value={m.openTasks} />
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.head}>
            <h2>待办与异常</h2>
            <span>{data.anomalies.length} 项</span>
          </div>
          {data.anomalies.length ? (
            data.anomalies.map((item) => (
              <a className={styles.anomaly} href={item.deepLink} key={item.id}>
                <div>
                  <strong>{item.type === 'overdue_task' ? '任务逾期' : '归属审批'}</strong>
                  <p>{taskTitleCopy(item.title)}</p>
                </div>
                <time>{new Date(item.occurredAt).toLocaleDateString()}</time>
              </a>
            ))
          ) : (
            <div className={styles.empty}>当前没有待处理异常。</div>
          )}
        </div>
        <div className={styles.panel}>
          <div className={styles.head}>
            <h2>作业提醒</h2>
            <span>可解释</span>
          </div>
          {data.suggestions.map((item) => (
            <article className={styles.ai} key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.reason}</p>
              <a href={item.deepLink}>去处理 →</a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
