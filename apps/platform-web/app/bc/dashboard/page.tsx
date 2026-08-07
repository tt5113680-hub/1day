'use client';

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

export default function BusinessCircleDashboard() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const headers = () => ({
    authorization: `Bearer ${sessionStorage.getItem('oneday.accessToken')}`,
    'x-request-id': crypto.randomUUID(),
  });
  const load = useCallback(async () => {
    if (!sessionStorage.getItem('oneday.accessToken')) return setState('forbidden');
    setState('loading');
    try {
      const response = await fetch(`${api}/api/v1/circle/dashboard`, { headers: headers() });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  if (state === 'loading')
    return <main className={styles.centered}>Loading fixed business-circle operations…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>Business-circle dashboard access is restricted</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>Business-circle dashboard is temporarily unavailable</h1>
          <button onClick={() => void load()}>Retry</button>
        </section>
      </main>
    );
  const metrics = data?.metrics;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / FIXED BUSINESS CIRCLES</p>
          <h1>Merchant benefits, content, traffic and conversion</h1>
          <span>
            Only platform-approved fixed-circle members appear here. Merchant operational data
            remains tenant-owned and is projected as aggregate metrics only.
          </span>
        </div>
        <button onClick={() => void load()}>Refresh</button>
      </header>
      <section className={styles.metrics} aria-label="Business-circle metrics">
        {[
          ['Fixed circles', metrics?.circle_count ?? 0],
          ['Approved merchants', metrics?.merchant_count ?? 0],
          ['Consumer action events', metrics?.traffic_events ?? 0],
          ['Confirmed orders', metrics?.conversion_orders ?? 0],
        ].map(([label, value]) => (
          <article key={String(label)}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className={styles.panel}>
        <h2>Fixed business-circle operations</h2>
        {data?.circles.length ? (
          <div className={styles.circles}>
            {data.circles.map((circle) => (
              <article key={circle.id} className={styles.circle}>
                <header>
                  <div>
                    <strong>{circle.name}</strong>
                    <span>
                      {circle.code} · {circle.description}
                    </span>
                  </div>
                  <small>{circle.merchants.length} approved merchants</small>
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
                            : 'No fixed benefits configured'}
                        </p>
                        <dl>
                          <div>
                            <dt>Approved content</dt>
                            <dd>{merchant.contentCount}</dd>
                          </div>
                          <div>
                            <dt>Traffic events</dt>
                            <dd>{merchant.trafficEvents}</dd>
                          </div>
                          <div>
                            <dt>Orders</dt>
                            <dd>{merchant.conversionOrders}</dd>
                          </div>
                        </dl>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className={styles.empty}>
                    No approved merchant is currently assigned to this fixed circle.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            No fixed business circle exists yet. Create and approve one from platform
            business-circle management.
          </p>
        )}
      </section>
    </main>
  );
}
