'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Detail = {
  customer: {
    id: string;
    displayName: string;
    status: string;
    segment: string;
    nextTouchAt: string | null;
    identities: { type: string; maskedValue: string }[];
  };
  tags: { label: string }[];
  sources: { source_role: string; source_type: string; status: string }[];
  ownerships: { employee_name: string; ownership_role: string; status: string }[];
  transfers: { id: string; from_name: string; to_name: string; reason: string; status: string }[];
  contributions: { employee_name: string; contribution_role: string; confirmed: boolean }[];
  orders: {
    order_number: string;
    status: string;
    evidence_count: number;
    connector_count: number;
  }[];
  tasks: { title: string; status: string; assignee_name: string; escalation_level: number }[];
  anomalies: { type: string; title: string }[];
  timeline: { kind: string; label: string; at: string }[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export default function ManagementCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Detail | null>(null);
  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);
  const load = useCallback(async () => {
    const token = sessionStorage.getItem('oneday.accessToken');
    if (!token) return setState('forbidden');
    if (!id) return;
    setState('loading');
    try {
      const response = await fetch(`${api}/api/v1/management/customers/${encodeURIComponent(id)}`, {
        headers: { authorization: `Bearer ${token}`, 'x-request-id': crypto.randomUUID() },
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('DETAIL');
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);
  useEffect(() => void load(), [load]);
  if (state === 'loading') return <main className={styles.centered}>正在加载客户全链路…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看客户详情</h1>
          <p>请使用具备经营管理权限的账号。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>客户详情暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/m/customers">
        ← 返回客户资产
      </Link>
      <header>
        <div>
          <p>客户全链路 / {data.customer.segment}</p>
          <h1>{data.customer.displayName}</h1>
          <span>
            {data.customer.identities
              .map((item) => `${item.type}: ${item.maskedValue}`)
              .join(' · ') || '未绑定身份'}{' '}
            · {data.tags.map((item) => item.label).join(' / ') || '无标签'}
          </span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {data.anomalies.length > 0 && (
        <section className={styles.alerts} aria-label="经营异常">
          {data.anomalies.map((item) => (
            <article key={`${item.type}-${item.title}`}>
              <strong>{item.type}</strong>
              <span>{item.title}</span>
            </article>
          ))}
        </section>
      )}
      <section className={styles.grid}>
        <Panel title="来源与贡献">
          <List
            items={data.sources.map(
              (item) => `${item.source_role} · ${item.source_type} · ${item.status}`,
            )}
            empty="暂无来源记录"
          />
          <List
            items={data.contributions.map(
              (item) =>
                `${item.employee_name} · ${item.contribution_role}${item.confirmed ? ' · 已确认' : ''}`,
            )}
            empty="暂无贡献记录"
          />
        </Panel>
        <Panel title="归属与审批">
          <List
            items={data.ownerships.map(
              (item) => `${item.employee_name} · ${item.ownership_role} · ${item.status}`,
            )}
            empty="暂无归属记录"
          />
          <List
            items={data.transfers.map(
              (item) => `${item.from_name} → ${item.to_name} · ${item.status} · ${item.reason}`,
            )}
            empty="暂无归属审批"
          />
        </Panel>
        <Panel title="订单与证据">
          <List
            items={data.orders.map(
              (item) =>
                `${item.order_number} · ${item.status} · ${item.evidence_count} 份证据 · ${item.connector_count} 条回执`,
            )}
            empty="暂无订单结果"
          />
        </Panel>
        <Panel title="任务与异常">
          <List
            items={data.tasks.map(
              (item) =>
                `${item.title} · ${item.status} · ${item.assignee_name}${item.escalation_level ? ` · 升级 ${item.escalation_level}` : ''}`,
            )}
            empty="暂无任务"
          />
        </Panel>
      </section>
      <section className={styles.timeline}>
        <h2>可审计时间线</h2>
        {data.timeline.length ? (
          data.timeline.map((item, index) => (
            <article key={`${item.kind}-${index}`}>
              <time>{new Date(item.at).toLocaleString()}</time>
              <span>{item.kind}</span>
              <p>{item.label}</p>
            </article>
          ))
        ) : (
          <p>尚无可展示的链路事件。</p>
        )}
      </section>
    </main>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function List({ items, empty }: { items: string[]; empty: string }) {
  return (
    <ul>
      {items.length ? (
        items.map((item) => <li key={item}>{item}</li>)
      ) : (
        <li className={styles.empty}>{empty}</li>
      )}
    </ul>
  );
}
