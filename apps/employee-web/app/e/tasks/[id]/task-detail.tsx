'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import styles from './task-detail.module.css';

type Evidence = {
  id: string;
  evidence_type: string;
  original_filename: string;
  media_type: string;
  byte_size: number;
  created_at: string;
};
type Detail = {
  task: {
    id: string;
    title: string;
    reason: string | null;
    dueAt: string;
    status: string;
    escalationLevel: number;
    version: number;
  };
  customer: { id: string; displayName: string | null } | null;
  evidence: Evidence[];
  availableEvidence: Evidence[];
};
type State = 'loading' | 'ready' | 'forbidden' | 'error';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const when = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
const size = (value: number) => (value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`);

export function TaskDetail() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [state, setState] = useState<State>('loading');
  const [data, setData] = useState<Detail | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'link' | 'complete' | null>(null);
  const token = () => window.sessionStorage.getItem('oneday.accessToken') ?? '';
  const headers = (extra: Record<string, string> = {}) => ({
    authorization: `Bearer ${token()}`,
    'x-request-id': crypto.randomUUID(),
    'content-type': 'application/json',
    ...extra,
  });
  const load = useCallback(
    async (preserveMessage = false) => {
      if (!token() || !id) {
        setState('forbidden');
        return;
      }
      setState('loading');
      if (!preserveMessage) setMessage('');
      try {
        const response = await fetch(`${api}/api/v1/employee/tasks/${id}`, { headers: headers() });
        if ([401, 403, 404].includes(response.status)) {
          setState('forbidden');
          return;
        }
        if (!response.ok) throw Error('LOAD_FAILED');
        setData((await response.json()).data as Detail);
        setState('ready');
      } catch {
        setState('error');
      }
    },
    [id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const linkEvidence = async (evidenceId: string) => {
    if (!id) return;
    setBusy('link');
    setMessage('');
    try {
      const response = await fetch(`${api}/api/v1/employee/tasks/${id}/evidence-links`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': crypto.randomUUID() }),
        body: JSON.stringify({ evidenceId }),
      });
      if (response.status === 409) throw Error('CONFLICT');
      if (!response.ok) throw Error('LINK_FAILED');
      setMessage('证据已关联到本任务，执行记录已同步。');
      await load(true);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'CONFLICT'
          ? '该证据已被关联，请刷新后查看。'
          : '证据关联未完成，请检查网络后重试。',
      );
    } finally {
      setBusy(null);
    }
  };
  const complete = async () => {
    if (!id || !data) return;
    setBusy('complete');
    setMessage('');
    try {
      const response = await fetch(`${api}/api/v1/employee/tasks/${id}/complete`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ version: data.task.version }),
      });
      if (response.status === 409) throw Error('CONFLICT');
      if (!response.ok) throw Error('COMPLETE_FAILED');
      const result = (await response.json()).data as { status: string; version: number };
      setData({ ...data, task: { ...data.task, status: result.status, version: result.version } });
      setMessage('任务已完成，操作记录已同步。');
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'CONFLICT'
          ? '任务已被更新，请刷新后再试。'
          : '任务未能完成，请检查网络后重试。',
      );
    } finally {
      setBusy(null);
    }
  };
  if (state === 'loading') return <main className={styles.centered}>正在加载任务详情…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无法查看此任务</h1>
          <p>请使用已授权的员工账号，且仅可查看分配给自己的任务。</p>
          <a href="/e/workbench">返回工作台</a>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>任务详情暂不可用</h1>
          <p>网络或服务连接出现问题。</p>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  const done = data.task.status === 'completed';
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.back}
          onClick={() => window.history.back()}
          aria-label="返回工作台"
        >
          ←
        </button>
        <div>
          <p>ONEDAY / 我的任务</p>
          <h1>{data.task.title}</h1>
        </div>
        <span className={done ? styles.done : styles.badge}>{done ? '已完成' : '待执行'}</span>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <section className={styles.hero} aria-label="任务状态">
        <span>截止时间</span>
        <strong>{when(data.task.dueAt)}</strong>
        <p>
          {data.task.escalationLevel
            ? `已升级 ${data.task.escalationLevel} 次`
            : '请在截止前完成并保留必要证据。'}
        </p>
      </section>
      <section className={styles.section} aria-labelledby="reason-title">
        <h2 id="reason-title">任务原因</h2>
        <p className={styles.card}>
          {data.task.reason ?? '暂未补充任务原因，请按任务要求完成处理。'}
        </p>
      </section>
      <section className={styles.section} aria-labelledby="customer-title">
        <h2 id="customer-title">关联客户</h2>
        <div className={styles.customer}>
          <span>客户</span>
          {data.customer ? (
            <a href={`/e/customers/${data.customer.id}`}>
              <strong>{data.customer.displayName}</strong>
            </a>
          ) : (
            <strong>内部执行任务</strong>
          )}
          <p>{data.customer ? '证据仅限关联该客户的已持久化记录。' : '该任务未关联客户。'}</p>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="evidence-title">
        <div className={styles.sectionHead}>
          <h2 id="evidence-title">任务证据</h2>
          <span>{data.evidence.length} 项已关联</span>
        </div>
        {data.evidence.length ? (
          data.evidence.map((item) => <EvidenceRow item={item} key={item.id} />)
        ) : (
          <p className={styles.empty}>尚未关联证据；如需要，请从当前客户的可用证据中添加。</p>
        )}
        {data.availableEvidence.length > 0 && !done && (
          <div className={styles.available}>
            <h3>可用客户证据</h3>
            {data.availableEvidence.map((item) => (
              <div className={styles.availableRow} key={item.id}>
                <EvidenceLabel item={item} />
                <button disabled={busy !== null} onClick={() => void linkEvidence(item.id)}>
                  {busy === 'link' ? '关联中…' : '关联'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <footer className={styles.footer}>
        <a href="/e/workbench">返回工作台</a>
        <a href={`/e/tasks/${data.task.id}/follow-up`}>记录跟进</a>
        <button
          className={styles.complete}
          disabled={busy !== null || done}
          onClick={() => void complete()}
        >
          {done ? '任务已完成' : busy === 'complete' ? '处理中…' : '完成任务'}
        </button>
      </footer>
    </main>
  );
}

function EvidenceLabel({ item }: { item: Evidence }) {
  return (
    <span>
      <strong>{item.original_filename}</strong>
      <small>
        {item.evidence_type} · {item.media_type} · {size(item.byte_size)}
      </small>
    </span>
  );
}
function EvidenceRow({ item }: { item: Evidence }) {
  return (
    <div className={styles.evidence}>
      <EvidenceLabel item={item} />
      <time>{when(item.created_at)}</time>
    </div>
  );
}
