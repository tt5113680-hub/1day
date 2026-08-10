'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, MetricCard, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useState } from 'react';
import { PlatformProductHome } from '../../platform-product-home';
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
  agentName?: string;
  regionName?: string;
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
const sessionApi = new SessionApiClient(api);
const statusLabel = (value: string) =>
  ({
    invited: '待接受',
    onboarding: '开通中',
    onboarded: '已开通',
    pending: '待处理',
    ready: '可服务',
    active: '正常',
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    starter: '基础版',
    growth: '成长版',
    enterprise: '企业版',
  })[value] ?? value;

export default function ChannelDashboardPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/channel/dashboard`, {
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
            ? '正在读取渠道经营数据'
            : state === 'forbidden'
              ? '当前账号无渠道经营权限'
              : '渠道经营数据暂时不可用'
        }
        description="这里只展示当前授权渠道范围内的商户与经营信号。"
        action={
          state === 'error' ? <Button onClick={() => void load()}>重新加载</Button> : undefined
        }
      />
    );
  const metrics = data?.metrics;
  return (
    <main className={styles.page}>
      <PlatformProductHome mode="channel" />
      <AdminPageHeader
        eyebrow="ONEDAY / 渠道经营"
        title="商户池、开通进度与经营信号"
        description="续约机会仅来自不活跃或既有高风险证据，不等同于套餐到期。"
        actions={<Button onClick={() => void load()}>刷新数据</Button>}
      />
      <section className={styles.metrics} aria-label="Channel operating metrics">
        {[
          ['渠道商户', metrics?.merchant_count ?? 0],
          ['已开通', metrics?.onboarded_count ?? 0],
          ['近 30 天活跃', metrics?.active_count ?? 0],
          ['续约机会信号', metrics?.renewal_opportunity_count ?? 0],
        ].map(([label, value]) => (
          <MetricCard label={String(label)} value={value} key={String(label)} />
        ))}
      </section>
      <Card className={styles.panel}>
        <h2>商户经营队列</h2>
        {data?.merchants.length ? (
          <div className={styles.table}>
            {data.merchants.map((merchant) => (
              <Card key={merchant.membershipId}>
                <div>
                  <strong>{merchant.name}</strong>
                  <span>{merchant.slug}</span>
                </div>
                <div>
                  <b>{merchant.channelName}</b>
                  <span>{merchant.channelCode}</span>
                </div>
                <div>
                  <StatusBadge tone={merchant.serviceStatus === 'ready' ? 'success' : 'warning'}>
                    {statusLabel(merchant.onboardingStatus)}
                  </StatusBadge>
                  <span>服务状态：{statusLabel(merchant.serviceStatus)}</span>
                </div>
                <div>
                  <strong>{merchant.regionName ? `${merchant.regionName} · ${merchant.agentName}` : '未归属省市区代理'}</strong>
                  <span>
                    套餐：{statusLabel(merchant.plan)}；风险：{statusLabel(merchant.riskLevel)}
                  </span>
                </div>
                <div className={merchant.renewalSignal ? styles.signal : ''}>
                  {merchant.renewalSignal === 'inactive_30d'
                    ? '建议跟进：连续 30 天不活跃'
                    : merchant.renewalSignal === 'high_risk'
                      ? '建议跟进：高风险商户'
                      : '暂无续约机会信号'}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>当前一级渠道尚未分配商户。</p>
        )}
      </Card>
    </main>
  );
}
