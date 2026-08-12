'use client';
import { SessionApiClient } from '@oneday/session-client';
import { useTenantSync } from '@oneday/sync-client';
import { AppStatePanel, Button, taskTitleCopy } from '@oneday/ui';
import {
  ManagementDeepPageNav,
  ManagementEarlyMeetingKpiStrip,
} from './m/management-early-meeting-kpi';
import { PortalManagementHomeLayout } from './m/management-home-modules';
import { QueueRow, type QueueDisposition } from './m/management-queue-row';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
    consultsToday: number;
    openLeads: number;
    leadsToday: number;
    enrollmentsToday: number;
    redemptionsToday: number;
    entryVisitsToday: number;
    activeWorkflows: number;
    taskCompletionRateToday: number | null;
  };
  storeBreakdown: {
    id: string;
    name: string;
    entryOpens30d: number;
    openTasks: number;
  }[];
  queues: {
    consults: {
      id: string;
      title: string;
      occurredAt: string;
      deepLink: string;
      disposition: 'pending' | 'handled' | 'ignored';
    }[];
    leads: {
      id: string;
      title: string;
      status: string;
      occurredAt: string;
      deepLink: string;
      disposition: 'pending' | 'handled' | 'ignored';
    }[];
  };
  anomalies: {
    id: string;
    type: string;
    title: string;
    occurredAt: string;
    deepLink: string;
    disposition: 'pending' | 'handled' | 'ignored';
  }[];
  suggestions: { id: string; title: string; reason: string; deepLink: string }[];
  disposition: {
    total: number;
    pending: number;
    handled: number;
    ignored: number;
    handledRate: number;
  };
  layout: {
    mode: 'published' | 'preview';
    modules: {
      id: string;
      module_type: string;
      position: number;
      config: Record<string, unknown>;
    }[];
  } | null;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

type Bucket = { label: string; value: number };

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const anomalyTypeLabel = (type: string) =>
  type === 'overdue_task' ? '任务逾期' : type === 'attribution_pending' ? '归属审批' : '其他异常';

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

const SHORTCUTS = [
  { href: '/m/stores', label: '门店', desc: '门店入口' },
  { href: '/m/offers', label: '商品', desc: '商品与套餐' },
  { href: '/m/customers', label: '客户', desc: '客户跟进' },
  { href: '/m/memberships', label: '会员', desc: '会员中心' },
  { href: '/m/orders', label: '订单', desc: '服务档案痕迹' },
  { href: '/m/reviews', label: '评价', desc: '口碑与反馈' },
  { href: '/m/content', label: '营销', desc: '营销内容' },
  { href: '/m/page-builder', label: '装修', desc: '入口页装修' },
  { href: '/m/attribution', label: '数据', desc: '来源分析' },
  { href: '/m/analytics', label: '日报', desc: '经营日报' },
  { href: '/m/entry-funnel', label: '痕迹', desc: '入口分流痕迹' },
  { href: '/m/notifications', label: '通知', desc: '消息提醒' },
  { href: '/m/circles', label: '商圈', desc: '商圈双身份' },
  { href: '/m/organization-employees', label: '员工', desc: '员工管理' },
  { href: '/m/employee-process-performance', label: '表现', desc: '员工表现' },
  { href: '/m/settings', label: '设置', desc: '工具设置' },
  { href: '/m/ai-suggestions', label: '建议', desc: '作业建议' },
  { href: '/m/workflows', label: '工作流', desc: '工作流整合（定制）' },
] as const;

const SHORTCUT_ICONS: Record<string, string> = {
  门店: '店',
  商品: '品',
  客户: '客',
  会员: '会',
  订单: '单',
  评价: '评',
  营销: '营',
  装修: '装',
  数据: '数',
  日报: '报',
  痕迹: '迹',
  通知: '讯',
  商圈: '圈',
  员工: '员',
  表现: '绩',
  设置: '设',
  建议: '议',
  工作流: '流',
};

