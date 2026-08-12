'use client';

import { taskTitleCopy } from '@oneday/ui';
import type { ReactNode } from 'react';
import styles from '../page.module.css';
import { ManagementDeepPageNav, ManagementEarlyMeetingKpiStrip } from './management-early-meeting-kpi';

type DashboardData = {
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
    consults: { id: string; title: string; occurredAt: string; deepLink: string }[];
    leads: { id: string; title: string; status: string; occurredAt: string; deepLink: string }[];
  };
  anomalies: { id: string; type: string; title: string; occurredAt: string; deepLink: string }[];
  suggestions: { id: string; title: string; reason: string; deepLink: string }[];
  layout: {
    mode: 'published' | 'preview';
    modules: { id: string; module_type: string; position: number; config: Record<string, unknown> }[];
  } | null;
};

type Bucket = { label: string; value: number };

const SHORTCUT_ICONS: Record<string, string> = {
  门店: '店',
  客户: '客',
  装修: '装',
  入口痕迹: '迹',
  订单: '单',
  评价: '评',
  通知: '讯',
  分析: '析',
};

const DEFAULT_SHORTCUTS = [
  { href: '/m/stores', label: '门店', desc: '门店入口' },
  { href: '/m/customers', label: '客户', desc: '客户档案' },
  { href: '/m/page-builder', label: '装修', desc: '入口页装修' },
  { href: '/m/entry-funnel', label: '入口痕迹', desc: 'L0–L2 漏斗' },
  { href: '/m/orders', label: '订单', desc: '服务档案' },
  { href: '/m/reviews', label: '评价', desc: '口碑管理' },
  { href: '/m/notifications', label: '通知', desc: '触达记录' },
  { href: '/m/analytics', label: '分析', desc: '经营分析' },
] as const;

const readLinks = (config: Record<string, unknown>) => {
  const raw = config.links;
  if (!Array.isArray(raw)) return DEFAULT_SHORTCUTS;
  const links: { href: string; label: string; desc: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as { href?: string; label?: string; desc?: string };
    if (typeof row.href !== 'string' || typeof row.label !== 'string') continue;
    links.push({ href: row.href, label: row.label, desc: row.desc ?? '' });
  }
  return links.length ? links : DEFAULT_SHORTCUTS;
};

const visible = (config: Record<string, unknown>) => config.visible !== false;

