'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConsumerStorefrontNav } from '@oneday/storefront-renderer';
import '@oneday/storefront-renderer/storefront.css';
import { AppStatePanel, Button, MobileShell } from '@oneday/ui';
import { bindPageFunnel, trackFunnelEvent } from '../entry-funnel-client';
import { FALLBACK_CONSUMER_TABS } from '../resolve-consumer-tabs';
import styles from './search.module.css';

export type SearchResult = {
  id: string;
  name: string;
  address: string | null;
  entryUrl: string | null;
  rating?: number;
  ratingSource?: 'local_pilot';
  salesHint?: number;
  distanceKm: number | null;
};
export type SearchData = {
  tenant: { slug: string; name: string };
  query: string;
  items: SearchResult[];
};
export function SearchState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy: readonly [string, string] =
    kind === 'forbidden'
      ? ['搜索入口暂不可用', '请确认链接或联系商家获取可访问的发现入口。']
      : ['搜索加载失败', '网络连接不稳定，请稍后重新加载。'];
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
export default function SearchPage({ data }: { data: SearchData }) {
  const router = useRouter();
  const [term, setTerm] = useState(data.query);
  useEffect(
    () =>
      bindPageFunnel({
        tenantSlug: data.tenant.slug,
        surface: 'search',
        moduleKey: 'consumer_search',
        scene: data.query ? 'search_results' : 'search_empty',
      }),
    [data.tenant.slug, data.query],
  );
  const tenantQ = encodeURIComponent(data.tenant.slug);
  const entryHref = `/c/entry?tenant=${tenantQ}`;
  const discoveryHref = `/c/discovery?tenant=${tenantQ}`;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return;
    router.push(`/c/search?tenant=${tenantQ}&q=${encodeURIComponent(trimmed)}`);
  };
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
          <form className={styles.searchForm} onSubmit={submit} role="search">
            <label className={styles.srOnly} htmlFor="consumer-search-input">
              搜索商家
            </label>
            <input
              id="consumer-search-input"
              className={styles.searchInput}
              type="search"
              placeholder="搜索商家 / 品类（美团 App 同构入口）"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              autoFocus
            />
            <button className={styles.searchButton} type="submit">
              搜索
            </button>
          </form>
          <p className={styles.eyebrow}>{data.tenant.name} · 美团 App 发现面 · 搜索</p>
          <h1 className={styles.title}>“{data.query}”</h1>
          <p className={styles.intro}>对标美团 App 搜索结果：商家名称、本地试用评分与月售、进店。</p>
          <div className={styles.results}>
            {data.items.length ? (
              data.items.map((item) => (
                <a
                  className={styles.resultLink}
                  href={item.entryUrl ?? undefined}
                  key={item.id}
                  onClick={() =>
                    void trackFunnelEvent(data.tenant.slug, {
                      eventCode: 'impression',
                      surface: 'search',
                      moduleKey: 'search_result_card',
                      scene: 'search_open_store',
                      payload: { storeName: item.name },
                    })
                  }
                >
                  <span className={styles.thumb} aria-hidden>
                    店
                  </span>
                  <span>
                    <span className={styles.resultName}>{item.name}</span>
                    {item.address && <p className={styles.resultAddress}>{item.address}</p>}
                    <p className={styles.resultMeta}>
                      {item.rating != null ? (
                        <span className={styles.rating}>{item.rating} 分</span>
                      ) : null}
                      {item.salesHint != null ? <span>月售 {item.salesHint}+</span> : null}
                      <span>本地试用</span>
                    </p>
                  </span>
                  {item.distanceKm != null ? (
                    <span className={styles.distance}>{item.distanceKm} km</span>
                  ) : null}
                </a>
              ))
            ) : (
              <div className={styles.empty}>
                没有找到与「{data.query}」匹配的已发布商家；可换一个关键词，或返回发现页浏览推荐。
              </div>
            )}
          </div>
        </div>
      </main>
    </MobileShell>
  );
}
