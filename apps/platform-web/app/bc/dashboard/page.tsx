'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlatformProductHome } from '../../platform-product-home';
import { PlatformOperationalKpi } from '../../platform-workbench-kpi';
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
  queues: {
    trafficWithoutConversion: {
      circleId: string;
      circleName: string;
      tenantId: string;
      name: string;
      slug: string;
      trafficEvents: number;
      conversionOrders: number;
      deepLink: string;
    }[];
  };
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const CIRCLE_SHORTCUTS = [
  { href: '/p/business-circles', label: '商圈', desc: '商圈治理' },
  { href: '/p/channels', label: '渠道', desc: '渠道运营' },
  { href: '/p/tenants', label: '租户', desc: '租户治理' },
  { href: '/ch/dashboard', label: '代理', desc: '渠道代理台' },
] as const;

const SHORTCUT_ICONS: Record<string, string> = {
  商圈: '圈',
  渠道: '渠',
  租户: '租',
  代理: '代',
};

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const circleScaleLabel = (n: number) =>
  n <= 0 ? '未收拢商户 0' : n <= 5 ? '精简联盟 1-5' : n <= 15 ? '中型联盟 6-15' : '规模联盟 16+';
const merchantBenefitLabel = (n: number) =>
  n <= 0 ? '未配置权益 0' : n <= 4 ? '基础权益 1-4' : '丰富权益 5+';
const contentDensityLabel = (n: number) =>
  n <= 0 ? '未投内容 0' : n <= 5 ? '轻度内容 1-5' : '丰富内容 6+';
const trafficDensityLabel = (n: number) =>
  n <= 0 ? '尚无行为 0' : n < 10 ? '低活跃 1-9' : n < 100 ? '中活跃 10-99' : '高活跃 100+';
const conversionDensityLabel = (n: number) =>
  n <= 0 ? '未转化 0' : n < 10 ? '少量转化 1-9' : '高转化 10+';

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
  const circleScaleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const circle of data?.circles ?? []) {
      const key = circleScaleLabel(circle.merchants.length);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [data]);
  const merchantTotal = (data?.circles ?? []).reduce(
    (acc, circle) => acc + circle.merchants.length,
    0,
  );
  const allMerchants = (data?.circles ?? []).flatMap((circle) => circle.merchants);
  const merchantBenefitCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const merchant of allMerchants) {
      const key = merchantBenefitLabel(merchant.benefits?.length ?? 0);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [allMerchants]);
  const contentDensityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const merchant of allMerchants) {
      const key = contentDensityLabel(merchant.contentCount ?? 0);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [allMerchants]);
  const trafficDensityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const merchant of allMerchants) {
      const key = trafficDensityLabel(merchant.trafficEvents ?? 0);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [allMerchants]);
  const conversionDensityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const merchant of allMerchants) {
      const key = conversionDensityLabel(merchant.conversionOrders ?? 0);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [allMerchants]);
  if (state !== 'ready')
    return (
      <main className={styles.centered}>
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
      </main>
    );
  const metrics = data?.metrics;
  const metricCards = [
    { label: '固定商圈', value: metrics?.circle_count ?? 0 },
    { label: '已批准商户', value: metrics?.merchant_count ?? 0 },
    { label: 'Consumer 行为', value: metrics?.traffic_events ?? 0 },
    { label: '已确认入口转化', value: metrics?.conversion_orders ?? 0 },
  ] as const;
  return (
    <main className={styles.page}>
      <PlatformProductHome mode="circle" />

      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 商圈联盟</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="商圈总览">
        <h1>成员权益、内容、流量与入口转化</h1>
        <p>
          仅展示平台已批准的固定商圈成员；商户数据仍归属各租户。本页只呈现聚合入口痕迹，非本平台下单。
        </p>
      </section>

      <PlatformOperationalKpi page="circle" />

      <section className={styles.summaryStrip} aria-label="商圈联盟概况">
        <div>
          <span>固定商圈</span>
          <strong>{metrics?.circle_count ?? 0}</strong>
        </div>
        <div>
          <span>已批准商户</span>
          <strong>{merchantTotal}</strong>
        </div>
        <div>
          <span>访问行为</span>
          <strong>{metrics?.traffic_events ?? 0}</strong>
        </div>
        <div>
          <span>入口转化</span>
          <strong>{metrics?.conversion_orders ?? 0}</strong>
        </div>
      </section>

      <section className={styles.panel} aria-label="常用功能">
        <div className={styles.panelHead}>
          <h2>常用功能</h2>
          <span className={styles.panelMeta}>商圈联盟快捷入口</span>
        </div>
        <div className={styles.functions}>
          {CIRCLE_SHORTCUTS.map((item) => (
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

      <section className={styles.panel} aria-label="Business-circle metrics">
        <div className={styles.panelHead}>
          <h2>商圈指标</h2>
        </div>
        <div className={styles.metrics}>
          {metricCards.map((item) => (
            <article className={styles.metric} key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.distribution} aria-label="商圈联盟分布">
        <div className={styles.panelBlock}>
          <h2>联盟规模分布</h2>
          <ul className={styles.bars}>
            {circleScaleCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(data?.circles.length ?? 0, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data?.circles.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>商户权益覆盖分布</h2>
          <ul className={styles.bars}>
            {merchantBenefitCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(merchantTotal, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!merchantTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>内容密度分布</h2>
          <ul className={styles.bars}>
            {contentDensityCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(merchantTotal, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!merchantTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>流量行为分布</h2>
          <ul className={styles.bars}>
            {trafficDensityCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(merchantTotal, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!merchantTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>入口转化分布</h2>
          <ul className={styles.bars}>
            {conversionDensityCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(merchantTotal, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!merchantTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取商圈联盟档案行现场推导（source=local）：联盟规模、商户权益覆盖、
        内容密度、流量行为与入口转化；商圈是商家联盟整合网络，仅呈现聚合入口痕迹，不包含本平台收款、
        非本平台下单；本地试点记录，未接美团实时商户数据。
      </p>

      <section className={styles.panel} aria-label="流量未转化队列">
        <div className={styles.panelHead}>
          <h2>流量未转化队列</h2>
          <span className={styles.panelMeta}>有访问无转化档案</span>
        </div>
        {data?.queues.trafficWithoutConversion.length ? (
          data.queues.trafficWithoutConversion.map((item) => (
            <a className={styles.queueRow} href={item.deepLink} key={item.tenantId}>
              <strong>{item.name}</strong>
              <span>
                {item.circleName} · 访问 {item.trafficEvents} · 转化 {item.conversionOrders}
              </span>
            </a>
          ))
        ) : (
          <p className={styles.empty}>当前没有「有流量无转化」的商户信号。</p>
        )}
      </section>

      <section className={styles.panel} aria-label="固定商圈联盟明细">
        <div className={styles.panelHead}>
          <h2>固定商圈联盟明细</h2>
          <span className={styles.panelMeta}>{data?.circles.length ?? 0} 个商圈</span>
        </div>
        {data?.circles.length ? (
          <div className={styles.circles}>
            {data.circles.map((circle) => (
              <article className={styles.circle} key={circle.id}>
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
                            <dt>入口转化</dt>
                            <dd>{merchant.conversionOrders}</dd>
                          </div>
                        </dl>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className={styles.empty}>当前固定商圈尚无已批准商户。</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>当前尚无固定商圈，请先在平台商圈治理中创建并批准。</p>
        )}
      </section>
    </main>
  );
}
