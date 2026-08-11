'use client';

import { useMemo, useState } from 'react';
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

type SortMode = 'distance' | 'merchants' | 'owned';

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
  const [industry, setIndustry] = useState('全部');
  const [sort, setSort] = useState<SortMode>('distance');
  const tenantQ = encodeURIComponent(data.tenant.slug);
  const discoveryHref = `/c/discovery?tenant=${tenantQ}`;
  const entryHref = `/c/entry?tenant=${tenantQ}`;

  const industries = useMemo(() => {
    const tags = [
      ...new Set(
        data.items
          .map((item) => item.industryTag?.trim())
          .filter((tag): tag is string => Boolean(tag)),
      ),
    ].sort((a, b) => a.localeCompare(b, 'zh'));
    return ['全部', ...tags];
  }, [data.items]);

  const filtered = useMemo(() => {
    const base =
      industry === '全部'
        ? [...data.items]
        : data.items.filter((item) => item.industryTag === industry);
    base.sort((a, b) => {
      if (sort === 'owned') {
        if (a.ownedByViewer !== b.ownedByViewer) return a.ownedByViewer ? -1 : 1;
      }
      if (sort === 'merchants') {
        if (a.merchantCount !== b.merchantCount) return b.merchantCount - a.merchantCount;
      }
      if (a.distanceKm == null && b.distanceKm == null) return a.name.localeCompare(b.name, 'zh');
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
    return base;
  }, [data.items, industry, sort]);

  const owned = filtered.filter((item) => item.ownedByViewer);
  const nearby = filtered.filter((item) => !item.ownedByViewer);

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

  const renderCard = (item: CirclesData['items'][number]) => (
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
          payload: { name: item.name, owned: item.ownedByViewer },
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
      <p>{item.description ?? '商家联盟互助圈 · 进店后可跳转第三方'}</p>
      <p className={styles.meta}>
        {item.ownedByViewer ? <span className={styles.roleChip}>本店经营</span> : null}
        {!item.ownedByViewer && item.publicVisible ? (
          <span className={styles.roleChipMuted}>附近公开</span>
        ) : null}
        {item.industryTag ? <span>{item.industryTag}</span> : null}
        <span>{item.merchantCount} 家商户</span>
        <span>{item.owner.name}</span>
      </p>
    </a>
  );

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
              {data.locationRequired ? '开启定位' : '重新定位'}
            </button>
            <a className={styles.back} href={discoveryHref}>
              返回发现
            </a>
          </header>
          <p className={styles.eyebrow}>{data.tenant.name} · 商圈联盟首页</p>
          <h1 className={styles.title}>商圈</h1>
          <p className={styles.intro}>
            对标 App 首页感：按行业看附近商圈、进圈找商家；只计观看/访问/跳转，不表示第三方成交。
          </p>
          <p className={styles.disclaimer} role="note">
            商圈互助 = 入口引流与商家发现；成交在美团/抖音/扫呗等第三方完成。
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

          <div className={styles.chips} role="tablist" aria-label="行业分类">
            {industries.map((tag) => (
              <button
                key={tag}
                type="button"
                role="tab"
                aria-selected={industry === tag}
                className={industry === tag ? styles.chipActive : styles.chip}
                onClick={() => setIndustry(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className={styles.sortRow} role="group" aria-label="排序">
            {(
              [
                ['distance', '距离优先'],
                ['merchants', '商户数'],
                ['owned', '本店优先'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={sort === value ? styles.sortActive : styles.sort}
                onClick={() => setSort(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {owned.length ? (
            <section className={styles.section} aria-label="本店商圈">
              <h2 className={styles.sectionTitle}>本店经营的商圈</h2>
              <div className={styles.list}>{owned.map(renderCard)}</div>
            </section>
          ) : null}

          <section className={styles.section} aria-label="附近公开商圈">
            <h2 className={styles.sectionTitle}>
              {owned.length ? '附近公开商圈' : '可见商圈'}
            </h2>
            <div className={styles.list}>
              {nearby.length || (!owned.length && filtered.length) ? (
                (owned.length ? nearby : filtered).map(renderCard)
              ) : (
                <div className={styles.empty}>
                  暂无匹配商圈。经营者可在管理端创建并开启「公开引流」。
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </MobileShell>
  );
}
