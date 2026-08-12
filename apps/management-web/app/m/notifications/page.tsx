'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../_commerce.module.css';
import { ManagementEarlyMeetingKpi } from '../management-early-meeting-kpi';

type NotificationRow = {
  category: 'anomaly' | 'approval' | 'workflow';
  id: string;
  title: string;
  body: string;
  deepLink: string;
  occurredAt: string;
};
type Payload = {
  items: NotificationRow[];
  counts: { anomaly: number; approval: number; workflow: number };
};
type Bucket = { label: string; value: number };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const fmt = (iso: string) => new Date(iso).toLocaleString('zh-CN', { hour12: false });
const categoryCopy: Record<NotificationRow['category'], string> = {
  anomaly: '异常',
  approval: '审批',
  workflow: '工作流',
};
const categoryTone: Record<
  NotificationRow['category'],
  'danger' | 'warning' | 'info' | 'success' | 'neutral'
> = { anomaly: 'danger', approval: 'warning', workflow: 'info' };
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
};

export default function ManagementNotificationsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Payload>({
    items: [],
    counts: { anomaly: 0, approval: 0, workflow: 0 },
  });
  const [category, setCategory] = useState('');
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      const response = await sessionApi.request(
        `${api}/api/v1/management/notifications${params.toString() ? `?${params}` : ''}`,
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setData((await response.json()).data as Payload);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [category]);
  useEffect(() => void load(), [load]);

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
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  const { items, counts } = data;
  const total = counts.anomaly + counts.approval + counts.workflow;
  return (
    <main className={styles.page} data-testid="management-notifications">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 通知中心</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="通知中心说明">
        <h1>通知中心</h1>
        <p>
          租户范围内可推进的工作流、审批与跟进异常汇总（统一入口/工作流工具）；
          不含支付金额与第三方订单履约态。
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
      </section>

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
          以上分布全部由已抓取通知档案行现场推导(source=local)：通知类型、推进去向与待办负载均按真实租户待推进文件统计。
          通知中心仅汇总推广员工具可推进的工作流待办与跟进异常；不包含支付金额、销售成交或第三方订单履约状态。
          点击「去处理」进入对应工具页面。
        </p>
      </section>

      <section className={styles.dl} style={{ gridTemplateColumns: '1fr', marginTop: 20, gap: 12 }}>
        <label>
          类型
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={{ marginLeft: 8, fontSize: 14, padding: '6px 10px' }}
          >
            <option value="">全部类型</option>
            <option value="anomaly">异常</option>
            <option value="approval">审批</option>
            <option value="workflow">工作流</option>
          </select>
        </label>
      </section>
      <section className={styles.grid}>
        {items.map((item) => (
          <article className={styles.row} key={`${item.category}-${item.id}`}>
            <div className={styles.rowHead}>
              <div>
                <StatusBadge tone={categoryTone[item.category]}>
                  {categoryCopy[item.category]}
                </StatusBadge>
                <h2 style={{ marginTop: 8 }}>{item.title}</h2>
                <p>{item.body}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <time>{fmt(item.occurredAt)}</time>
                <div style={{ marginTop: 12 }}>
                  <a href={item.deepLink}>去处理 →</a>
                </div>
              </div>
            </div>
          </article>
        ))}
        {!items.length && (
          <AppStatePanel
            kind="empty"
            title="当前没有待办通知"
            description="工作流待办、审批与跟进异常会实时汇总到这里。"
          />
        )}
      </section>
    </main>
  );
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
