'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from '../_commerce.module.css';
import { ManagementEarlyMeetingKpi } from '../management-early-meeting-kpi';

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  store_id: string;
  store_name: string;
  source: string;
  amount_cents: string;
  currency: string;
  fulfillment_status: string;
  status: string;
  merchant_note: string | null;
  occurred_at: string;
  items: { name?: string; qty?: number; source?: string }[];
  evidence_count?: number;
  connector_count?: number;
};

type TraceSource = {
  source_role: string | null;
  source_type: string | null;
  source_id: string | null;
  status: string | null;
  created_at: string;
};
type TraceTask = {
  title: string;
  status: string | null;
  due_at: string | null;
  escalation_level: number | null;
  created_at: string;
  assignee_name: string | null;
};
type TraceAudit = {
  action: string;
  action_type: string | null;
  resource_id: string | null;
  details: unknown;
  created_at: string;
  actor_name?: string;
};
type OrderDetail = {
  order: OrderRow;
  sources: TraceSource[];
  tasks: TraceTask[];
  audits: TraceAudit[];
};

type OrderInsights = {
  days: number;
  totalStores: number;
  storeCompare: {
    storeId: string;
    storeName: string;
    total: number;
    valid: number;
    validRate: number;
    currency: string;
    amountRef: string;
    sources: { source: string; count: number }[];
  }[];
  timeSeries: { day: string; count: number; validCount: number }[];
};

const TREND_DAYS = [7, 30, 90] as const;

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const yuan = (cents: string) => (Number(cents) / 100).toFixed(2);
const fmt = (iso: string) => new Date(iso).toLocaleString('zh-CN', { hour12: false });
const statusCopy: Record<string, string> = {
  active: '有效',
  void: '已取消',
  completed: '已完成',
  fulfilled: '已核销',
  paid: '已支付',
  unpaid: '待支付',
  refunded: '已退款',
};
const toneOf = (value: string): 'success' | 'warning' | 'neutral' => {
  if (['active', 'completed', 'fulfilled', 'paid'].includes(value)) return 'success';
  if (['void', 'refunded', 'unpaid'].includes(value)) return 'warning';
  return 'neutral';
};

