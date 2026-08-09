'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge, businessLabel } from '@oneday/ui';

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
const sessionApi = new SessionApiClient(api);
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
    if (!(await sessionApi.context()) || !id) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/employee/customers/${id}`, {
        headers: {},
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
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载客户详情"
          description="正在核验你的客户关系与任务范围。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看此客户"
          description="仅可查看与自己归属、任务或贡献有关的客户。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="客户详情暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Button
          className={styles.back}
          tone="quiet"
          onClick={() => history.back()}
          aria-label="返回"
        >
          ←
        </Button>
        <div>
          <p>ONEDAY / 我的客户</p>
          <h1>{data.customer.displayName}</h1>
        </div>
        <StatusBadge tone="info">客户摘要</StatusBadge>
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
                  .map((item) => `${businessLabel(item.type)} · ${item.maskedValue}`)
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
            ? data.sources
                .map(
                  (item) =>
                    `${businessLabel(item.source_role)} · ${businessLabel(item.source_type)}`,
                )
                .join(' / ')
            : '暂未记录来源'}
          <br />
          {data.ownerships.length
            ? data.ownerships
                .map((item) =>
                  item.isCurrentEmployee
                    ? `我 · ${businessLabel(item.ownershipRole)}`
                    : businessLabel(item.ownershipRole),
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
                  {businessLabel(item.status)} · {when(item.dueAt)}
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
