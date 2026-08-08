'use client';

import { useState, type ReactNode } from 'react';
import styles from './store.module.css';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export type StoreDetail = {
  tenant: { slug: string; name: string };
  store: {
    id: string;
    name: string;
    address: string | null;
    merchant: string;
    phone: string | null;
    businessHours: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  services: {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number | null;
    price_label: string | null;
  }[];
  benefits: { id: string; title: string; description: string | null }[];
  content: { id: string; content_type: string; title: string; summary: string | null }[];
  actions: { id: string; name: string; actionType: string; targetUrl: string | null }[];
  externalLinks: {
    id: string;
    linkId: string;
    title: string;
    description: string | null;
    platformType: 'meituan' | 'douyin' | 'external';
    targetUrl: string;
    actionType: string;
  }[];
};

export function StoreState({ kind }: { kind: 'error' | 'forbidden' }) {
  const forbidden = kind === 'forbidden';
  return (
    <main className={styles.message}>
      <section className={styles.messageCard}>
        <h1>{forbidden ? '门店暂不可访问' : '门店内容加载失败'}</h1>
        <p>
          {forbidden
            ? '请确认链接有效，或返回发现页选择其他门店。'
            : '网络连接暂不可用，请稍后重新加载。'}
        </p>
      </section>
    </main>
  );
}

export default function StorePage({
  data,
  source,
  shareCode,
}: {
  data: StoreDetail;
  source: string | null;
  shareCode: string | null;
}) {
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const consultAction = data.actions.find((item) => item.actionType !== 'link') ?? data.actions[0];
  const params = new URLSearchParams({
    tenant: data.tenant.slug,
    source: source ?? 'consumer:store',
    scene: 'store_detail',
  });
  if (shareCode) params.set('shareCode', shareCode);
  const returnTo = `/c/stores/${data.store.id}?${params.toString()}`;
  const actionUrl = (actionId: string) =>
    `/c/actions/${actionId}?${params.toString()}&storeId=${encodeURIComponent(data.store.id)}&returnTo=${encodeURIComponent(returnTo)}`;
  const navigationUrl =
    data.store.latitude !== null && data.store.longitude !== null
      ? `https://uri.amap.com/marker?position=${data.store.longitude},${data.store.latitude}&name=${encodeURIComponent(data.store.name)}&src=ONEDAY`
      : data.store.address
        ? `https://www.amap.com/search?query=${encodeURIComponent(data.store.address)}`
        : null;
  const outbound = async (outboundType: 'navigation' | 'phone', targetUrl: string) => {
    const response = await fetch(
      `${apiBase}/api/v1/consumer/stores/${data.store.id}/outbound?tenant=${encodeURIComponent(data.tenant.slug)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          outboundType,
          targetUrl,
          source: source ?? 'consumer:store',
          scene: 'store_detail',
          shareCode,
        }),
      },
    );
    if (!response.ok) throw new Error('OUTBOUND');
  };
  const openNavigation = async () => {
    if (!navigationUrl) return;
    try {
      await outbound('navigation', navigationUrl);
      window.location.assign(navigationUrl);
    } catch {
      setNotice('暂时无法打开导航，请稍后重试。');
    }
  };
  const call = async () => {
    if (!data.store.phone) return;
    const target = `tel:${data.store.phone.replace(/\s/g, '')}`;
    try {
      await outbound('phone', target);
      window.location.assign(target);
    } catch {
      setNotice('暂时无法发起电话，请稍后重试。');
    }
  };
  const consult = async () => {
    if (!consultAction) return;
    setPending(true);
    try {
      const response = await fetch(
        `${apiBase}/api/v1/consumer/stores/${data.store.id}/actions/${consultAction.id}/open?tenant=${encodeURIComponent(data.tenant.slug)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ source: source ?? 'consumer:store', shareCode }),
        },
      );
      if (!response.ok) throw new Error('CONSULT');
      if (consultAction.targetUrl) window.location.assign(consultAction.targetUrl);
      else setNotice('咨询意向已记录，门店同事会在经营工作台中跟进。');
    } catch {
      setNotice('暂时无法记录咨询，请稍后重试。');
    } finally {
      setPending(false);
    }
  };
  return (
    <main id="top" className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>
          {data.tenant.name} · {data.store.merchant}
        </p>
        <h1 className={styles.title}>{data.store.name}</h1>
        <p className={styles.address}>{data.store.address ?? '门店暂未提供有效地址'}</p>
        {data.store.imageUrl && (
          <img
            className={styles.cover}
            src={data.store.imageUrl}
            alt={`${data.store.name} 门店图片`}
          />
        )}
        <section className={styles.storeInfo} aria-label="门店信息">
          {data.store.businessHours && <span>营业时间：{data.store.businessHours}</span>}
          {data.store.phone && (
            <button type="button" onClick={call}>
              电话：{data.store.phone}
            </button>
          )}
          {navigationUrl && (
            <button type="button" onClick={openNavigation}>
              地图导航
            </button>
          )}
        </section>
        <section className={styles.hero}>
          <p>到店体验，从了解开始</p>
          <strong>服务、权益与门店入口已为你整理</strong>
        </section>
        <Section title="到店服务" hint="选择适合的体验方式">
          {data.services.length ? (
            data.services.map((item) => (
              <a
                className={styles.card}
                key={item.id}
                href={`/c/services/${item.id}?tenant=${encodeURIComponent(data.tenant.slug)}&source=${encodeURIComponent(source ?? 'consumer:store')}`}
              >
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                {(item.duration_minutes || item.price_label) && (
                  <span className={styles.meta}>
                    {[item.duration_minutes && `${item.duration_minutes} 分钟`, item.price_label]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </a>
            ))
          ) : (
            <div className={styles.empty}>门店正在完善服务信息。</div>
          )}
        </Section>
        <Section title="专属权益" hint="以门店实际配置为准">
          {data.benefits.length ? (
            data.benefits.map((item) => (
              <article className={styles.card} key={item.id}>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))
          ) : (
            <div className={styles.empty}>当前暂无可领取权益。</div>
          )}
        </Section>
        {data.externalLinks.length > 0 && (
          <Section title="团购与平台入口" hint="前往第三方前将留存本次经营行为">
            {data.externalLinks.map((item) => (
              <a className={styles.card} key={item.linkId} href={actionUrl(item.id)}>
                <strong>
                  {item.platformType === 'meituan'
                    ? '美团 · '
                    : item.platformType === 'douyin'
                      ? '抖音 · '
                      : ''}
                  {item.title}
                </strong>
                {item.description && <p>{item.description}</p>}
                <span className={styles.meta}>打开第三方平台</span>
              </a>
            ))}
          </Section>
        )}
        <Section title="门店故事" hint="先了解，再决定是否到店">
          {data.content.length ? (
            data.content.map((item) => (
              <article className={styles.card} key={item.id}>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
              </article>
            ))
          ) : (
            <div className={styles.empty}>门店正在准备更多内容。</div>
          )}
        </Section>
        <div className={styles.consult}>
          {consultAction ? (
            <button className={styles.button} type="button" onClick={consult} disabled={pending}>
              {pending ? '正在记录咨询…' : consultAction.name}
            </button>
          ) : (
            <div className={styles.empty}>咨询入口暂未开放。</div>
          )}
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
        </div>
      </div>
      <nav className={styles.bottomNav} aria-label="消费者导航">
        <a href={`/c/entry?tenant=${encodeURIComponent(data.tenant.slug)}`}>首页</a>
        <a href={`/c/discovery?tenant=${encodeURIComponent(data.tenant.slug)}`}>发现</a>
        <a href="#top">门店</a>
        {consultAction && <a href={actionUrl(consultAction.id)}>咨询</a>}
      </nav>
    </main>
  );
}
function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
      </div>
      <div className={styles.list}>{children}</div>
    </section>
  );
}