export default function CommerceOrdersPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [insights, setInsights] = useState<OrderInsights | null>(null);
  const [trendDays, setTrendDays] = useState<(typeof TREND_DAYS)[number]>(30);
  const [busy, setBusy] = useState<'export' | null>(null);
  const [notice, setNotice] = useState('');
  const [drawer, setDrawer] = useState<{
    orderId: string;
    detail: OrderDetail | null;
    loading: boolean;
  } | null>(null);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const [listResponse, insightsResponse] = await Promise.all([
        sessionApi.request(`${api}/api/v1/management/commerce/orders`),
        sessionApi.request(`${api}/api/v1/management/commerce/orders/insights?days=${trendDays}`),
      ]);
      if ([401, 403].includes(listResponse.status) || [401, 403].includes(insightsResponse.status))
        return setState('forbidden');
      if (!listResponse.ok || !insightsResponse.ok) throw Error();
      setOrders((await listResponse.json()).data as OrderRow[]);
      setInsights((await insightsResponse.json()).data as OrderInsights);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [trendDays]);
  const openDetail = async (orderId: string) => {
    setDrawer({ orderId, detail: null, loading: true });
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/commerce/orders/${orderId}`,
      );
      if ([401, 403].includes(response.status))
        return setDrawer({ orderId, detail: null, loading: false });
      if (!response.ok) return setDrawer({ orderId, detail: null, loading: false });
      const { data } = (await response.json()) as { data: OrderDetail };
      setDrawer({ orderId, detail: data, loading: false });
    } catch {
      setDrawer({ orderId, detail: null, loading: false });
    }
  };
  const closeDrawer = () => setDrawer(null);
  const requestExport = async () => {
    setBusy('export');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/commerce/orders/export`);
      if ([401, 403].includes(response.status)) {
        setNotice('无权导出订单痕迹');
        return;
      }
      if (!response.ok) throw Error('EXPORT');
      const csv = await response.text();
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-trace-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice('订单痕迹已导出（本地档案 source=local，不含第三方实时与支付金额）。');
    } catch {
      setNotice('导出失败，请稍后再试。');
    } finally {
      setBusy(null);
    }
  };
  useEffect(() => void load(), [load]);
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载订单痕迹" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看订单痕迹" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="订单痕迹暂不可用"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  const paidCount = orders.filter((o) =>
    ['paid', 'fulfilled', 'active', 'completed'].includes(o.fulfillment_status),
  ).length;
  const amount = orders.reduce((sum, o) => sum + Number(o.amount_cents), 0);
  const statusBuckets = {
    valid: orders.filter((o) =>
      ['active', 'completed', 'fulfilled', 'paid'].includes(o.fulfillment_status),
    ).length,
    unpaid: orders.filter((o) => o.fulfillment_status === 'unpaid').length,
    refunded: orders.filter((o) => o.fulfillment_status === 'refunded').length,
    void: orders.filter((o) => o.fulfillment_status === 'void').length,
  };
  const byStatus = [
    { key: '有效', value: statusBuckets.valid },
    { key: '待支付', value: statusBuckets.unpaid },
    { key: '已退款', value: statusBuckets.refunded },
    { key: '已取消', value: statusBuckets.void },
  ];
  const storeCounts = new Map<string, number>();
  for (const o of orders) storeCounts.set(o.store_name, (storeCounts.get(o.store_name) ?? 0) + 1);
  const byStore = [...storeCounts.entries()].map(([name, value]) => ({ key: name, value }));
  const sourceCounts = new Map<string, number>();
  for (const o of orders) sourceCounts.set(o.source, (sourceCounts.get(o.source) ?? 0) + 1);
  const bySource = [...sourceCounts.entries()].map(([key, value]) => ({ key, value }));
  const topBarTitle = '推广员工具 · 订单痕迹';
  return (
    <main className={styles.page} data-testid="management-orders">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>{topBarTitle}</span>
        <div className={styles.topBarActions}>
          <button
            className={styles.topBarRefresh}
            type="button"
            disabled={busy === 'export'}
            onClick={() => void requestExport()}
          >
            {busy === 'export' ? '导出中…' : '导出'}
          </button>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </div>
      </header>

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      <section className={styles.heroCard} aria-label="订单痕迹说明">
        <h1>订单痕迹</h1>
        <p>
          第三方成交/跳转档案（本地试点，租户隔离）。来源如实标注；不宣称美团实时同步，不包含本平台收款，不代表第三方订单履约。
        </p>
      </section>

      <ManagementEarlyMeetingKpi page="orders" />

      <p className={styles.honest} role="status">
        订单痕迹为本地试点档案（source=local）。推广员工具只留档案痕迹；不接美团实时订单，不伪造第三方成交，不包含本平台收款，非本平台下单。
      </p>

      <section className={styles.summaryStrip} aria-label="订单痕迹概况">
        <div>
          <span>档案记录数</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>状态为有效的记录</span>
          <strong>{paidCount}</strong>
        </div>
        <div>
          <span>记录金额参考</span>
          <strong>
            {orders[0]?.currency ?? 'CNY'} {yuan(String(amount))}
          </strong>
        </div>
        <div>
          <span>涉及门店</span>
          <strong>{new Set(orders.map((o) => o.store_id)).size}</strong>
        </div>
      </section>
      <section className={styles.panel} aria-label="订单痕迹分布">
        <div className={styles.panelBlock}>
          <h2>状态分布</h2>
          <ul className={styles.bars}>
            {byStatus.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${orders.length ? (b.value / orders.length) * 100 : 0}%` }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!orders.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>门店分布</h2>
          <ul className={styles.bars}>
            {byStore.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${orders.length ? (b.value / orders.length) * 100 : 0}%` }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!orders.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>来源分布</h2>
          <ul className={styles.bars}>
            {bySource.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${orders.length ? (b.value / orders.length) * 100 : 0}%` }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!orders.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>
      <section className={styles.panel} aria-label="订单门店对比与时间序列">
        <div className={styles.panelBlock}>
          <h2>门店对比</h2>
          <p className={styles.panelMeta}>
            近 {insights?.days ?? trendDays} 天各门店档案（记录/有效/金额参考）。
          </p>
          <ul className={styles.bars}>
            {(insights?.storeCompare ?? []).map((store) => (
              <li key={store.storeId} className={styles.barRow}>
                <span className={styles.barLabel}>{store.storeName}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${
                        insights && insights.storeCompare.length
                          ? (store.total / Math.max(1, insights.storeCompare[0]?.total ?? 1)) * 100
                          : 0
                      }%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>
                  {store.valid}/{store.total}
                </span>
              </li>
            ))}
            {!insights?.storeCompare.length && (
              <li className={styles.barEmpty}>窗口内暂无门店档案</li>
            )}
          </ul>
          {insights && insights.storeCompare.length > 0 && (
            <ul className={styles.bars}>
              {insights.storeCompare.map((store) => (
                <li key={store.storeId} className={styles.detailRow}>
                  <span className={styles.barLabel}>{store.storeName}</span>
                  <span className={styles.detailValue}>
                    有效 {store.valid} / 记录 {store.total}（{(store.validRate * 100).toFixed(1)}%）
                    · 金额参考 {store.currency} {yuan(store.amountRef)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.panelBlock}>
          <h2>时间序列</h2>
          <p className={styles.panelMeta}>按日志档条数与有效条数（本地档案）。</p>
          <div className={styles.chips}>
            {TREND_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.chip} ${trendDays === d ? styles.chipActive : ''}`}
                onClick={() => setTrendDays(d)}
              >
                {d} 天
              </button>
            ))}
          </div>
          <ul className={styles.trendList}>
            {(insights?.timeSeries ?? []).map((point) => (
              <li key={point.day} className={styles.trendRow}>
                <span className={styles.trendDay}>{point.day.slice(5)}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${
                        insights && insights.timeSeries.length
                          ? (point.count / Math.max(1, insights.timeSeries[0]?.count ?? 1)) * 100
                          : 0
                      }%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>
                  {point.validCount}/{point.count}
                </span>
              </li>
            ))}
            {!insights?.timeSeries.length && <li className={styles.barEmpty}>窗口内暂无序列点</li>}
          </ul>
        </div>
      </section>
      <section className={styles.grid}>
        {orders.map((order) => (
          <article
            className={styles.row}
            key={order.id}
            onClick={() => void openDetail(order.id)}
            data-testid="order-detail-open"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') void openDetail(order.id);
            }}
          >
            <div className={styles.rowHead}>
              <div>
                <h2>{order.order_number}</h2>
                <p>
                  {order.customer_name ?? '匿名客户'} · {order.store_name}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusBadge tone={toneOf(order.fulfillment_status)}>
                  {statusCopy[order.fulfillment_status] ?? order.fulfillment_status}
                </StatusBadge>
                <div className={styles.amount}>
                  {order.currency} {yuan(order.amount_cents)}
                </div>
              </div>
            </div>
            <dl className={styles.dl}>
              <div>
                <dt>来源</dt>
                <dd>{statusCopy[order.source] ?? order.source}</dd>
              </div>
              <div>
                <dt>时间</dt>
                <dd>{fmt(order.occurred_at)}</dd>
              </div>
              <div>
                <dt>商品/套餐</dt>
                <dd>
                  {order.items
                    ?.map((i) => i.name)
                    .filter(Boolean)
                    .join('、') ?? '—'}
                </dd>
              </div>
              <div>
                <dt>门店备注</dt>
                <dd>{order.merchant_note ?? '—'}</dd>
              </div>
            </dl>
          </article>
        ))}
        {!orders.length && (
          <AppStatePanel
            kind="empty"
            title="暂无订单痕迹"
            description="本地试点档案为空。接入渠道跳转/结算源后可在此聚合第三方成交痕迹。"
          />
        )}
      </section>

      {drawer && (
        <OrderTraceDrawer detail={drawer.detail} loading={drawer.loading} onClose={closeDrawer} />
      )}
    </main>
  );
}

