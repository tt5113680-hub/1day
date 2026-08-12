'use client';

import { SessionApiClient } from '@oneday/session-client';
import { useCallback, useEffect, useState } from 'react';
import styles from './platform-workbench-kpi.module.css';

export type PlatformDeepPageId = 'platform' | 'channel' | 'circle' | 'outbox' | 'provisioning';

const NAV: { id: PlatformDeepPageId; href: string; label: string }[] = [
  { id: 'platform', href: '/p/dashboard', label: '平台总览' },
  { id: 'provisioning', href: '/p/tenants/new', label: '开通 Run' },
  { id: 'outbox', href: '/p/outbox', label: 'Outbox' },
  { id: 'channel', href: '/ch/dashboard', label: '渠道代理' },
  { id: 'circle', href: '/bc/dashboard', label: '商圈联盟' },
];

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export function PlatformDeepPageNav({ page }: { page: PlatformDeepPageId }) {
  return (
    <nav className={styles.deepNav} aria-label="平台工作台互链">
      {NAV.map((item) => (
        <a key={item.id} href={item.href} aria-current={item.id === page ? 'page' : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

type KpiItem = { label: string; value: string | number };

export function PlatformOperationalKpi({ page }: { page: PlatformDeepPageId }) {
  const [items, setItems] = useState<KpiItem[]>([]);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      if (!(await sessionApi.context())) {
        setState('error');
        return;
      }
      if (page === 'channel') {
        const response = await sessionApi.request(`${api}/api/v1/channel/dashboard`, { headers: {} });
        if (!response.ok) throw Error();
        const data = (await response.json()).data;
        const m = data.metrics;
        setItems([
          { label: '渠道商户', value: m.merchant_count },
          { label: '已开通', value: m.onboarded_count },
          { label: '跟进信号', value: m.renewal_opportunity_count },
          { label: '开通待办', value: data.queues?.onboarding?.length ?? 0 },
        ]);
        setNote('与 /ch/dashboard 同源；下方 renewal/onboarding 队列为可 drill-down 处置入口。');
      } else if (page === 'outbox') {
        const response = await sessionApi.request(
          `${api}/api/v1/platform/outbox/dead-letters?limit=100`,
          { headers: {} },
        );
        if (!response.ok) throw Error();
        const deadLetters = (await response.json()).data as {
          tenantId: string;
          aggregateType: string;
          attempts: number;
        }[];
        const tenants = new Set(deadLetters.map((item) => item.tenantId));
        const aggregates = new Set(deadLetters.map((item) => item.aggregateType));
        const maxedOut = deadLetters.filter((item) => item.attempts >= 6).length;
        setItems([
          { label: '死信记录', value: deadLetters.length },
          { label: '涉及租户', value: tenants.size },
          { label: '聚合对象', value: aggregates.size },
          { label: '已达上限', value: maxedOut },
        ]);
        setNote('与 /p/outbox 概况条同源；重放仅恢复本地投递，不含 GMV/第三方履约。');
      } else if (page === 'circle') {
        const response = await sessionApi.request(`${api}/api/v1/circle/dashboard`, { headers: {} });
        if (!response.ok) throw Error();
        const data = (await response.json()).data;
        const m = data.metrics;
        setItems([
          { label: '商圈数', value: m.circle_count },
          { label: '商户数', value: m.merchant_count },
          { label: '流量痕迹', value: m.traffic_events },
          { label: '未转化队列', value: data.queues?.trafficWithoutConversion?.length ?? 0 },
        ]);
        setNote('与 /bc/dashboard 同源；未转化队列=有访问无转化档案。');
      } else {
        const response = await sessionApi.request(`${api}/api/v1/platform/dashboard`, { headers: {} });
        if (!response.ok) throw Error();
        const data = (await response.json()).data;
        setItems([
          { label: '活跃租户', value: data.metrics.tenants },
          { label: 'Outbox 待投递', value: data.metrics.pendingEvents },
          { label: '开通 Run', value: data.provisioningRuns?.length ?? 0 },
          { label: '风险类型', value: data.risks?.length ?? 0 },
        ]);
        setNote('与 /p/dashboard 同源；不含 GMV/本平台收款。');
      }
      setState('ready');
    } catch {
      setState('error');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PlatformDeepPageNav page={page} />
      <section
        className={styles.kpiStrip}
        aria-label="平台经营 KPI（与工作台同源）"
        data-testid="platform-operational-kpi"
      >
        <span className={styles.kpiTitle}>平台经营 KPI · 与工作台同源 · 不含 GMV</span>
        {state === 'loading' ? (
          <p className={styles.kpiNote}>正在同步…</p>
        ) : state === 'error' ? (
          <p className={styles.kpiNote}>概况暂不可用，请刷新。</p>
        ) : (
          <>
            {items.map((item) => (
              <div className={styles.kpiItem} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            <p className={styles.kpiNote} role="note">
              {note}
            </p>
          </>
        )}
      </section>
    </>
  );
}

type ChannelQueueItem = {
  membershipId: string;
  tenantId: string;
  name: string;
  channelName: string;
  signal?: string | null;
  onboardingStatus?: string;
  deepLink: string;
};

export function ChannelOperationalQueues({
  renewal,
  onboarding,
}: {
  renewal: ChannelQueueItem[];
  onboarding: ChannelQueueItem[];
}) {
  const signalLabel = (signal?: string | null) =>
    signal === 'inactive_30d'
      ? '30 天不活跃'
      : signal === 'high_risk'
        ? '高风险'
        : '跟进信号';
  return (
    <div className={styles.queuePanel}>
      <section className={styles.kpiStrip} aria-label="渠道待办队列" data-testid="channel-operational-queues">
        <span className={styles.kpiTitle}>渠道待办队列（可 drill-down）</span>
        <div className={styles.kpiItem}>
          <span>跟进待办</span>
          <strong>{renewal.length}</strong>
        </div>
        <div className={styles.kpiItem}>
          <span>开通待办</span>
          <strong>{onboarding.length}</strong>
        </div>
      </section>
      {renewal.length ? (
        <div className={styles.queueBlock}>
          <strong>跟进信号队列（renewal）</strong>
          {renewal.map((item) => (
            <a className={styles.queueRow} href={item.deepLink} key={item.membershipId}>
              <strong>{item.name}</strong>
              <span>
                {item.channelName} · {signalLabel(item.signal)} → 查看租户
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className={styles.kpiNote}>暂无跟进信号待办。</p>
      )}
      {onboarding.length ? (
        <div className={styles.queueBlock}>
          <strong>开通中队列（onboarding）</strong>
          {onboarding.map((item) => (
            <a className={styles.queueRow} href={item.deepLink} key={item.membershipId}>
              <strong>{item.name}</strong>
              <span>
                {item.channelName} · {item.onboardingStatus === 'invited' ? '待接受' : '开通中'} →
                继续开通
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className={styles.kpiNote}>暂无开通中待办。</p>
      )}
    </div>
  );
}
