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

          <p className={styles.eyebrow}>
            {data.tenant.name} · 推广员工具 · 附近
          </p>
          <h1 className={styles.srOnly}>附近</h1>
          <p className={styles.compactNote} role="note">
            全平台可见引流商家 · 不在此下单 · 评分/月售为本地试用提示 · 成交以美团/抖音/扫呗等为准
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
              <div className={styles.empty}>当前位置 20 公里内暂无已发布的商家；可切换推荐/商圈。</div>
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