function OrderTraceDrawer({
  detail,
  loading,
  onClose,
}: {
  detail: OrderDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const order = detail?.order ?? null;
  const label = (value: string | null | undefined, map: Record<string, string>) =>
    map[value ?? ''] ?? value ?? '—';
  return (
    <div className={styles.drawerBackdrop} onClick={onClose} data-testid="order-detail-drawer">
      <aside
        className={styles.drawer}
        role="dialog"
        aria-label="订单痕迹详情"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.drawerHead}>
          <h2>{order?.order_number ?? '订单痕迹详情'}</h2>
          <button className={styles.topBarRefresh} type="button" onClick={onClose}>
            关闭
          </button>
        </header>
        {loading && <p className={styles.drawerNote}>正在加载订单痕迹详情…</p>}
        {!loading && !detail && (
          <p className={styles.drawerNote}>订单痕迹详情暂不可用或已超出授权范围。</p>
        )}
        {!loading && detail && order && (
          <div className={styles.drawerBody}>
            <section className={styles.drawerCard} aria-label="订单档案">
              <dl className={styles.dl}>
                <div>
                  <dt>门店</dt>
                  <dd>{order.store_name}</dd>
                </div>
                <div>
                  <dt>客户</dt>
                  <dd>{order.customer_name ?? '匿名客户'}</dd>
                </div>
                <div>
                  <dt>来源</dt>
                  <dd>{label(order.source, statusCopy)}</dd>
                </div>
                <div>
                  <dt>金额参考</dt>
                  <dd>
                    {order.currency} {yuan(order.amount_cents)}
                  </dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>{label(order.fulfillment_status, statusCopy)}</dd>
                </div>
                <div>
                  <dt>时间</dt>
                  <dd>{fmt(order.occurred_at)}</dd>
                </div>
                <div>
                  <dt>证据文书</dt>
                  <dd>{order.evidence_count ?? 0}</dd>
                </div>
                <div>
                  <dt>回执</dt>
                  <dd>{order.connector_count ?? 0}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.drawerCard} aria-label="来源链">
              <h3>来源链（source=local）</h3>
              {detail.sources.length ? (
                <ul className={styles.chainList}>
                  {detail.sources.map((s, index) => (
                    <li key={index}>
                      <span>{label(s.source_role, {})}</span>
                      <span>{label(s.source_type, {})}</span>
                      <span>{label(s.status, {})}</span>
                      <span>{fmt(s.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.drawerNote}>暂无来源记录</p>
              )}
            </section>

            <section className={styles.drawerCard} aria-label="客户任务链">
              <h3>客户任务链（Consult→Task→Done）</h3>
              {detail.tasks.length ? (
                <ul className={styles.chainList}>
                  {detail.tasks.map((t, index) => (
                    <li key={index}>
                      <span>{t.title}</span>
                      <span>{label(t.status, statusCopy)}</span>
                      <span>{t.assignee_name ?? '未分配'}</span>
                      <span>{t.due_at ? fmt(t.due_at) : '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.drawerNote}>暂无任务</p>
              )}
            </section>

            <section className={styles.drawerCard} aria-label="本地审计链">
              <h3>本地审计链</h3>
              {detail.audits.length ? (
                <ul className={styles.chainList}>
                  {detail.audits.map((a, index) => (
                    <li key={index}>
                      <span>{label(a.action, {})}</span>
                      <span>{label(a.action_type, {})}</span>
                      <span>{a.actor_name ?? '系统'}</span>
                      <span>{fmt(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.drawerNote}>暂无审计记录</p>
              )}
            </section>

            <p className={styles.honest}>
              订单痕迹为本地试点档案（source=local）。详情仅聚合来源、客户与任务痕迹，不接美团实时订单，不代表第三方成交或履约，不含本平台收款，非本平台下单。
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