function Bars({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <div className={styles.bars}>
      {items.map((item) => (
        <div className={styles.barRow} key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: total ? `${(item.value / total) * 100}%` : '0%' }}
            />
          </div>
          <span className={styles.barValue}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function PortalManagementHomeLayout({
  data,
  distribution,
}: {
  data: DashboardData;
  distribution: {
    taskMetricDist: Bucket[];
    customerMetricDist: Bucket[];
    anomalyDist: Bucket[];
    operationalDist: Bucket[];
    storeDist: Bucket[];
    queueDist: Bucket[];
    taskMetricTotal: number;
    customerMetricTotal: number;
    operationalTotal: number;
    storeTotal: number;
    anomalyTotal: number;
    queueTotal: number;
  };
}) {
  const modules = (data.layout?.modules ?? []).filter((module) => visible(module.config));
  const m = data.metrics;
  const metricCards = [
    { label: '客户总数', value: m.customers, hint: '客户总量' },
    { label: '近30日服务档案', value: m.orders30d, hint: '本地试点，非本平台下单' },
    { label: '近30日完成', value: m.completedTasks30d, hint: '近 30 天完成任务' },
    { label: '待推进任务', value: m.openTasks, hint: '全部未完成任务' },
  ] as const;

  const renderModule = (module: (typeof modules)[number]): ReactNode => {
    const type =
      module.module_type === 'quick_actions' ? 'action_grid' : module.module_type;
    const section = String(module.config.section ?? '');

    switch (type) {
      case 'hero':
        return (
          <section className={styles.heroCard} aria-label="工作台概览" key={module.id}>
            <h1>{typeof module.config.title === 'string' ? module.config.title : '工作台'}</h1>
            <p>
              {typeof module.config.subtitle === 'string'
                ? module.config.subtitle
                : '今日概况 · 常用功能 · 待办提醒 · 入口痕迹；不含支付金额与第三方订单履约'}
            </p>
          </section>
        );
      case 'content':
        if (section === 'deep_nav') return <ManagementDeepPageNav key={module.id} page="workbench" />;
        if (section === 'summary_strip')
          return (
            <section className={styles.summaryStrip} aria-label="工作台数据概况" key={module.id}>
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
          );
        if (section === 'kpi')
          return (
            <ManagementEarlyMeetingKpiStrip
              key={module.id}
              page="workbench"
              metrics={m}
              state="ready"
            />
          );
        if (section === 'distribution')
          return (
            <section className={styles.panel} aria-label="管理工作台分布" key={module.id}>
              <div className={styles.panelHead}>
                <h2>管理工作台分布</h2>
                <span className={styles.panelMeta}>由 dashboard 真实指标与队列行推导</span>
              </div>
              <div className={styles.distribution}>
                <div className={styles.panelBlock}>
                  <h3>待办指标分布</h3>
                  <Bars items={distribution.taskMetricDist} total={distribution.taskMetricTotal} />
                </div>
                <div className={styles.panelBlock}>
                  <h3>客户门店分布</h3>
                  <Bars
                    items={distribution.customerMetricDist}
                    total={distribution.customerMetricTotal}
                  />
                </div>
                <div className={styles.panelBlock}>
                  <h3>异常类型分布</h3>
                  <Bars items={distribution.anomalyDist} total={distribution.anomalyTotal} />
                </div>
                <div className={styles.panelBlock}>
                  <h3>提醒队列分布</h3>
                  <Bars items={distribution.queueDist} total={distribution.queueTotal} />
                </div>
                <div className={styles.panelBlock}>
                  <h3>经营信号分布</h3>
                  <Bars items={distribution.operationalDist} total={distribution.operationalTotal} />
                </div>
                <div className={styles.panelBlock}>
                  <h3>门店对比（30日入口+待办）</h3>
                  <Bars items={distribution.storeDist} total={distribution.storeTotal} />
                </div>
              </div>
            </section>
          );
        if (section === 'metric_cards')
          return (
            <section className={styles.panel} aria-label="作业数据" key={module.id}>
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
          );
        if (section === 'store_breakdown' && data.storeBreakdown.length)
          return (
            <section className={styles.panel} aria-label="门店对比" key={module.id}>
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
          );
        return null;
      case 'action_grid': {
        const shortcuts = readLinks(module.config);
        return (
          <section className={styles.panel} aria-label="常用功能" key={module.id}>
            <div className={styles.panelHead}>
              <h2>常用功能</h2>
              <span className={styles.panelMeta}>推广员工具快捷入口</span>
            </div>
            <div className={styles.functions}>
              {shortcuts.map((item) => (
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
        );
      }
      case 'result_list': {
        const queue = String(module.config.queue ?? 'anomalies');
        if (queue === 'anomalies')
          return (
            <section className={styles.panel} aria-label="待办与异常" key={module.id}>
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
          );
        if (queue === 'suggestions')
          return (
            <section className={styles.panel} aria-label="作业提醒" key={module.id}>
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
          );
        if (queue === 'consults')
          return (
            <section className={styles.panel} aria-label="咨询队列" key={module.id}>
              <div className={styles.head}>
                <h2>咨询队列</h2>
                <a className={styles.link} href="/m/entry-funnel">
                  入口痕迹 →
                </a>
              </div>
              {data.queues.consults.length ? (
                data.queues.consults.map((item) => (
                  <a className={styles.anomaly} href={item.deepLink} key={item.id}>
                    <div>
                      <strong>入口咨询</strong>
                      <p>{item.title}</p>
                    </div>
                    <time>{new Date(item.occurredAt).toLocaleString()}</time>
                  </a>
                ))
              ) : (
                <div className={styles.empty}>今日暂无咨询记录。</div>
              )}
            </section>
          );
        if (queue === 'leads')
          return (
            <section className={styles.panel} aria-label="线索队列" key={module.id}>
              <div className={styles.head}>
                <h2>线索队列</h2>
                <a className={styles.link} href="/e/leads">
                  员工线索池 →
                </a>
              </div>
              {data.queues.leads.length ? (
                data.queues.leads.map((item) => (
                  <a className={styles.anomaly} href={item.deepLink} key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.status === 'open' ? '待认领' : '已认领'}</p>
                    </div>
                    <time>{new Date(item.occurredAt).toLocaleDateString()}</time>
                  </a>
                ))
              ) : (
                <div className={styles.empty}>暂无开放线索。</div>
              )}
            </section>
          );
        return null;
      }
      default:
        return null;
    }
  };

  return (
    <>
      {data.layout?.mode === 'preview' ? (
        <p className={styles.panelMeta} role="status" style={{ padding: '0.5rem 1rem' }}>
          装修预览模式 · 仅当前登录可见 · 30 分钟有效
        </p>
      ) : null}
      {modules.map((module) => renderModule(module))}
    </>
  );
}
