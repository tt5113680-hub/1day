'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, MetricCard, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [query, setQuery] = useState('');
  const [onboardingFilter, setOnboardingFilter] = useState('all');
  const [signalFilter, setSignalFilter] = useState<'all' | 'has_signal' | 'none'>('all');
  const [regionFilter, setRegionFilter] = useState('all');

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/channel/dashboard`, {
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

  const regions = useMemo(() => {
    if (!data) return [] as string[];
    return [
      ...new Set(
        data.merchants
          .map((m) => m.regionName?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ].sort((a, b) => a.localeCompare(b, 'zh'));
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [] as Merchant[];
    const q = query.trim().toLowerCase();
    return data.merchants.filter((merchant) => {
      if (onboardingFilter !== 'all' && merchant.onboardingStatus !== onboardingFilter) return false;
      if (signalFilter === 'has_signal' && !merchant.renewalSignal) return false;
      if (signalFilter === 'none' && merchant.renewalSignal) return false;
      if (regionFilter !== 'all' && merchant.regionName !== regionFilter) return false;
      if (!q) return true;
      return (
        merchant.name.toLowerCase().includes(q) ||
        merchant.slug.toLowerCase().includes(q) ||
        merchant.channelName.toLowerCase().includes(q) ||
        (merchant.agentName ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, query, onboardingFilter, signalFilter, regionFilter]);

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
        description="这里只展示当前授权渠道范围内的商户开通与跟进信号。"
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
        eyebrow="ONEDAY / 推广员工具 · 渠道代理"
        title="商户开通队列与跟进信号"
        description="代理后台看开通进度、省市区归属与跟进信号。续约机会仅来自不活跃或既有高风险证据，不表示套餐到期或本平台成交。"
        actions={
          <>
            <Button
              tone="secondary"
              onClick={() => {
                window.location.href = '/p/agents';
              }}
            >
              省市区代理
            </Button>
            <Button
              tone="secondary"
              onClick={() => {
                window.location.href = '/ch/merchants/new';
              }}
            >
              开通商户
            </Button>
            <Button onClick={() => void load()}>刷新数据</Button>
          </>
        }
      />
      <p className={styles.disclaimer} role="note">
        渠道代理服务「统一入口开通与归属」；不碰钱、不碰销售履约、不做替商家管店。
      </p>
      <section className={styles.metrics} aria-label="Channel operating metrics">
        {[
          ['渠道商户', metrics?.merchant_count ?? 0, '授权范围内'],
          ['已开通', metrics?.onboarded_count ?? 0, '可进入口'],
          ['近 30 天活跃', metrics?.active_count ?? 0, '有经营痕迹'],
          ['跟进信号', metrics?.renewal_opportunity_count ?? 0, '非成交漏斗'],
        ].map(([label, value, hint]) => (
          <MetricCard
            label={String(label)}
            value={value as number}
            hint={String(hint)}
            key={String(label)}
          />
        ))}
      </section>
      <Card className={styles.panel}>
        <div className={styles.controls}>
          <h2>商户经营队列</h2>
          <label>
            搜索
            <input
              aria-label="搜索商户"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="商户名 / slug / 代理"
            />
          </label>
          <label>
            开通状态
            <select
              aria-label="开通状态"
              value={onboardingFilter}
              onChange={(e) => setOnboardingFilter(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="invited">待接受</option>
              <option value="onboarding">开通中</option>
              <option value="onboarded">已开通</option>
            </select>
          </label>
          <label>
            跟进信号
            <select
              aria-label="跟进信号"
              value={signalFilter}
              onChange={(e) => setSignalFilter(e.target.value as typeof signalFilter)}
            >
              <option value="all">全部</option>
              <option value="has_signal">有信号</option>
              <option value="none">无信号</option>
            </select>
          </label>
          <label>
            区域
            <select
              aria-label="区域"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="all">全部</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
        </div>
        {rows.length ? (
          <div className={styles.table}>
            {rows.map((merchant) => (
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
                  <strong>
                    {merchant.regionName
                      ? `${merchant.regionName} · ${merchant.agentName ?? '代理'}`
                      : '未归属省市区代理'}
                  </strong>
                  <span>
                    套餐：{statusLabel(merchant.plan)}；风险：{statusLabel(merchant.riskLevel)}
                    {merchant.activeIn30Days ? '；近 30 天活跃' : '；近 30 天无活跃'}
                  </span>
                </div>
                <div className={merchant.renewalSignal ? styles.signal : ''}>
                  {merchant.renewalSignal === 'inactive_30d'
                    ? '建议跟进：连续 30 天不活跃（入口痕迹）'
                    : merchant.renewalSignal === 'high_risk'
                      ? '建议跟进：高风险商户'
                      : '暂无跟进信号'}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            {data?.merchants.length
              ? '当前筛选下没有商户，请调整搜索或过滤条件。'
              : '当前一级渠道尚未分配商户。'}
          </p>
        )}
      </Card>
    </main>
  );
}
