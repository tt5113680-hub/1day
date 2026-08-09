'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, MetricCard } from '@oneday/ui';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Merchant = {
  merchantTenantId: string;
  name: string;
  slug: string;
  benefits: string[];
  contentCount: number;
  trafficEvents: number;
  conversionOrders: number;
};
type Circle = {
  id: string;
  code: string;
  name: string;
  description: string;
  merchants: Merchant[];
};
type Data = {
  metrics: {
    circle_count: number;
    merchant_count: number;
    traffic_events: number;
    conversion_orders: number;
  };
  circles: Circle[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function BusinessCircleDashboard() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/circle/dashboard`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  if (state !== 'ready')
    return (
      <AppStatePanel
        kind={state}
        title={
          state === 'loading'
            ? '正在读取商圈经营数据'
            : state === 'forbidden'
              ? '当前账号无商圈经营权限'
              : '商圈经营数据暂时不可用'
        }
        description="这里只展示已获平台批准的商圈成员聚合经营数据。"
        action={
          state === 'error' ? <Button onClick={() => void load()}>重新加载</Button> : undefined
        }
      />
    );
  const metrics = data?.metrics;
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 商圈经营"
        title="成员权益、内容、流量与转化"
        description="仅展示平台已批准的固定商圈成员；商户经营数据仍归属各租户，本页只呈现聚合指标。"
        actions={<Button onClick={() => void load()}>刷新数据</Button>}
      />
      <section className={styles.metrics} aria-label="Business-circle metrics">
        {[
          ['固定商圈', metrics?.circle_count ?? 0],
          ['已批准商户', metrics?.merchant_count ?? 0],
          ['Consumer 行为', metrics?.traffic_events ?? 0],
          ['已确认订单', metrics?.conversion_orders ?? 0],
        ].map(([label, value]) => (
          <MetricCard label={String(label)} value={value} key={String(label)} />
        ))}
      </section>
      <Card className={styles.panel}>
        <h2>固定商圈经营明细</h2>
        {data?.circles.length ? (
          <div className={styles.circles}>
            {data.circles.map((circle) => (
              <Card key={circle.id} className={styles.circle}>
                <header>
                  <div>
                    <strong>{circle.name}</strong>
                    <span>
                      {circle.code} · {circle.description}
                    </span>
                  </div>
                  <small>{circle.merchants.length} 家已批准商户</small>
                </header>
                {circle.merchants.length ? (
                  <div className={styles.merchants}>
                    {circle.merchants.map((merchant) => (
                      <section key={merchant.merchantTenantId}>
                        <div>
                          <b>{merchant.name}</b>
                          <span>{merchant.slug}</span>
                        </div>
                        <p>
                          {merchant.benefits.length
                            ? merchant.benefits.join(' · ')
                            : '暂未配置固定权益'}
                        </p>
                        <dl>
                          <div>
                            <dt>已批准内容</dt>
                            <dd>{merchant.contentCount}</dd>
                          </div>
                          <div>
                            <dt>访问行为</dt>
                            <dd>{merchant.trafficEvents}</dd>
                          </div>
                          <div>
                            <dt>订单</dt>
                            <dd>{merchant.conversionOrders}</dd>
                          </div>
                        </dl>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className={styles.empty}>当前固定商圈尚无已批准商户。</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>当前尚无固定商圈，请先在平台商圈治理中创建并批准。</p>
        )}
      </Card>
    </main>
  );
}
