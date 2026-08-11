'use client';

import { useState } from 'react';
import { ConsumerStorefrontNav } from '@oneday/storefront-renderer';
import '@oneday/storefront-renderer/storefront.css';
import { AppStatePanel, Button, MobileShell } from '@oneday/ui';
import { FunnelPageBeacon } from '../funnel-page-beacon';
import { trackFunnelEvent } from '../entry-funnel-client';
import { FALLBACK_CONSUMER_TABS } from '../resolve-consumer-tabs';
import styles from './circles.module.css';

export type CirclesData = {
  tenant: { slug: string; name: string };
  locationRequired: boolean;
  items: {
    id: string;
    name: string;
    description: string | null;
    industryTag: string | null;
    address: string | null;
    publicVisible: boolean;
    ownedByViewer: boolean;
    owner: { slug: string; name: string };
    merchantCount: number;
    distanceKm: number | null;
    entryUrl: string;
  }[];
};

export function CirclesState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy: readonly [string, string] =
    kind === 'forbidden'
      ? ['商圈入口暂不可用', '请确认链接或联系商家获取可访问的商圈入口。']
      : ['商圈加载失败', '网络连接不稳定，请稍后重新加载。'];
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

export default function CirclesHome({ data }: { data: CirclesData }) {
  const [notice, setNotice] = useState('');
  const tenantQ = encodeURIComponent(data.tenant.slug);
  const discoveryHref = `/c/discovery?tenant=${tenantQ}`;
  const entryHref = `/c/entry?tenant=${tenantQ}`;
  const locate = () => {
    if (!navigator.geolocation)
      return setNotice('当前设备不支持定位，仍可浏览本租户公开商圈。');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const query = new URLSearchParams({
          tenant: data.tenant.slug,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        window.location.assign(`/c/circles?${query}`);
      },
      () => setNotice('未获得位置授权；仍可浏览已开通公开引流的商圈。'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <MobileShell>
      <FunnelPageBeacon
        tenantSlug={data.tenant.slug}
        surface="circle"
        moduleKey="circles_home"
        scene="circles_list"
      />
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
          <header className={styles.appHeader}>
            <button className={styles.locateChip} type="button" onClick={locate}>
              {data.locationRequired ? '开启定位' : '附近商圈'}
            </button>
            <a className={styles.back} href={discoveryHref}>
              返回发现
            </a>
          </header>
          <p className={styles.eyebrow}>{data.tenant.name} · 商圈单独页</p>
          <h1 className={styles.title}>商圈</h1>
          <p className={styles.intro}>
            对标 App 首页感：看附近商圈、进圈找商家；互助引流只计观看/访问/跳转。
          </p>
          {notice ? (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          ) : null}
          {data.locationRequired ? (
            <button className={styles.location} type="button" onClick={locate}>
              使用当前位置发现附近商圈
            </button>
          ) : null}
          <section className={styles.list} aria-label="商圈列表">
            {data.items.length ? (
              data.items.map((item) => (
                <a
                  className={styles.card}
                  href={item.entryUrl}
                  key={item.id}
                  onClick={() =>
                    void trackFunnelEvent(data.tenant.slug, {
                      eventCode: 'module_impression',
                      surface: 'circle',
                      moduleKey: 'circle_card',
                      circleId: item.id,
                      scene: 'circles_open',
                      payload: { name: item.name },
                    })
                  }
                >
                  <div className={styles.cardTop}>
                    <strong>{item.name}</strong>
                    {item.distanceKm != null ? (
                      <span className={styles.distance}>{item.distanceKm} km</span>
                    ) : (
                      <span className={styles.badge}>{item.ownedByViewer ? '本店' : '公开'}</span>
                    )}
                  </div>
                  <p>{item.description ?? '商家联盟互助圈'}</p>
                  <p className={styles.meta}>
                    {item.industryTag ? <span>{item.industryTag}</span> : null}
                    <span>{item.merchantCount} 家商户</span>
                    <span>{item.owner.name}</span>
                  </p>
                </a>
              ))
            ) : (
              <div className={styles.empty}>
                暂无可见商圈。经营者可在管理端创建并开启「公开引流」。
              </div>
            )}
          </section>
        </div>
      </main>
    </MobileShell>
  );
}
