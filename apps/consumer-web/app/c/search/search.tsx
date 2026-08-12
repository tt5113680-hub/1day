'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const itemsTotal = data.items.length;
  const ratingBucket = (v: number | undefined) =>
    v == null ? '暂无评分' : v < 3.6 ? '低分 3.5 及以下' : v <= 4.2 ? '中等 3.6-4.2' : '高评 4.3+';
  const distanceBucket = (v: number | null) =>
    v == null ? '未定位距离' : v <= 1 ? '1km 内' : v <= 3 ? '1-3km' : v <= 5 ? '3-5km' : '5km 外';
  const salesBucket = (v: number | undefined) =>
    v == null ? '暂无人气' : v <= 100 ? '低 100 及以下' : v <= 500 ? '中 101-500' : '高 501+';
  const ratingDist = useMemo(
    () => countBy(data.items.map((item) => ratingBucket(item.rating))),
    [data.items],
  );
  const distanceDist = useMemo(
    () => countBy(data.items.map((item) => distanceBucket(item.distanceKm))),
    [data.items],
  );
  const entranceDist = useMemo(
    () => countBy(data.items.map((item) => (item.entryUrl ? '可直接跳转' : '待商家补充入口'))),
    [data.items],
  );
  const salesDist = useMemo(
    () => countBy(data.items.map((item) => salesBucket(item.salesHint))),
    [data.items],
  );
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
          <p className={styles.eyebrow}>{data.tenant.name} · 推广员工具 · 搜索</p>
          <h1 className={styles.title}>{data.query ? `“${data.query}”` : '搜索商家'}</h1>
          <p className={styles.intro}>
            在本租户已发布商家中检索；评分/月售为本地试用提示，进店后可跳转第三方。
          </p>
          <p className={styles.disclaimer} role="note">
            搜索只做入口分流；不在此下单，成交以美团/抖音/扫呗等页面为准。
          </p>
          <div className={styles.quickLinks}>
            <a href={discoveryHref}>返回发现</a>
            <a href={`/c/circles?tenant=${tenantQ}`}>商圈联盟</a>
            <a href={entryHref}>统一入口</a>
          </div>

          <section className={styles.heroCard} aria-label="搜索结果概况">
            <header className={styles.heroHead}>
              <span>{data.tenant.name} · 推广员工具 · 搜索</span>
              <h2>{data.query ? `“${data.query}”` : '搜索商家'}</h2>
              <p role="note">
                按真实搜索结果档案汇总：评分带、距离带、入口可用性与人气带，仅供入口分流参考。
              </p>
            </header>
            <div className={styles.summaryStrip} aria-label="搜索数据概况">
              <dl>
                <dt>匹配商家</dt>
                <dd>{itemsTotal}</dd>
              </dl>
              <dl>
                <dt>可直接跳转</dt>
                <dd>{data.items.filter((item) => item.entryUrl).length}</dd>
              </dl>
              <dl>
                <dt>有评分</dt>
                <dd>{data.items.filter((item) => item.rating != null).length}</dd>
              </dl>
            </div>
          </section>

          <section className={styles.distribution} aria-label="搜索结果分布">
            <header className={styles.panelHead}>
              <h3>搜索结果分布</h3>
              <p>分布由已抓取搜索结果档案行现场推导 · 评分/月售为本地试用提示，不涉及成交</p>
            </header>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>评分分布</span>
              <div className={styles.bars} role="list">
                {ratingDist.length ? (
                  ratingDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(itemsTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无搜索结果</span>
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
                        <i style={{ width: `${barWidth(itemsTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无搜索结果</span>
                )}
              </div>
            </div>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>入口可用性分布</span>
              <div className={styles.bars} role="list">
                {entranceDist.length ? (
                  entranceDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(itemsTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无搜索结果</span>
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
                        <i style={{ width: `${barWidth(itemsTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无搜索结果</span>
                )}
              </div>
            </div>
          </section>

          <p className={styles.honest} role="note">
            以上分布全部由已抓取搜索结果档案行现场推导，源 source=local；
            评分与月售为本地试用提示，进店与成交以美团/抖音/扫呗等外部平台为准；
            仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额。不在此下单，非本平台下单。
          </p>

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
                      <span>
                        {item.ratingSource === 'local_pilot' ? '本地试用提示' : '本地试用'}
                      </span>
                    </p>
                  </span>
                  {item.distanceKm != null ? (
                    <span className={styles.distance}>{item.distanceKm} km</span>
                  ) : null}
                </a>
              ))
            ) : (
              <div className={styles.empty}>
                {data.query
                  ? `没有找到与「${data.query}」匹配的已发布商家；可换关键词，或去商圈/发现页继续浏览。`
                  : '输入商家名开始搜索本租户已发布门店。'}
              </div>
            )}
          </div>
        </div>
      </main>
    </MobileShell>
  );
}
