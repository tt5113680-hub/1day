'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import styles from '../../tasks/[id]/task-detail.module.css';

type Data = {
  customer: {
    displayName: string;
    identities: { type: string; maskedValue: string }[];
    createdAt: string;
  };
  sources: { source_role: string; source_type: string }[];
  ownerships: { ownershipRole: string; isCurrentEmployee: boolean }[];
  tags: { id: string; label: string }[];
  tasks: { id: string; title: string; dueAt: string; status: string }[];
  timeline: { kind: string; action: string; at: string; taskId?: string; title?: string }[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const when = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

export function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async () => {
    const token = sessionStorage.getItem('oneday.accessToken') ?? '';
    if (!token || !id) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const r = await fetch(`${api}/api/v1/employee/customers/${id}`, {
        headers: { authorization: `Bearer ${token}`, 'x-request-id': crypto.randomUUID() },
      });
      if ([401, 403, 404].includes(r.status)) {
        setState('forbidden');
        return;
      }
      if (!r.ok) throw Error();
      setData((await r.json()).data as Data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  if (state === 'loading') return <main className={styles.centered}>正在加载客户详情…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无法查看此客户</h1>
          <p>仅可查看与自己归属、任务或贡献有关的客户。</p>
          <a href="/e/workbench">返回工作台</a>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>客户详情暂不可用</h1>
          <p>网络或服务连接出现问题。</p>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => history.back()} aria-label="返回">
          ←
        </button>
        <div>
          <p>ONEDAY / 我的客户</p>
          <h1>{data.customer.displayName}</h1>
        </div>
        <span className={styles.badge}>客户摘要</span>
      </header>
      <section className={styles.hero}>
        <span>客户关系</span>
        <strong>
          {data.ownerships.some((item) => item.isCurrentEmployee) ? '当前归属客户' : '协作客户'}
        </strong>
        <p>仅展示与你有归属、任务或贡献关系的客户记录。</p>
      </section>
      <section className={styles.section}>
        <h2>客户摘要</h2>
        <div className={styles.customer}>
          <strong>
            {data.customer.identities.length
              ? data.customer.identities
                  .map((item) => `${item.type} · ${item.maskedValue}`)
                  .join(' / ')
              : '暂无已验证身份'}
          </strong>
          <p>建档于 {when(data.customer.createdAt)}</p>
        </div>
      </section>
      <section className={styles.section}>
        <h2>来源与归属</h2>
        <p className={styles.card}>
          {data.sources.length
            ? data.sources.map((item) => `${item.source_role} · ${item.source_type}`).join(' / ')
            : '暂未记录来源'}
          <br />
          {data.ownerships.length
            ? data.ownerships
                .map((item) =>
                  item.isCurrentEmployee ? `我 · ${item.ownershipRole}` : item.ownershipRole,
                )
                .join(' / ')
            : '暂未分配归属'}
        </p>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>客户标签</h2>
          <span>{data.tags.length} 项</span>
        </div>
        <p className={styles.card}>
          {data.tags.length ? data.tags.map((item) => `# ${item.label}`).join('  ') : '暂无标签'}
        </p>
      </section>
      <section className={styles.section}>
        <h2>我的相关任务</h2>
        {data.tasks.length ? (
          data.tasks.map((item) => (
            <div className={styles.evidence} key={item.id}>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.status} · {when(item.dueAt)}
                </small>
              </span>
              <a href={`/e/tasks/${item.id}`}>查看</a>
            </div>
          ))
        ) : (
          <p className={styles.empty}>暂无与你相关的任务。</p>
        )}
      </section>
      <section className={styles.section}>
        <h2>时间线</h2>
        {data.timeline.length ? (
          data.timeline.map((item, index) => (
            <div className={styles.evidence} key={`${item.action}-${index}`}>
              <span>
                <strong>{item.title ?? item.action}</strong>
                <small>{item.kind === 'task' ? '任务动态' : '客户动态'}</small>
              </span>
              <time>{when(item.at)}</time>
            </div>
          ))
        ) : (
          <p className={styles.empty}>暂无可展示的客户动态。</p>
        )}
      </section>
      <footer className={styles.footer}>
        <a href="/e/workbench">返回工作台</a>
      </footer>
    </main>
  );
}
