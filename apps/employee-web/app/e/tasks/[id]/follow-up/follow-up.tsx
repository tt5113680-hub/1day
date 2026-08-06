'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import styles from '../task-detail.module.css';
type Item = {
  id: string;
  action_type: string;
  raw_note: string | null;
  voice_transcript: string | null;
  summary: string | null;
  next_task_id: string | null;
  created_at: string;
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
export function FollowUp() {
  const p = useParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [items, setItems] = useState<Item[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [action, setAction] = useState('call'),
    [raw, setRaw] = useState(''),
    [voice, setVoice] = useState(''),
    [summary, setSummary] = useState(''),
    [nextTitle, setNextTitle] = useState(''),
    [nextDue, setNextDue] = useState('');
  const token = () => sessionStorage.getItem('oneday.accessToken') ?? '';
  const load = useCallback(async () => {
    if (!token() || !id) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const r = await fetch(`${api}/api/v1/employee/tasks/${id}/follow-ups`, {
        headers: { authorization: `Bearer ${token()}`, 'x-request-id': crypto.randomUUID() },
      });
      if ([401, 403, 404].includes(r.status)) {
        setState('forbidden');
        return;
      }
      if (!r.ok) throw Error();
      setItems((await r.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const submit = async () => {
    if (!id) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(`${api}/api/v1/employee/tasks/${id}/follow-ups`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token()}`,
          'x-request-id': crypto.randomUUID(),
          'idempotency-key': crypto.randomUUID(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          actionType: action,
          rawNote: raw,
          voiceTranscript: voice,
          summary,
          nextTaskTitle: nextTitle || undefined,
          nextTaskDueAt: nextDue ? new Date(nextDue).toISOString() : undefined,
        }),
      });
      if (!r.ok) throw Error();
      setRaw('');
      setVoice('');
      setSummary('');
      setNextTitle('');
      setNextDue('');
      setMessage('跟进已保存，原始记录与总结均已同步。');
      await load();
    } catch {
      setMessage('保存失败，请检查必填信息和网络后重试。');
    } finally {
      setBusy(false);
    }
  };
  if (state === 'loading') return <main className={styles.centered}>正在准备跟进记录…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无法记录跟进</h1>
          <p>仅可为分配给自己的任务记录跟进。</p>
          <a href="/e/workbench">返回工作台</a>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>跟进记录暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => history.back()}>
          ←
        </button>
        <div>
          <p>ONEDAY / 任务跟进</p>
          <h1>记录本次进展</h1>
        </div>
        <span className={styles.badge}>可编辑总结</span>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <section className={styles.hero}>
        <span>先保留原始信息</span>
        <strong>动作、文字与语音转写</strong>
        <p>总结可编辑，原始记录将与任务一同保存。</p>
      </section>
      <section className={styles.section}>
        <h2>本次动作</h2>
        <div className={styles.card}>
          {['call', 'visit', 'message', 'other'].map((x) => (
            <button
              key={x}
              className={action === x ? styles.complete : styles.back}
              onClick={() => setAction(x)}
            >
              {
                (
                  { call: '电话', visit: '到店', message: '消息', other: '其他' } as Record<
                    string,
                    string
                  >
                )[x]
              }
            </button>
          ))}
        </div>
      </section>
      <section className={styles.section}>
        <h2>原始记录</h2>
        <textarea
          aria-label="原始文字记录"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="如实记录沟通内容"
        />
        <textarea
          aria-label="语音转写"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          placeholder="粘贴或编辑语音转写"
        />
      </section>
      <section className={styles.section}>
        <h2>可编辑总结</h2>
        <textarea
          aria-label="跟进总结"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="提炼下一步行动"
        />
      </section>
      <section className={styles.section}>
        <h2>创建下一任务（可选）</h2>
        <input
          aria-label="下一任务标题"
          value={nextTitle}
          onChange={(e) => setNextTitle(e.target.value)}
          placeholder="下一步行动"
        />
        <input
          aria-label="下一任务时间"
          type="datetime-local"
          value={nextDue}
          onChange={(e) => setNextDue(e.target.value)}
        />
      </section>
      <section className={styles.section}>
        <h2>历史跟进</h2>
        {items.length ? (
          items.map((x) => (
            <div className={styles.evidence} key={x.id}>
              <span>
                <strong>{x.summary ?? x.raw_note ?? x.voice_transcript}</strong>
                <small>
                  {x.action_type}
                  {x.next_task_id ? ' · 已创建下一任务' : ''}
                </small>
              </span>
              <time>{new Date(x.created_at).toLocaleString('zh-CN')}</time>
            </div>
          ))
        ) : (
          <p className={styles.empty}>尚无跟进记录。</p>
        )}
      </section>
      <footer className={styles.footer}>
        <button className={styles.complete} disabled={busy} onClick={() => void submit()}>
          {busy ? '保存中…' : '保存跟进'}
        </button>
      </footer>
    </main>
  );
}
