'use client';
import { useState } from 'react';
import styles from './service.module.css';
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
export type ServiceDetail = {
  tenant: { slug: string; name: string };
  service: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number | null;
    priceLabel: string | null;
  };
  store: { id: string; name: string; address: string | null; merchant: string };
  benefits: { id: string; title: string; description: string | null }[];
  actions: { id: string; name: string; targetUrl: string | null }[];
};
export function ServiceState({ kind }: { kind: 'error' | 'forbidden' }) {
  const f = kind === 'forbidden';
  return (
    <main className={styles.message}>
      <section className={styles.messageCard}>
        <h1>{f ? '服务暂不可访问' : '服务内容加载失败'}</h1>
        <p>{f ? '请返回门店详情选择其他服务。' : '网络连接不稳定，请稍后重新加载。'}</p>
      </section>
    </main>
  );
}
export default function ServicePage({
  data,
  source,
}: {
  data: ServiceDetail;
  source: string | null;
}) {
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const action = data.actions[0];
  const open = async () => {
    if (!action) return;
    setPending(true);
    try {
      const r = await fetch(
        `${apiBase}/api/v1/consumer/services/${data.service.id}/actions/${action.id}/open?tenant=${encodeURIComponent(data.tenant.slug)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ source: source ?? 'service_detail' }),
        },
      );
      if (!r.ok) throw Error();
      setNotice('已记录你的服务意向，顾问将为你安排下一步。');
      if (action.targetUrl) window.location.assign(action.targetUrl);
    } catch {
      setNotice('暂时无法记录意向，请稍后再试。');
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
        <h1 className={styles.title}>{data.service.name}</h1>
        <p className={styles.sub}>
          {data.store.name}
          {data.store.address ? ` · ${data.store.address}` : ''}
        </p>
        <section className={styles.hero}>
          <p>适合到店前先了解</p>
          <strong>{data.service.description ?? '服务安排将由门店顾问为你说明'}</strong>
          {(data.service.durationMinutes || data.service.priceLabel) && (
            <span className={styles.tag}>
              {[
                data.service.durationMinutes && `${data.service.durationMinutes} 分钟`,
                data.service.priceLabel,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </section>
        <section className={styles.section}>
          <h2>适用门店</h2>
          <article className={styles.card}>
            <strong>{data.store.name}</strong>
            <p>{data.store.address ?? '门店地址以预约确认信息为准'}</p>
          </article>
        </section>
        <section className={styles.section}>
          <h2>服务权益</h2>
          {data.benefits.length ? (
            data.benefits.map((x) => (
              <article className={styles.card} key={x.id}>
                <strong>{x.title}</strong>
                <p>{x.description}</p>
              </article>
            ))
          ) : (
            <div className={styles.empty}>当前服务暂无额外权益。</div>
          )}
        </section>
        <div className={styles.bar}>
          {action ? (
            <button className={styles.button} type="button" disabled={pending} onClick={open}>
              {pending ? '正在记录…' : action.name}
            </button>
          ) : (
            <div className={styles.empty}>服务入口暂未开放。</div>
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
