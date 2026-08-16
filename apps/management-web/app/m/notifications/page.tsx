'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../_commerce.module.css';
import local from './notifications.module.css';
import { ManagementEarlyMeetingKpi } from '../management-early-meeting-kpi';

type Category = 'anomaly' | 'approval' | 'workflow' | 'renewal';
type NotificationRow = {
  notificationId: string;
  category: Category;
  id: string;
  title: string;
  body: string;
  deepLink: string;
  occurredAt: string;
  readAt: string | null;
  status: 'active' | 'ignored';
  version: number;
};
type SettingsAuditRecord = {
  id: string;
  action: string;
  resourceId: string;
  actorName: string;
  createdAt: string;
  correlationId: string;
  traceId: string;
  detail: Record<string, unknown> | null;
};
type Payload = {
  items: NotificationRow[];
  counts: { anomaly: number; approval: number; workflow: number; renewal: number };
};
type SettingsAuditPayload = {
  records: SettingsAuditRecord[];
  count: number;
};
type Bucket = { label: string; value: number };
type State = 'all' | 'unread' | 'read' | 'ignored';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const fmt = (iso: string) => new Date(iso).toLocaleString('zh-CN', { hour12: false });
const categoryCopy: Record<Category, string> = {
  anomaly: '异常',
  approval: '审批',
  workflow: '工作流',
  renewal: '会员',
};
const categoryTone: Record<Category, 'danger' | 'warning' | 'info' | 'success' | 'neutral'> = {
  anomaly: 'danger',
  approval: 'warning',
  workflow: 'info',
  renewal: 'neutral',
};
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};
const destinationCopy: Record<string, string> = {
  '/m/customers': '客户跟进',
  '/m/workflows': '工作流整合',
  '/m/memberships': '会员中心',
};
const stateCopy: Record<State, string> = {
  all: '全部',
  unread: '未读',
  read: '已读',
  ignored: '已忽略',
};

