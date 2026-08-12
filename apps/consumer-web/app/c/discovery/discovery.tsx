'use client';

import { useEffect, useState } from 'react';
import { ConsumerStorefrontNav } from '@oneday/storefront-renderer';
import '@oneday/storefront-renderer/storefront.css';
import { AppStatePanel, Button, MobileShell } from '@oneday/ui';
import { bindPageFunnel, trackFunnelEvent } from '../entry-funnel-client';
import { FALLBACK_CONSUMER_TABS } from '../resolve-consumer-tabs';
import styles from './discovery.module.css';

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  merchants: { id: string; name: string; entryUrl: string | null }[];
};
export type Discovery = {
  tenant: { slug: string; name: string };
  channels: Collection[];
  circles: Collection[];
  nearby: {
    id: string;
    name: string;
    address: string | null;
    distanceKm: number;
    entryUrl: string | null;
    rating?: number;
    ratingSource?: 'local_pilot';
    salesHint?: number;
  }[];
  locationRequired: boolean;
};
export function DiscoveryState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy: readonly [string, string] =
    kind === 'forbidden'
      ? ['发现入口暂不可用', '请确认链接或联系商家获取可访问的发现入口。']
      : ['发现内容加载失败', '网络连接不稳定，请稍后重新加载。'];
  return (
    <main className={styles.message}>
      <AppStatePanel
        kind={kind}
        title={copy[0]}
        description={copy[1]}
        action={
          kind === 'error' ? (
            <Button onClick={() => window.location.reload()}>重新加载</Button>
          ) : undefined
        }
      />
    </main>
  );
}
export default function DiscoveryPage({ data }: { data: Discovery }) {
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'nearby' | 'channels' | 'circles'>('nearby');
  const [nearbySort, setNearbySort] = useState<'distance' | 'rating' | 'sales'>('distance');
  useEffect(
    () =>
      bindPageFunnel({
        tenantSlug: data.tenant.slug,
        surface: 'nearby',
        moduleKey: 'discovery_nearby',
        scene: 'discovery',
      }),
    [data.tenant.slug],
  );
  const trackMerchantOpen = (moduleKey: string, storeName: string) => {
    void trackFunnelEvent(data.tenant.slug, {
      eventCode: 'impression',
      surface: activeTab === 'nearby' ? 'nearby' : activeTab === 'circles' ? 'circle' : 'nearby',
      moduleKey,
      scene: 'discovery_merchant_open',
      payload: { storeName },
    });
  };
  const tenantQ = encodeURIComponent(data.tenant.slug);
  const discoveryHref = `/c/discovery?tenant=${tenantQ}`;
  const entryHref = `/c/entry?tenant=${tenantQ}`;
  const searchHref = `/c/search?tenant=${tenantQ}`;
  const locate = () => {
    if (!navigator.geolocation)
      return setNotice('当前设备不支持定位，请使用渠道推荐或固定商圈发现。');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const query = new URLSearchParams({
          tenant: data.tenant.slug,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        window.location.assign(`/c/discovery?${query}`);
      },
      () => setNotice('未获得位置授权；你仍可以浏览渠道推荐和固定商圈。'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };
  const focus = (id: 'channels' | 'circles' | 'nearby') => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const nearbySorted = [...data.nearby].sort((a, b) => {
    if (nearbySort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
    if (nearbySort === 'sales') return (b.salesHint ?? 0) - (a.salesHint ?? 0);
    return a.distanceKm - b.distanceKm;
  });
  const ratingBucket = (rating?: number) =>
    rating == null
      ? '暂无评分'
      : rating <= 3.5
        ? '低分 3.5 及以下'
        : rating <= 4.2
          ? '中等 3.6-4.2'
          : '高评 4.3+';
  const distanceBucket = (distanceKm: number) =>
    distanceKm <= 1 ? '1km 内' : distanceKm <= 3 ? '1-3km' : distanceKm <= 5 ? '3-5km' : '5km 外';
  const salesBucket = (salesHint?: number) =>
    salesHint == null
      ? '暂无人气'
      : salesHint <= 100
        ? '低人气 ≤100'
        : salesHint <= 500
          ? '中人气 101-500'
          : '高人 501+';
  const nearbyTotal = data.nearby.length;
  const countBy = (rows: string[]) => {
    const buckets = new Map<string, number>();
    for (const row of rows) {
      const label = row || '未分类';
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };
  const barWidth = (total: number, value: number) =>
    total === 0 ? 0 : Math.round((value / total) * 100);
  const ratingDist = countBy(data.nearby.map((item) => ratingBucket(item.rating)));
  const distanceDist = countBy(data.nearby.map((item) => distanceBucket(item.distanceKm)));
  const salesDist = countBy(data.nearby.map((item) => salesBucket(item.salesHint)));
  const entryDist = countBy(
    data.nearby.map((item) => (item.entryUrl ? '可直接跳转' : '待商家补充入口')),
  );
  const surfaceDist = countBy([
    ...data.nearby.map(() => '附近商家'),
    ...data.channels.flatMap((item) => item.merchants.map(() => '渠道推荐')),
    ...data.circles.flatMap((item) => item.merchants.map(() => '商圈商家')),
  ]);
  const circleCount = data.circles.length;
  const discoveredMerchants = data.channels.reduce((acc, item) => acc + item.merchants.length, 0);
  return (
    <MobileShell>
      <ConsumerStorefrontNav
        tabs={FALLBACK_CONSUMER_TABS}
        active="home"
        ariaLabelMobile="消费者主导航"
        ariaLabelDesktop="消费者桌面主导航"
        hrefOf={(tab) => {
          if (tab.key === 'home') return entryHref;
          if (tab.key === 'profile') return `${entryHref}#membership`;
          return discoveryHref;
        }}
      />
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.stickyBar}>
            <button className={styles.locateChip} type="button" onClick={locate}>
              <span className={styles.locatePin} aria-hidden>
                ⌖
              </span>
              <span className={styles.locateText}>
                {data.locationRequired ? '开启定位' : '当前位置附近'}
              </span>
              <span className={styles.locateCaret} aria-hidden>
                ▾
              </span>
            </button>
            <a
              className={styles.searchBox}
              href={searchHref}
              aria-label="搜索商家（美团 App 同构入口）"
            >
              <span className={styles.searchIcon} aria-hidden>
                ⌕
              </span>
              <span>搜索商家 / 品类</span>
            </a>
          </header>

          <p className={styles.eyebrow}>{data.tenant.name} · 推广员工具 · 附近</p>
          <h1 className={styles.srOnly}>附近</h1>
          <p className={styles.compactNote} role="note">
            全平台可见引流商家 · 不在此下单 · 评分/月售为本地试用提示 · 成交以美团/抖音/扫呗等为准
          </p>

          <section className={styles.heroCard} aria-label="附近概况">
            <header className={styles.heroHead}>
              <span>{data.tenant.name} · 推广员工具 · 附近发现</span>
              <h2>附近与全网引流商家</h2>
              <p role="note">
                按真实发现结果汇总：附近商家入口、渠道推荐与商圈，仅供入口分流参考。
              </p>
            </header>
            <div className={styles.summaryStrip} aria-label="附近数据概况">
              <dl>
                <dt>附近商家</dt>
                <dd>
                  {nearbyTotal}
                  {data.locationRequired ? <i> 需定位</i> : null}
                </dd>
              </dl>
              <dl>
                <dt>渠道推荐</dt>
                <dd>{discoveredMerchants}</dd>
              </dl>
              <dl>
                <dt>商圈栏目</dt>
                <dd>{circleCount}</dd>
              </dl>
            </div>
          </section>

          <section className={styles.distribution} aria-label="附近商家分布">
            <header className={styles.panelHead}>
              <h3>附近商家分布</h3>
              <p>分布由已抓取附近商家档案行现场推导 · 仅统计观看/跳转与入口，不涉及成交</p>
            </header>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>评分分布</span>
              <div className={styles.bars} role="list">
                {ratingDist.length ? (
                  ratingDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(nearbyTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无附近记录</span>
                )}
              </div>
            </div>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>距离带分布</span>
              <div className={styles.bars} role="list">
                {distanceDist.length ? (
                  distanceDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(nearbyTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无附近记录</span>
                )}
              </div>
            </div>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>人气带分布</span>
              <div className={styles.bars} role="list">
                {salesDist.length ? (
                  salesDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(nearbyTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无附近记录</span>
                )}
              </div>
            </div>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>入口可用性分布</span>
              <div className={styles.bars} role="list">
                {entryDist.length ? (
                  entryDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(nearbyTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无附近记录</span>
                )}
              </div>
            </div>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>发现面分布</span>
              <div className={styles.bars} role="list">
                {surfaceDist.length ? (
                  surfaceDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(nearbyTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无发现记录</span>
                )}
              </div>
            </div>
          </section>

          <p className={styles.honest} role="note">
            以上分布全部由已抓取附近/渠道/商圈商家档案行现场推导，源 source=local；
            评分与月售为本地试用提示，不接美团/抖音实时商户数据；
            成交在美团/抖音/扫呗等外部平台完成，仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额。
            不在此下单，非本平台下单。
          </p>

          <nav className={styles.tabs} aria-label="发现分类">
            <button
              className={`${styles.tab} ${activeTab === 'nearby' ? styles.tabActive : ''}`}
              type="button"
              onClick={() => focus('nearby')}
            >
              附近
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'channels' ? styles.tabActive : ''}`}
              type="button"
              onClick={() => focus('channels')}
            >
              推荐
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'circles' ? styles.tabActive : ''}`}
              type="button"
              onClick={() => focus('circles')}
            >
              商圈
            </button>
          </nav>

          <section id="nearby" className={styles.section} hidden={activeTab !== 'nearby'}>
            {!data.locationRequired ? (
              <div className={styles.sortBar} role="toolbar" aria-label="附近排序">
                <button
                  type="button"
                  className={nearbySort === 'distance' ? styles.sortActive : styles.sortChip}
                  onClick={() => setNearbySort('distance')}
                >
                  距离
                </button>
                <button
                  type="button"
                  className={nearbySort === 'rating' ? styles.sortActive : styles.sortChip}
                  onClick={() => setNearbySort('rating')}
                >
                  好评
                </button>
                <button
                  type="button"
                  className={nearbySort === 'sales' ? styles.sortActive : styles.sortChip}
                  onClick={() => setNearbySort('sales')}
                >
                  人气
                </button>
              </div>
            ) : null}

            {data.locationRequired ? (
              <div className={styles.locatePanel}>
                <p>开启定位后展示附近全平台可见引流商家</p>
                <button className={styles.location} type="button" onClick={locate}>
                  使用当前位置发现附近商家
                </button>
                {notice ? (
                  <p className={styles.notice} role="status">
                    {notice}
                  </p>
                ) : null}
              </div>
            ) : nearbySorted.length ? (
              <div className={styles.nearby}>
                {nearbySorted.map((item) => {
                  const content = (
                    <>
                      <span className={styles.thumb} aria-hidden>
                        {item.name.slice(0, 1)}
                      </span>
                      <span className={styles.cardBody}>
                        <strong className={styles.storeName}>{item.name}</strong>
                        <span className={styles.meta}>
                          {item.rating != null ? (
                            <span className={styles.rating}>{item.rating.toFixed(1)}</span>
                          ) : (
                            <span className={styles.ratingMuted}>暂无评分</span>
                          )}
                          {item.salesHint != null ? <span>月售{item.salesHint}+</span> : null}
                          <span className={styles.distance}>{item.distanceKm}km</span>
                        </span>
                        <span className={styles.address}>{item.address ?? '地址待商家补充'}</span>
                        <span className={styles.tags}>
                          <span>本地试用提示</span>
                          <span>入口分流</span>
                        </span>
                      </span>
                    </>
                  );
                  return item.entryUrl ? (
                    <a
                      className={styles.nearbyLink}
                      href={item.entryUrl}
                      key={item.id}
                      onClick={() => trackMerchantOpen('nearby_merchant_card', item.name)}
                    >
                      {content}
                    </a>
                  ) : (
                    <article className={styles.nearbyCard} key={item.id}>
                      {content}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                当前位置 20 公里内暂无已发布的商家；可切换推荐/商圈。
              </div>
            )}
          </section>

          <section id="channels" className={styles.section} hidden={activeTab !== 'channels'}>
            <div className={styles.collection}>
              {data.channels.length ? (
                data.channels.map((item) => (
                  <article className={styles.collectionCard} key={item.id}>
                    <strong>{item.name}</strong>
                    {item.description ? <p>{item.description}</p> : null}
                    <div className={styles.merchantList}>
                      {item.merchants.map((merchant) =>
                        merchant.entryUrl ? (
                          <a
                            className={styles.merchantLink}
                            href={merchant.entryUrl}
                            key={merchant.id}
                            onClick={() => trackMerchantOpen('channel_merchant', merchant.name)}
                          >
                            {merchant.name}
                          </a>
                        ) : (
                          <span className={styles.merchant} key={merchant.id}>
                            {merchant.name}
                          </span>
                        ),
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.empty}>暂未配置推荐内容。</div>
              )}
            </div>
          </section>

          <section id="circles" className={styles.section} hidden={activeTab !== 'circles'}>
            <div className={styles.circleHead}>
              <p>商家联盟单独页：附近商圈 / 进圈找店。</p>
              <a href={`/c/circles?tenant=${tenantQ}`}>进入商圈页 ›</a>
            </div>
            <p className={styles.sectionHint}>互助引流只计观看/访问/跳转；成交在第三方完成。</p>
            <div className={styles.collection}>
              {data.circles.length ? (
                data.circles.map((item) => (
                  <article className={styles.collectionCard} key={item.id}>
                    <strong>{item.name}</strong>
                    {item.description ? <p>{item.description}</p> : null}
                    <div className={styles.merchantList}>
                      {item.merchants.map((merchant) =>
                        merchant.entryUrl ? (
                          <a
                            className={styles.merchantLink}
                            href={merchant.entryUrl}
                            key={merchant.id}
                            onClick={() => trackMerchantOpen('circle_merchant', merchant.name)}
                          >
                            {merchant.name}
                          </a>
                        ) : (
                          <span className={styles.merchant} key={merchant.id}>
                            {merchant.name}
                          </span>
                        ),
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.empty}>暂未开放商圈内容。</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </MobileShell>
  );
}
