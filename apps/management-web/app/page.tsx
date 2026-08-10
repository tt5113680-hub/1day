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

const SHORTCUTS = [
  { href: '/m/customers', label: '客户', desc: 'CRM 客户资产' },
  { href: '/m/attribution', label: '归因', desc: '来源与归属' },
  { href: '/m/stores', label: '门店', desc: '门店与外链' },
  { href: '/m/organization-employees', label: '员工', desc: '组织与人员' },
  { href: '/m/employee-process-performance', label: '过程', desc: '员工工作过程' },
  { href: '/m/memberships', label: '会员', desc: '权益与核销' },
  { href: '/m/offers', label: '套餐', desc: 'Offer 管理' },
  { href: '/m/content', label: '内容', desc: '内容中心' },
  { href: '/m/page-builder', label: '装修', desc: '模板与发布' },
  { href: '/m/workflows', label: '流程', desc: '运营流程' },
  { href: '/m/settings', label: '设置', desc: '商户设置' },
  { href: '/m/ai-suggestions', label: '提醒', desc: '经营建议' },
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
          title="正在加载工作台"
          description="正在汇总今日门店与员工工作数据。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法进入工作台"
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
          <p>商户工作台</p>
          <h1>工作台</h1>
          <span>今日经营 · 门店与员工实况 · CRM 快捷入口（美团商家端同构）</span>
        </div>
        <Button tone="secondary" onClick={() => void load()}>
          刷新
        </Button>
      </header>

      <section className={styles.section} aria-label="工作快捷入口">
        <div className={styles.sectionHead}>
          <h2>常用功能</h2>
          <span>一点直达</span>
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

      <section className={styles.section} aria-label="今日门店与员工数据">
        <div className={styles.sectionHead}>
          <h2>今日数据</h2>
          <span>门店 {m.stores} · 在岗跟进 {m.activeAssignees}</span>
        </div>
        <div className={styles.metrics}>
          <MetricCard hint="今日新增客户" label="今日客户" value={m.customersToday} />
          <MetricCard hint="今日待办任务" label="今日待办" value={m.openTasksToday} />
          <MetricCard hint="今日已完成" label="今日完成" value={m.completedTasksToday} />
          <MetricCard hint="逾期需处理" label="逾期任务" value={m.overdueTasks} />
        </div>
      </section>

      <section className={styles.section} aria-label="CRM 与经营资产">
        <div className={styles.sectionHead}>
          <h2>客户与经营</h2>
          <a className={styles.link} href="/m/customers">
            进入 CRM →
          </a>
        </div>
        <div className={styles.metrics}>
          <MetricCard hint="客户资产总量" label="客户总数" value={m.customers} />
          <MetricCard hint="近 30 天订单" label="近30日订单" value={m.orders30d} />
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
            <h2>经营提醒</h2>
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
