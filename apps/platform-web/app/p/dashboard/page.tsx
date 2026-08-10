'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, MetricCard, businessLabel } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import { PlatformProductHome } from '../../platform-product-home';
import styles from './page.module.css';
type Data = {
  metrics: { tenants: number; channels: number; activeTenants: number; pendingEvents: number };
  risks: { type: string; count: number }[];
  system: { database: string; checkedAt: string; databaseName: string };
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
export default function PlatformDashboard() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/dashboard`, {
        headers: {},
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
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载平台经营信号"
          description="正在连接租户、渠道和安全数据。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看平台总览"
          description="请使用平台运营账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="平台总览暂不可用"
          description="请检查网络后重新加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data)
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="empty"
          title="暂无平台数据"
          description="请先完成租户开通或刷新数据。"
        />
      </main>
    );
  const cards = [
    ['活跃租户', data.metrics.tenants],
    ['已接入渠道', data.metrics.channels],
    ['30 天活跃租户', data.metrics.activeTenants],
    ['待投递事件', data.metrics.pendingEvents],
  ];
  return (
    <main className={styles.page}>
      <PlatformProductHome mode="platform" />
      <header>
        <div>
          <p>ONEDAY / 平台总览</p>
          <h1>跨租户经营信号与系统状态</h1>
          <span>仅平台专用权限可查看；指标来自真实租户、渠道、任务、订单和事件记录。</span>
        </div>
        <Button tone="secondary" onClick={() => void load()}>
          刷新
        </Button>
      </header>
      <section className={styles.cards}>
        {cards.map(([label, value]) => (
          <MetricCard key={label as string} label={label as string} value={value} />
        ))}
      </section>
      <section className={styles.grid}>
        <article>
          <h2>风险队列</h2>
          {data.risks.length ? (
            data.risks.map((risk) => (
              <p key={risk.type}>
                <b>{risk.count}</b> · {businessLabel(risk.type)}
              </p>
            ))
          ) : (
            <p>当前没有可归类的平台风险。</p>
          )}
        </article>
        <article>
          <h2>系统状态</h2>
          <p>
            <b>{data.system.database}</b> · PostgreSQL 已连接
          </p>
          <p>数据库：{data.system.databaseName}</p>
          <small>检查时间：{new Date(data.system.checkedAt).toLocaleString()}</small>
        </article>
      </section>
    </main>
  );
}
