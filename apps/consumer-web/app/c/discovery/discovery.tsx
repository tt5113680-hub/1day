'use client';

import { useState } from 'react';
import styles from './discovery.module.css';

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  merchants: { id: string; name: string }[];
};
export type Discovery = {
  tenant: { slug: string; name: string };
  channels: Collection[];
  circles: Collection[];
  nearby: { id: string; name: string; address: string | null; distanceKm: number }[];
  locationRequired: boolean;
};
export function DiscoveryState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy =
    kind === 'forbidden'
      ? ['发现入口暂不可用', '请确认链接或联系商家获取可访问的发现入口。']
      : ['发现内容加载失败', '网络连接不稳定，请稍后重新加载。'];
  return (
    <main className={styles.message}>
      <section className={styles.messageCard}>
        <h1>{copy[0]}</h1>
        <p>{copy[1]}</p>
      </section>
    </main>
  );
}
export default function DiscoveryPage({ data }: { data: Discovery }) {
  const [notice, setNotice] = useState('');
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
  const focus = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>{data.tenant.name}</p>
        <h1 className={styles.title}>发现刚好适合你的去处</h1>
        <p className={styles.intro}>
          渠道推荐、固定商圈和附近商户分别呈现，帮你更清楚地选择下一步。
        </p>
        <nav className={styles.tabs} aria-label="发现分类">
          <button
            className={`${styles.tab} ${styles.tabActive}`}
            type="button"
            onClick={() => focus('channels')}
          >
            渠道推荐
          </button>
          <button className={styles.tab} type="button" onClick={() => focus('circles')}>
            固定商圈
          </button>
          <button className={styles.tab} type="button" onClick={() => focus('nearby')}>
            附近商户
          </button>
        </nav>
        <section id="channels" className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>渠道推荐</h2>
              <p>来自已选择的渠道内容，不基于距离排序。</p>
            </div>
            <span className={styles.badge}>推荐</span>
          </div>
          <div className={styles.collection}>
            {data.channels.length ? (
              data.channels.map((item) => (
                <article className={styles.collectionCard} key={item.id}>
                  <strong>{item.name}</strong>
                  {item.description && <p>{item.description}</p>}
                  <div className={styles.merchantList}>
                    {item.merchants.map((merchant) => (
                      <span className={styles.merchant} key={merchant.id}>
                        {merchant.name}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.empty}>暂未配置渠道推荐。</div>
            )}
          </div>
        </section>
        <section id="circles" className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>固定商圈</h2>
              <p>商家主动加入的服务圈，不等同于地理附近。</p>
            </div>
            <span className={styles.badge}>商圈</span>
          </div>
          <div className={styles.collection}>
            {data.circles.length ? (
              data.circles.map((item) => (
                <article className={styles.collectionCard} key={item.id}>
                  <strong>{item.name}</strong>
                  {item.description && <p>{item.description}</p>}
                  <div className={styles.merchantList}>
                    {item.merchants.map((merchant) => (
                      <span className={styles.merchant} key={merchant.id}>
                        {merchant.name}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.empty}>暂未开放固定商圈内容。</div>
            )}
          </div>
        </section>
        <section id="nearby" className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>附近商户</h2>
              <p>仅按设备位置计算距离，不使用商圈成员关系。</p>
            </div>
            <span className={styles.badge}>LBS</span>
          </div>
          {data.locationRequired ? (
            <>
              <button className={styles.location} type="button" onClick={locate}>
                使用当前位置发现附近商户
              </button>
              {notice && (
                <p className={styles.notice} role="status">
                  {notice}
                </p>
              )}
            </>
          ) : data.nearby.length ? (
            <div className={styles.nearby}>
              {data.nearby.map((item) => (
                <article className={styles.nearbyCard} key={item.id}>
                  <span className={styles.pin}>⌖</span>
                  <span>
                    <strong>{item.name}</strong>
                    <p>{item.address ?? '地址待商家补充'}</p>
                  </span>
                  <span className={styles.distance}>{item.distanceKm} km</span>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              当前位置 20 公里内暂无已发布的商户；可浏览渠道推荐和固定商圈。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