export default function ManagementHome() {
  const searchParams = useSearchParams();
  const previewToken = searchParams.get('preview') ?? undefined;
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const headers = () => ({ 'content-type': 'application/json' });
  const load = useCallback(
    async (mode: 'full' | 'quiet' = 'full') => {
      if (!(await sessionApi.context())) return setState('forbidden');
      if (mode === 'full') setState('loading');
      try {
        const previewQuery = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
        const r = await sessionApi.request(`${api}/api/v1/management/dashboard${previewQuery}`, {
          headers: {},
        });
        if ([401, 403].includes(r.status)) return setState('forbidden');
        if (!r.ok) throw Error('LOAD');
        setData((await r.json()).data);
        setState('ready');
      } catch {
        if (mode === 'full') setState('error');
      }
    },
    [previewToken],
  );
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
  const dispose = async (
    queueType: string,
    sourceId: string,
    action: 'handled' | 'ignored',
    title: string,
    deepLink: string,
  ) => {
    const key = `${queueType}:${sourceId}:${action}`;
    setBusy(key);
    setMessage('');
    try {
      const r = await sessionApi.request(`${api}/api/v1/management/dashboard/dispositions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ queueType, sourceId, action, title, deepLink }),
      });
      if (!r.ok) throw Error('DISPOSE_FAILED');
      setMessage(action === 'handled' ? '已标记为已处理。' : '已标记为忽略。');
      await load();
    } catch {
      setMessage('操作未完成，请检查网络后重试。');
    } finally {
      setBusy(null);
    }
  };
  const taskMetricDist = useMemo(() => {
    const m = data?.metrics;
    if (!m) return [];
    return [
      { label: '待推进任务', value: m.openTasks },
      { label: '今日待办', value: m.openTasksToday },
      { label: '今日完成', value: m.completedTasksToday },
      { label: '近30日完成', value: m.completedTasks30d },
      { label: '逾期任务', value: m.overdueTasks },
    ].filter((item) => item.value > 0);
  }, [data?.metrics]);
  const customerMetricDist = useMemo(() => {
    const m = data?.metrics;
    if (!m) return [];
    return [
      { label: '客户总数', value: m.customers },
      { label: '今日客户', value: m.customersToday },
      { label: '门店数', value: m.stores },
      { label: '在岗跟进', value: m.activeAssignees },
      { label: '近30日服务档案', value: m.orders30d },
    ].filter((item) => item.value > 0);
  }, [data?.metrics]);
  const anomalyDist = useMemo(
    () => countBy((data?.anomalies ?? []).map((item) => anomalyTypeLabel(item.type))),
    [data?.anomalies],
  );
  const operationalDist = useMemo(() => {
    const m = data?.metrics;
    if (!m) return [];
    return [
      { label: '今日咨询', value: m.consultsToday },
      { label: '开放线索', value: m.openLeads },
      { label: '今日线索', value: m.leadsToday },
      { label: '今日入会', value: m.enrollmentsToday },
      { label: '今日核销', value: m.redemptionsToday },
      { label: '入口 L0–L2', value: m.entryVisitsToday },
      { label: '活跃工作流', value: m.activeWorkflows },
    ].filter((item) => item.value > 0);
  }, [data?.metrics]);
  const storeDist = useMemo(
    () =>
      (data?.storeBreakdown ?? []).map((store) => ({
        label: store.name,
        value: store.entryOpens30d + store.openTasks,
      })),
    [data?.storeBreakdown],
  );
  const queueDist = useMemo(
    () =>
      [
        { label: '待办与异常', value: data?.anomalies.length ?? 0 },
        { label: '作业提醒', value: data?.suggestions.length ?? 0 },
        { label: '咨询队列', value: data?.queues.consults.length ?? 0 },
        { label: '线索队列', value: data?.queues.leads.length ?? 0 },
      ].filter((item) => item.value > 0),
    [data?.anomalies.length, data?.suggestions.length, data?.queues],
  );
  const taskMetricTotal = taskMetricDist.reduce((acc, item) => acc + item.value, 0);
  const customerMetricTotal = customerMetricDist.reduce((acc, item) => acc + item.value, 0);
  const operationalTotal = operationalDist.reduce((acc, item) => acc + item.value, 0);
  const storeTotal = storeDist.reduce((acc, item) => acc + item.value, 0);
  const anomalyTotal = data?.anomalies.length ?? 0;
  const queueTotal =
    (data?.anomalies.length ?? 0) +
    (data?.suggestions.length ?? 0) +
    (data?.queues.consults.length ?? 0) +
    (data?.queues.leads.length ?? 0);
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载推广员工具工作台"
          description="正在汇总今日门店、客户与待办。"
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
  const metricCards = [
    { label: '客户总数', value: m.customers, hint: '客户总量' },
    { label: '近30日服务档案', value: m.orders30d, hint: '本地试点，非本平台下单' },
    { label: '近30日完成', value: m.completedTasks30d, hint: '近 30 天完成任务' },
    { label: '待推进任务', value: m.openTasks, hint: '全部未完成任务' },
  ] as const;
  const useLayout = Boolean(data.layout?.modules?.length);
  return (
    <main className={styles.page} data-testid="management-dashboard">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 管理工作台</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      {useLayout ? (
        <PortalManagementHomeLayout
          data={data}
          dispose={(type, sourceId, action, title, deepLink) =>
            void dispose(type, sourceId, action, title, deepLink)
          }
          busy={busy}
          message={message}
          distribution={{
            taskMetricDist,
            customerMetricDist,
            anomalyDist,
            operationalDist,
            storeDist,
            queueDist,
            taskMetricTotal,
            customerMetricTotal,
            operationalTotal,
            storeTotal,
            anomalyTotal,
            queueTotal,
          }}
        />
      ) : (
        <>
          <section className={styles.heroCard} aria-label="工作台概览">
            <h1>工作台</h1>
            <p>今日概况 · 常用功能 · 待办提醒 · 入口痕迹；不含支付金额与第三方订单履约</p>
          </section>

          <ManagementDeepPageNav page="workbench" />

          <section className={styles.summaryStrip} aria-label="工作台数据概况">
            <span className={styles.summaryStripTitle}>今日概况</span>
            <div className={styles.todayItem}>
              <span>今日客户</span>
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
              <span>完成率</span>
              <strong>
                {m.taskCompletionRateToday != null ? `${m.taskCompletionRateToday}%` : '—'}
              </strong>
            </div>
            <div className={styles.todayItem}>
              <span>逾期</span>
              <strong className={m.overdueTasks > 0 ? styles.danger : undefined}>
                {m.overdueTasks}
              </strong>
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

          <ManagementEarlyMeetingKpiStrip page="workbench" metrics={m} state="ready" />

          <section className={styles.panel} aria-label="管理工作台分布">
            <div className={styles.panelHead}>
              <h2>管理工作台分布</h2>
              <span className={styles.panelMeta}>由 dashboard 真实指标与队列行推导</span>
            </div>
            <div className={styles.distribution}>
              <div className={styles.panelBlock}>
                <h3>待办指标分布</h3>
                <Bars items={taskMetricDist} total={taskMetricTotal} />
              </div>
              <div className={styles.panelBlock}>
                <h3>客户门店分布</h3>
                <Bars items={customerMetricDist} total={customerMetricTotal} />
              </div>
              <div className={styles.panelBlock}>
                <h3>异常类型分布</h3>
                <Bars items={anomalyDist} total={anomalyTotal} />
              </div>
              <div className={styles.panelBlock}>
                <h3>提醒队列分布</h3>
                <Bars items={queueDist} total={queueTotal} />
              </div>
              <div className={styles.panelBlock}>
                <h3>经营信号分布</h3>
                <Bars items={operationalDist} total={operationalTotal} />
              </div>
              <div className={styles.panelBlock}>
                <h3>门店对比（30日入口+待办）</h3>
                <Bars items={storeDist} total={storeTotal} />
              </div>
            </div>
          </section>

          {data.storeBreakdown.length ? (
            <section className={styles.panel} aria-label="门店对比">
              <div className={styles.panelHead}>
                <h2>门店对比</h2>
                <a className={styles.link} href="/m/stores">
                  全部门店 →
                </a>
              </div>
              <div className={styles.storeTable}>
                {data.storeBreakdown.map((store) => (
                  <article className={styles.storeRow} key={store.id}>
                    <strong>{store.name}</strong>
                    <span>30日入口 {store.entryOpens30d}</span>
                    <span>待办 {store.openTasks}</span>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.panel} aria-label="常用功能">
            <div className={styles.panelHead}>
              <h2>常用功能</h2>
              <span className={styles.panelMeta}>推广员工具快捷入口</span>
            </div>
            <div className={styles.functions}>
              {SHORTCUTS.map((item) => (
                <a className={styles.function} href={item.href} key={item.href}>
                  <span className={styles.functionIcon} aria-hidden>
                    {SHORTCUT_ICONS[item.label] ?? '·'}
                  </span>
                  <strong>{item.label}</strong>
                  <span>{item.desc}</span>
                </a>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="作业数据">
            <div className={styles.panelHead}>
              <h2>作业数据</h2>
              <a className={styles.link} href="/m/customers">
                客户跟进 →
              </a>
            </div>
            <div className={styles.metrics}>
              {metricCards.map((item) => (
                <article className={styles.metric} key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="早会队列处置">
            <div className={styles.panelHead}>
              <h2>早会队列处置</h2>
              <span className={styles.panelMeta}>
                处置率 {data.disposition.handledRate}%（已处理 {data.disposition.handled}/
                {data.disposition.total} 项）
              </span>
            </div>
            <div className={styles.rateStrip}>
              {[
                { label: '可处置项', value: data.disposition.total },
                { label: '待处置', value: data.disposition.pending },
                { label: '已处理', value: data.disposition.handled },
                { label: '已忽略', value: data.disposition.ignored },
              ].map((item) => (
                <article className={styles.rateItem} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
            {message ? (
              <p className={styles.panelMeta} role="status">
                {message}
              </p>
            ) : null}
            <div className={styles.storeTable}>
              {[
                ...data.anomalies.map(
                  (item): QueueDisposition => ({
                    kind: 'anomaly',
                    type: item.type,
                    label: item.type === 'overdue_task' ? '任务逾期' : '归属审批',
                    title: taskTitleCopy(item.title),
                    id: item.id,
                    occurredAt: item.occurredAt,
                    disposition: item.disposition,
                  }),
                ),
                ...data.queues.consults.map(
                  (item): QueueDisposition => ({
                    kind: 'consult',
                    label: '入口咨询',
                    title: item.title,
                    id: item.id,
                    occurredAt: item.occurredAt,
                    disposition: item.disposition,
                  }),
                ),
                ...data.queues.leads.map(
                  (item): QueueDisposition => ({
                    kind: 'lead',
                    label: '线索',
                    title: item.title,
                    status: item.status,
                    id: item.id,
                    occurredAt: item.occurredAt,
                    disposition: item.disposition,
                  }),
                ),
              ].map((item) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  deepLink={
                    item.kind === 'anomaly'
                      ? (data.anomalies.find((row) => row.id === item.id)?.deepLink ??
                        '/m/customers')
                      : item.kind === 'consult'
                        ? '/m/entry-funnel'
                        : '/e/leads'
                  }
                  busy={busy}
                  dispose={(type, sourceId, action, title, deepLink) =>
                    void dispose(type, sourceId, action, title, deepLink)
                  }
                />
              ))}
            </div>
          </section>

          <div className={styles.grid}>
            <section className={styles.panel} aria-label="待办与异常">
              <div className={styles.head}>
                <h2>待办与异常</h2>
                <span className={styles.panelMeta}>{data.anomalies.length} 项</span>
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
            </section>
            <section className={styles.panel} aria-label="作业提醒">
              <div className={styles.head}>
                <h2>作业提醒</h2>
                <span className={styles.panelMeta}>可解释</span>
              </div>
              {data.suggestions.length ? (
                data.suggestions.map((item) => (
                  <article className={styles.ai} key={item.id}>
                    <strong>{item.title}</strong>
                    <p>{item.reason}</p>
                    <a href={item.deepLink}>去处理 →</a>
                  </article>
                ))
              ) : (
                <div className={styles.empty}>暂无作业提醒。</div>
              )}
            </section>
          </div>
        </>
      )}

      <p className={styles.honest} role="note">
        以上分布全部由已抓取管理工作台档案行现场推导(source=local)：待办/客户/门店/经营信号来自
        dashboard metrics 真实字段；门店对比来自 storeBreakdown；咨询与线索队列来自 queues 行
        deepLink 可处置；早会队列处置率按真实处置记录统计（已处理/可处置项），仅登记处置状态，不代
        履约美团/抖音订单、不含支付金额与第三方订单履约；近30日服务档案为本地试点记录，非本平台下单。
      </p>
    </main>
  );
}
