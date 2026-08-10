'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, StatusBadge } from '@oneday/ui';
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
        <AppStatePanel kind="loading" title="正在加载订单中心" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看订单中心" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="订单数据暂不可用"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  const paidCount = orders.filter((o) => ['paid', 'fulfilled', 'active', 'completed'].includes(o.fulfillment_status)).length;
  const amount = orders.reduce((sum, o) => sum + Number(o.amount_cents), 0);
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="美团商家端 PC · 订单"
        title="订单中心"
        description="对标美团商家端订单中心：真实、租户隔离的本地订单与履约状态。来源字段如实标注，不宣称第三方实时同步。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新
          </Button>
        }
      />
      <section className={styles.summaryStrip} aria-label="订单概况">
        <div>
          <span>订单数</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>已支付/核销</span>
          <strong>{paidCount}</strong>
        </div>
        <div>
          <span>本列表金额</span>
          <strong>
            {orders[0]?.currency ?? 'CNY'} {yuan(String(amount))}
          </strong>
        </div>
        <div>
          <span>门店</span>
          <strong>{new Set(orders.map((o) => o.store_id)).size}</strong>
        </div>
      </section>
      <p className={styles.honest}>
        订单骨架为本地试点数据（source=local）。不接美团实时订单接口，不伪造第三方订单。
      </p>
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
                <dd>{order.items?.map((i) => i.name).filter(Boolean).join('、') ?? '—'}</dd>
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
            title="暂无订单"
            description="本地试点数据为空。接入真实渠道/结算源后可在此聚合订单。"
          />
        )}
      </section>
    </main>
  );
}
