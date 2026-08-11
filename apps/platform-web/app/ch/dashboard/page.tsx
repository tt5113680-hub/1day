'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';

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

const CHANNEL_SHORTCUTS = [
  { href: '/p/agents', label: '代理', desc: '省市区代理' },
  { href: '/ch/merchants/new', label: '开通', desc: '开通商户' },
  { href: '/p/channels', label: '渠道', desc: '渠道运营' },
  { href: '/p/tenants', label: '租户', desc: '租户治理' },
] as const;

const SHORTCUT_ICONS: Record<string, string> = {
  代理: '代',
  开通: '开',
  渠道: '渠',
  租户: '租',
};

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
      <main className={styles.centered}>
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
      </main>
    );
  const metrics = data?.metrics;
  const metricCards = [
    { label: '渠道商户', value: metrics?.merchant_count ?? 0, hint: '授权范围内' },
    { label: '已开通', value: metrics?.onboarded_count ?? 0, hint: '可进入口' },
    { label: '近 30 天活跃', value: metrics?.active_count ?? 0, hint: '有经营痕迹' },
    { label: '跟进信号', value: metrics?.renewal_opportunity_count ?? 0, hint: '非成交漏斗' },
  ] as const;
  return (
    <main className={styles.page}>
      <PlatformProductHome mode="channel" />

      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 渠道代理</span>
        <div className={styles.topBarActions}>
          <a className={styles.topBarBtn} href="/p/agents">
            省市区代理
          </a>
          <a className={styles.topBarBtn} href="/ch/merchants/new">
            开通商户
          </a>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </div>
      </header>

      <section className={styles.heroCard} aria-label="渠道总览">
        <h1>商户开通队列与跟进信号</h1>
        <p>
          代理后台看开通进度、省市区归属与跟进信号。续约机会仅来自不活跃或既有高风险证据，不表示套餐到期或本平台成交。
        </p>
      </section>

      <p className={styles.disclaimer} role="note">
        渠道代理服务「统一入口开通与归属」；不碰钱、不碰销售履约、不做替商家管店。
      </p>

      <section className={styles.panel} aria-label="常用功能">
        <div className={styles.panelHead}>
          <h2>常用功能</h2>
          <span className={styles.panelMeta}>渠道代理快捷入口</span>
        </div>
        <div className={styles.functions}>
          {CHANNEL_SHORTCUTS.map((item) => (
            <a className={styles.function} href={item.href} key={item.href}>
              <span className={styles.functionIcon} aria-hidden>
                {SHORTCUT_ICONS[item.label] ?? '·'}
              </span>
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.panel} aria-label="Channel operating metrics">
        <div className={styles.panelHead}>
          <h2>渠道指标</h2>
        </div>
        <div className={styles.metrics}>
          {metricCards.map((item) => (
            <article className={styles.metric} key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel} aria-label="商户经营队列">
        <div className={styles.panelHead}>
          <h2>商户经营队列</h2>
          <span className={styles.panelMeta}>{rows.length} 家</span>
        </div>
        <div className={styles.controls}>
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
              <article className={styles.merchantCard} key={merchant.membershipId}>
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
                <div className={merchant.renewalSignal ? styles.signal : undefined}>
                  {merchant.renewalSignal === 'inactive_30d'
                    ? '建议跟进：连续 30 天不活跃（入口痕迹）'
                    : merchant.renewalSignal === 'high_risk'
                      ? '建议跟进：高风险商户'
                      : '暂无跟进信号'}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            {data?.merchants.length
              ? '当前筛选下没有商户，请调整搜索或过滤条件。'
              : '当前一级渠道尚未分配商户。'}
          </p>
        )}
      </section>
    </main>
  );
}
