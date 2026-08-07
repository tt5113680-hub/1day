'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Merchant = {
  membershipId: string;
  channelName: string;
  channelCode: string;
  name: string;
  slug: string;
  onboardingStatus: string;
  serviceStatus: string;
  plan: string;
  riskLevel: string;
  activeIn30Days: boolean;
  renewalSignal: 'inactive_30d' | 'high_risk' | null;
};
type Data = {
  metrics: {
    merchant_count: number;
    onboarded_count: number;
    active_count: number;
    renewal_opportunity_count: number;
  };
  merchants: Merchant[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export default function ChannelDashboardPage() {
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
      const response = await fetch(`${api}/api/v1/channel/dashboard`, { headers: headers() });
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
    return <main className={styles.centered}>Loading channel operations…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>Channel dashboard access is restricted</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>Channel dashboard is temporarily unavailable</h1>
          <button onClick={() => void load()}>Retry</button>
        </section>
      </main>
    );
  const metrics = data?.metrics;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / CHANNEL OPERATIONS</p>
          <h1>Merchant pool, onboarding and operating signals</h1>
          <span>
            Renewal opportunities are evidence-based signals from inactivity or an existing
            high-risk record, not a claimed subscription expiry.
          </span>
        </div>
        <button onClick={() => void load()}>Refresh</button>
      </header>
      <section className={styles.metrics} aria-label="Channel operating metrics">
        {[
          ['Merchant pool', metrics?.merchant_count ?? 0],
          ['Onboarded', metrics?.onboarded_count ?? 0],
          ['Active in 30 days', metrics?.active_count ?? 0],
          ['Renewal opportunity signals', metrics?.renewal_opportunity_count ?? 0],
        ].map(([label, value]) => (
          <article key={String(label)}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className={styles.panel}>
        <h2>Merchant operating queue</h2>
        {data?.merchants.length ? (
          <div className={styles.table}>
            {data.merchants.map((merchant) => (
              <article key={merchant.membershipId}>
                <div>
                  <strong>{merchant.name}</strong>
                  <span>{merchant.slug}</span>
                </div>
                <div>
                  <b>{merchant.channelName}</b>
                  <span>{merchant.channelCode}</span>
                </div>
                <div>
                  <b>{merchant.onboardingStatus}</b>
                  <span>service: {merchant.serviceStatus}</span>
                </div>
                <div>
                  <b>{merchant.activeIn30Days ? 'active in 30d' : 'no 30d activity'}</b>
                  <span>
                    plan: {merchant.plan}; risk: {merchant.riskLevel}
                  </span>
                </div>
                <div className={merchant.renewalSignal ? styles.signal : ''}>
                  {merchant.renewalSignal === 'inactive_30d'
                    ? 'Follow up: inactive 30 days'
                    : merchant.renewalSignal === 'high_risk'
                      ? 'Follow up: high risk'
                      : 'No renewal opportunity signal'}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            No merchants have been assigned to a first-level channel yet.
          </p>
        )}
      </section>
    </main>
  );
}