export default function ManagementNotificationsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Payload>({
    items: [],
    counts: { anomaly: 0, approval: 0, workflow: 0, renewal: 0 },
  });
  const [audit, setAudit] = useState<SettingsAuditPayload>({ records: [], count: 0 });
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<State>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (statusFilter !== 'all') params.set('state', statusFilter);
      const [list, auditRes] = await Promise.all([
        sessionApi.request(
          `${api}/api/v1/management/notifications${params.toString() ? `?${params}` : ''}`,
        ),
        sessionApi.request(`${api}/api/v1/management/notifications/settings-audit`),
      ]);
      if ([401, 403].includes(list.status) || [401, 403].includes(auditRes.status))
        return setState('forbidden');
      if (!list.ok || !auditRes.ok) throw Error('LOAD');
      setData((await list.json()).data as Payload);
      setAudit((await auditRes.json()).data as SettingsAuditPayload);
      setFeedback('');
      setState('ready');
    } catch {
      setState('error');
    }
  }, [category, statusFilter]);
  useEffect(() => void load(), [load]);

  const refresh = () => {
    setSelected(new Set());
    void load();
  };

  const runAction = async (id: string, action: 'read', version: number) => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setBusy(`${action}-${id}`);
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/notifications/${id}/read`,
        {
          method: 'PATCH',
          body: JSON.stringify({ version }),
          headers: {
            'content-type': 'application/json',
            'idempotency-key': `read-${id}-${Date.now()}`,
          },
        },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('ACTION');
      setFeedback('通知已标记为已读。');
      void load();
    } catch {
      setFeedback('标记失败，请重试。');
    } finally {
      setBusy('');
    }
  };

  const runBatch = async (action: 'read' | 'unread' | 'ignore' | 'unignore') => {
    if (!selected.size) {
      setFeedback('请先勾选要处置的通知。');
      return;
    }
    if (!(await sessionApi.context())) return setState('forbidden');
    setBusy(`batch-${action}`);
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/notifications/batch`, {
        method: 'POST',
        body: JSON.stringify({ action, ids: [...selected] }),
        headers: {
          'content-type': 'application/json',
          'idempotency-key': `batch-${action}-${Date.now()}`,
        },
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('ACTION');
      setFeedback(`已批量${stateCopy[action as State] ?? action} ${selected.size} 条通知。`);
      setSelected(new Set());
      void load();
    } catch {
      setFeedback('批量处置失败，请重试。');
    } finally {
      setBusy('');
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === data.items.length
        ? new Set()
        : new Set(data.items.map((i) => i.notificationId)),
    );
  };

  useEffect(() => {
    setSelected(new Set());
  }, [category, statusFilter]);

  const typeDist = useMemo<Bucket[]>(
    () => countBy(data.items.map((item) => categoryCopy[item.category])),
    [data.items],
  );
  const destinationDist = useMemo<Bucket[]>(
    () => countBy(data.items.map((item) => destinationCopy[item.deepLink] ?? '其它工具')),
    [data.items],
  );
  const loadDist = useMemo<Bucket[]>(() => {
    const c = data.counts;
    return [
      { label: '跟进异常', value: c.anomaly },
      { label: '待审批', value: c.approval },
      { label: '进行中工作流', value: c.workflow },
      { label: '会员到期/异常', value: c.renewal },
    ]
      .filter((b) => b.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data.counts]);

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载通知中心"
          description="正在汇总租户工作流与跟进待办。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看通知中心"
          description="请使用具备管理权限的账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="通知中心暂不可用"
          action={<Button onClick={() => void refresh()}>重新加载</Button>}
        />
      </main>
    );
  const { items, counts } = data;
  const total = counts.anomaly + counts.approval + counts.workflow + counts.renewal;
  return (
    <main className={styles.page} data-testid="management-notifications">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 通知中心</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void refresh()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="通知中心说明">
        <h1>通知中心</h1>
        <p>
          租户范围内可推进的工作流、审批、跟进异常与会员到期/异常汇总（统一入口/工作流工具，含会员到期提醒）；
          可标记已读、忽略并批量处置；不含支付金额与第三方订单履约态。
        </p>
      </section>

      <ManagementEarlyMeetingKpi page="notifications" />

      <section className={styles.summaryStrip} aria-label="通知概况">
        <div>
          <span>待办总数</span>
          <strong>{total}</strong>
        </div>
        <div>
          <span>跟进异常</span>
          <strong>{counts.anomaly}</strong>
        </div>
        <div>
          <span>待审批</span>
          <strong>{counts.approval}</strong>
        </div>
        <div>
          <span>进行中工作流</span>
          <strong>{counts.workflow}</strong>
        </div>
        <div>
          <span>会员到期/异常</span>
          <strong>{counts.renewal}</strong>
        </div>
      </section>

      <div className={local.toolbar}>
        <div className={local.batchMeta}>
          <input
            type="checkbox"
            aria-label="全选通知"
            checked={items.length > 0 && selected.size === items.length}
            onChange={toggleAll}
          />
          <span style={{ marginLeft: 6 }}>已选 {selected.size} 条</span>
        </div>
        <div className={local.toolbarActions}>
          <div className={local.stateFilter}>
            状态
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as State)}
              className={local.select}
              aria-label="按状态筛选通知"
            >
              <option value="all">全部</option>
              <option value="unread">未读</option>
              <option value="read">已读</option>
              <option value="ignored">已忽略</option>
            </select>
          </div>
          <div className={local.stateFilter}>
            类型
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={local.select}
              aria-label="按类型筛选通知"
            >
              <option value="">全部类型</option>
              <option value="anomaly">异常</option>
              <option value="approval">审批</option>
              <option value="workflow">工作流</option>
              <option value="renewal">会员</option>
            </select>
          </div>
          <Button
            tone="secondary"
            disabled={selected.size === 0}
            loading={busy === 'batch-read'}
            onClick={() => void runBatch('read')}
          >
            批量标为已读
          </Button>
          <Button
            tone="secondary"
            disabled={selected.size === 0}
            loading={busy === 'batch-unread'}
            onClick={() => void runBatch('unread')}
          >
            批量标为未读
          </Button>
          <Button
            tone="danger"
            disabled={selected.size === 0}
            loading={busy === 'batch-ignore'}
            onClick={() => void runBatch('ignore')}
          >
            批量忽略
          </Button>
        </div>
      </div>
      {feedback ? (
        <p className={local.feedback} role="status">
          {feedback}
        </p>
      ) : null}

      <section className={styles.distributionPanel} aria-label="通知分布">
        <div className={styles.panelHead}>
          <h2>通知分布</h2>
          <span className={styles.panelMeta}>由真实租户待推进文件行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>通知类型分布</h3>
            {items.length ? (
              <BarList items={typeDist} total={items.length} />
            ) : (
              <p className={styles.barEmpty}>暂无记录</p>
            )}
          </div>
          <div className={styles.panelBlock}>
            <h3>推进去向分布</h3>
            {items.length ? (
              <BarList items={destinationDist} total={items.length} />
            ) : (
              <p className={styles.barEmpty}>暂无记录</p>
            )}
          </div>
          <div className={styles.panelBlock}>
            <h3>待办负载分布</h3>
            {loadDist.length ? (
              <BarList items={loadDist} total={total} />
            ) : (
              <p className={styles.barEmpty}>暂无记录</p>
            )}
          </div>
        </div>
        <p className={styles.honest} role="note">
          以上分布全部由已抓取通知档案行现场推导(source=local)：通知类型、推进去向与待办负载均按真实租户待推进文件统计
          （逾期任务、归属审批、进行中工作流，以及会员将到期/已过期/长期无活跃的到期提醒）。
          通知中心仅汇总推广员工具可推进的工作流待办、跟进异常与会员到期提醒；不包含支付金额、销售成交或第三方订单履约状态。
          已读/忽略与批量处置仅登记本工具的处置状态，不会代第三方履约。
          点击「去处理」进入对应工具页面。
        </p>
      </section>

      <section aria-label="工具设置变更审计" className={styles.distributionPanel}>
        <div className={styles.panelHead}>
          <h2>工具设置变更审计</h2>
          <span className={styles.panelMeta}>
            由 tenant.operating_settings_updated 审计档案行推导
          </span>
        </div>
        {audit.records.length ? (
          <table className={local.auditTable}>
            <thead>
              <tr>
                <th>时间</th>
                <th>操作者</th>
                <th>资源</th>
                <th>关联</th>
              </tr>
            </thead>
            <tbody>
              {audit.records.slice(0, 20).map((record) => (
                <tr key={record.id}>
                  <td>{fmt(record.createdAt)}</td>
                  <td>
                    <span className={local.auditActor}>{record.actorName}</span>
                    <div className={local.muted}>工具设置更新</div>
                  </td>
                  <td className={local.muted}>
                    {record.detail && typeof record.detail === 'object'
                      ? summaryOf(record.detail)
                      : '—'}
                  </td>
                  <td className={local.muted}>{record.correlationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.barEmpty}>暂无设置变更记录</p>
        )}
        <p className={styles.honest} role="note">
          设置变更审计仅登记推广员工具内可审计的工具规则变更轨迹（source=local、不可篡改审计链）；
          不包含支付金额、不接美团/抖音实时、非本平台下单。
        </p>
      </section>

      <section className={styles.grid}>
        {items.map((item) => {
          const checked = selected.has(item.notificationId);
          return (
            <article className={styles.row} key={`${item.category}-${item.notificationId}`}>
              <div className={styles.rowHead}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      className={local.check}
                      data-checked={checked}
                      aria-hidden="true"
                      onClick={() => toggle(item.notificationId)}
                      style={{ cursor: 'pointer' }}
                    >
                      {checked ? '✓' : ''}
                    </span>
                    <StatusBadge tone={categoryTone[item.category]}>
                      {categoryCopy[item.category]}
                    </StatusBadge>
                    {item.readAt ? (
                      <StatusBadge tone="success">已读</StatusBadge>
                    ) : item.status === 'ignored' ? (
                      <StatusBadge tone="neutral">已忽略</StatusBadge>
                    ) : (
                      <StatusBadge tone="info">未读</StatusBadge>
                    )}
                  </div>
                  <h2 style={{ marginTop: 8 }}>{item.title}</h2>
                  <p>{item.body}</p>
                  <div className={local.rowActions}>
                    <a className={local.link} href={item.deepLink}>
                      去处理 →
                    </a>
                    {!item.readAt ? (
                      <Button
                        tone="quiet"
                        loading={busy === `read-${item.notificationId}`}
                        onClick={() => void runAction(item.notificationId, 'read', item.version)}
                      >
                        标为已读
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <time>{fmt(item.occurredAt)}</time>
                </div>
              </div>
            </article>
          );
        })}
        {!items.length && (
          <AppStatePanel
            kind="empty"
            title="当前没有待办通知"
            description="工作流待办、审批、跟进异常与会员到期提醒会实时汇总到这里。"
          />
        )}
      </section>
    </main>
  );
}

function summaryOf(detail: Record<string, unknown>): string {
  const keys = Object.keys(detail);
  if (!keys.length) return '—';
  const known: Record<string, string> = {
    reminders: '提醒策略',
    approvals: '审批策略',
    doNotDisturb: '勿扰策略',
    tags: '标签策略',
    ownership: '归属策略',
    brand: '品牌配置',
    version: '版本',
    updatedAt: '更新时间',
  };
  return keys
    .slice(0, 5)
    .map((key) => known[key] ?? key)
    .join('、');
}
function BarList({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li key={item.label} className={styles.barRow}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </span>
          <span className={styles.barValue}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
