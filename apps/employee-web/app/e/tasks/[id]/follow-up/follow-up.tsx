'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, businessLabel } from '@oneday/ui';
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
const sessionApi = new SessionApiClient(api);
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
  const load = useCallback(async () => {
    if (!(await sessionApi.context()) || !id) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/employee/tasks/${id}/follow-ups`, {
        headers: {},
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
      const r = await sessionApi.request(`${api}/api/v1/employee/tasks/${id}/follow-ups`, {
        method: 'POST',
        headers: {
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
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在准备跟进记录"
          description="正在同步任务上下文与历史跟进。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法记录跟进"
          description="仅可为分配给自己的任务记录跟进。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="跟进记录暂不可用"
          description="任务跟进数据未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page} data-testid="employee-follow-up">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 任务跟进</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => history.back()}>
          返回
        </button>
      </header>
      <section className={styles.heroCard} aria-label="记录本次进展">
        <h1>记录本任务进展</h1>
        <p>先保留原始动作、文字与语音转写；总结可编辑，原始记录将与任务一同保存。</p>
      </section>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <section className={styles.section}>
        <h2>本次动作</h2>
        <div className={styles.card}>
          {['call', 'visit', 'message', 'other'].map((x) => (
            <Button
              key={x}
              tone={action === x ? 'primary' : 'secondary'}
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
            </Button>
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
                  {businessLabel(x.action_type)}
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
      <p className={styles.honest} role="note">
        跟进记录与原始档案保存于推广员工具的任务痕迹(source=local)。动作、文字与语音转写用于整理跟进过程，
        不代履约美团/抖音订单，非本平台下单，不含第三方订单履约与支付金额。
      </p>
      <footer className={styles.footer}>
        <Button className={styles.complete} loading={busy} onClick={() => void submit()}>
          保存跟进
        </Button>
      </footer>
    </main>
  );
}
