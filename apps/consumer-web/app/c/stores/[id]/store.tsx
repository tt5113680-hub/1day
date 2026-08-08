'use client';
import { useState } from 'react';
import styles from './store.module.css';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export type StoreDetail = {
  tenant: { slug: string; name: string };
  store: { id: string; name: string; address: string | null; merchant: string };
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
};
export function StoreState({ kind }: { kind: 'error' | 'forbidden' }) {
  const forbidden = kind === 'forbidden';
  return (
    <main className={styles.message}>
      <section className={styles.messageCard}>
        <h1>{forbidden ? '门店暂不可访问' : '门店内容加载失败'}</h1>
        <p>
          {forbidden
            ? '请确认链接有效，或回到发现页选择其他门店。'
            : '网络连接不稳定，请稍后重新加载。'}
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
  const action = data.actions[0];
  const consult = async () => {
    if (!action) return;
    setPending(true);
    try {
      const response = await fetch(
        `${apiBase}/api/v1/consumer/stores/${data.store.id}/actions/${action.id}/open?tenant=${encodeURIComponent(data.tenant.slug)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ source: source ?? 'store_detail', shareCode }),
        },
      );
      if (!response.ok) throw Error();
      setNotice('咨询意向已记录，正在为你打开服务入口。');
      if (action.targetUrl) window.location.assign(action.targetUrl);
    } catch {
      setNotice('暂时无法记录咨询，请稍后再试。');
    } finally {
      setPending(false);
    }
  };
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>
          {data.tenant.name} · {data.store.merchant}
        </p>
        <h1 className={styles.title}>{data.store.name}</h1>
        <p className={styles.address}>{data.store.address ?? '地址由门店确认后展示'}</p>
        <section className={styles.hero}>
          <p>到店体验，从了解开始</p>
          <strong>服务、权益与咨询安排已为你整理</strong>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>到店服务</h2>
              <p>选择合适的体验方式</p>
            </div>
          </div>
          <div className={styles.list}>
            {data.services.length ? (
              data.services.map((item) => (
                <article className={styles.card} key={item.id}>
                  <strong>{item.name}</strong>
                  <p>{item.description}</p>
                  {(item.duration_minutes || item.price_label) && (
                    <span className={styles.meta}>
                      {[item.duration_minutes && `${item.duration_minutes} 分钟`, item.price_label]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </article>
              ))
            ) : (
              <div className={styles.empty}>门店正在完善服务信息。</div>
            )}
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>专属权益</h2>
              <p>以门店实际配置为准</p>
            </div>
          </div>
          <div className={styles.list}>
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
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>门店故事</h2>
              <p>先了解，再决定是否到店</p>
            </div>
          </div>
          <div className={styles.list}>
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
          </div>
        </section>
        <div className={styles.consult}>
          {action ? (
            <button className={styles.button} type="button" onClick={consult} disabled={pending}>
              {pending ? '正在记录咨询…' : action.name}
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
    </main>
  );
}
