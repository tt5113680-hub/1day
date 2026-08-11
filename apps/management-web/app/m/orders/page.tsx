'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from '../_commerce.module.css';

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
};

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
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/commerce/orders`);
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setOrders((await response.json()).data as OrderRow[]);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
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
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="订单痕迹说明">
        <h1>订单痕迹</h1>
        <p>
          第三方成交/跳转档案（本地试点，租户隔离）。来源如实标注；不宣称美团实时同步，不包含本平台收款，不代表第三方订单履约。
        </p>
      </section>

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
      <section className={styles.grid}>
        {orders.map((order) => (
          <article className={styles.row} key={order.id}>
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
    </main>
  );
}
