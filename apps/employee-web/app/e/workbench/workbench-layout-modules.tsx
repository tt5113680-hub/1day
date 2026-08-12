'use client';

import { Button, StatusBadge } from '@oneday/ui';
import type { ReactNode } from 'react';
import styles from './workbench.module.css';
import { EmployeeDeepPageNav, EmployeeWorkbenchKpiStrip } from '../employee-workbench-kpi';

type Task = {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  escalationLevel: number;
  version: number;
  customer: { id: string; displayName: string | null } | null;
};

type WorkbenchData = {
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

type Bucket = { label: string; value: number };

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

const DEFAULT_FUNCTIONS = [
  { href: '/e/tasks', label: '任务待办', desc: '今日任务' },
  { href: '/e/customers', label: '客户', desc: '客户档案' },
  { href: '/e/share', label: '分享推广', desc: '分享码' },
  { href: '/e/nurture', label: '客户跟进', desc: '跟进队列' },
  { href: '/e/memberships', label: '会员核销', desc: '权益核销' },
  { href: '/e/leads', label: '获客线索', desc: '线索池' },
  { href: '/e/store', label: '门店', desc: '店长工作台' },
  { href: '/e/notifications', label: '消息', desc: '通知提醒' },
] as const;

const time = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

const readLinks = (config: Record<string, unknown>) => {
  const raw = config.links;
  if (!Array.isArray(raw)) return DEFAULT_FUNCTIONS;
  const links: { href: string; label: string; desc: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as { href?: string; label?: string; desc?: string };
    if (typeof row.href !== 'string' || typeof row.label !== 'string') continue;
    links.push({ href: row.href, label: row.label, desc: row.desc ?? '' });
  }
  return links.length ? links : DEFAULT_FUNCTIONS;
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

export function PortalWorkbenchLayout({
  data,
  distribution,
  busy,
  complete,
}: {
  data: WorkbenchData;
  distribution: {
    statusDist: Bucket[];
    escalationDist: Bucket[];
    customerDist: Bucket[];
    dueDist: Bucket[];
    sourceDist: Bucket[];
    opportunityDist: Bucket[];
    leadDist: Bucket[];
    shareDist: Bucket[];
    allRows: Task[];
    opportunities: WorkbenchData['opportunities'];
  };
  busy: string | null;
  complete: (task: Task) => void;
}) {
  const modules = (data.layout?.modules ?? []).filter((module) => visible(module.config));
  const stats = data.stats;
  const overview = [
    { label: '全部待办', value: stats.allOpenTasks, hint: '未完成任务' },
    { label: '已认领线索', value: stats.claimedLeads, hint: '跟进中' },
    { label: '分享打开', value: stats.shareOpensToday, hint: '今日' },
    { label: '今日核销', value: stats.redemptionsToday, hint: '权益核销' },
  ] as const;
  const initial = data.employee.displayName.slice(0, 1);

  const renderModule = (module: (typeof modules)[number]): ReactNode => {
    const type =
      module.module_type === 'quick_actions' ? 'action_grid' : module.module_type;
    const section = String(module.config.section ?? '');

    switch (type) {
      case 'hero':
        return (
          <section className={styles.heroCard} aria-label="员工概览" key={module.id}>
            <span className={styles.avatar} aria-hidden>
              {initial}
            </span>
            <div className={styles.heroCopy}>
              <h1>
                {typeof module.config.title === 'string'
                  ? module.config.title
                  : `你好，${data.employee.displayName}`}
              </h1>
              <p>
                {typeof module.config.subtitle === 'string'
                  ? module.config.subtitle
                  : `${data.employee.title ?? '员工'} · 仅显示你的任务与客户范围 · 不含第三方订单履约`}
              </p>
            </div>
          </section>
        );
      case 'content':
        if (section === 'deep_nav') return <EmployeeDeepPageNav key={module.id} page="workbench" />;
        if (section === 'kpi')
          return (
            <section className={styles.panel} aria-labelledby={`kpi-${module.id}`} key={module.id}>
              <div className={styles.panelHead}>
                <span id={`kpi-${module.id}`}>今日作业概览</span>
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
          );
        if (section === 'distribution')
          return (
            <section className={styles.panel} aria-label="工作台作业分布" key={module.id}>
              <div className={styles.panelHead}>
                <h2>工作台作业分布</h2>
                <span className={styles.panelMeta}>由工作台真实行推导</span>
              </div>
              <div className={styles.distribution}>
                <div className={styles.panelBlock}>
                  <h3>状态分布</h3>
                  <Bars items={distribution.statusDist} total={distribution.allRows.length} />
                </div>
                <div className={styles.panelBlock}>
                  <h3>升级分布</h3>
                  <Bars items={distribution.escalationDist} total={distribution.allRows.length} />
                </div>
                <div className={styles.panelBlock}>
                  <h3>客户关联分布</h3>
                  <Bars items={distribution.customerDist} total={distribution.allRows.length} />
                </div>
                <div className={styles.panelBlock}>
                  <h3>到期窗口分布</h3>
                  <Bars items={distribution.dueDist} total={distribution.allRows.length} />
                </div>
                <div className={styles.panelBlock}>
                  <h3>来源分布</h3>
                  <Bars
                    items={distribution.sourceDist}
                    total={distribution.allRows.length + distribution.opportunities.length}
                  />
                </div>
                <div className={styles.panelBlock}>
                  <h3>行动机会分布</h3>
                  <Bars
                    items={distribution.opportunityDist}
                    total={distribution.opportunities.length}
                  />
                </div>
                <div className={styles.panelBlock}>
                  <h3>线索分布</h3>
                  <Bars
                    items={distribution.leadDist}
                    total={stats.claimedLeads + stats.poolLeads}
                  />
                </div>
                <div className={styles.panelBlock}>
                  <h3>分享分布</h3>
                  <Bars
                    items={distribution.shareDist}
                    total={stats.activeShareCodes + stats.shareOpensToday}
                  />
                </div>
              </div>
            </section>
          );
        return null;
      case 'action_grid': {
        const functions = readLinks(module.config);
        return (
          <section className={styles.panel} aria-label="常用功能网格" key={module.id}>
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
        );
      }
      case 'result_list': {
        const queue = String(module.config.queue ?? 'tasks');
        if (queue === 'tasks')
          return (
            <section className={styles.panel} aria-labelledby={`tasks-${module.id}`} key={module.id}>
              <div className={styles.panelHead}>
                <h2 id={`tasks-${module.id}`}>今天要做</h2>
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
                      <Button loading={busy === task.id} onClick={() => complete(task)}>
                        完成
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </section>
          );
        if (queue === 'opportunities')
          return (
            <section className={styles.panel} aria-labelledby={`opp-${module.id}`} key={module.id}>
              <div className={styles.panelHead}>
                <h2 id={`opp-${module.id}`}>行动机会</h2>
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
          );
        if (queue === 'customer_reminders')
          return (
            <section className={styles.panel} aria-labelledby={`rem-${module.id}`} key={module.id}>
              <div className={styles.panelHead}>
                <h2 id={`rem-${module.id}`}>客户提醒</h2>
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
          );
        if (queue === 'leads')
          return (
            <section className={styles.panel} aria-labelledby={`lead-${module.id}`} key={module.id}>
              <div className={styles.panelHead}>
                <h2 id={`lead-${module.id}`}>线索队列</h2>
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
          );
        if (queue === 'share_codes')
          return (
            <section className={styles.panel} aria-labelledby={`share-${module.id}`} key={module.id}>
              <div className={styles.panelHead}>
                <h2 id={`share-${module.id}`}>分享码</h2>
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
                        {item.expiresAt
                          ? ` · 到期 ${new Date(item.expiresAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    <span>活跃</span>
                  </a>
                ))
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
        <p className={styles.feedback} role="status">
          装修预览模式 · 仅当前登录可见 · 30 分钟有效
        </p>
      ) : null}
      {modules.map((module) => renderModule(module))}
    </>
  );
}
