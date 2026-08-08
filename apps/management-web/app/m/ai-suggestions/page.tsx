'use client';
import { SessionApiClient } from '@oneday/session-client';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Suggestion = {
  id: string;
  title: string;
  reason: string;
  impact: string;
  action_type: string;
  model_name: string;
  model_version: string;
  status: string;
  feedback: string | null;
  version: number;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function AiSuggestions() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/ai-suggestions`, {
        headers: {},
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw new Error('REQUEST_FAILED');
      setItems((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => void load(), [load]);

  const update = async (item: Suggestion, mode: 'accept' | 'feedback') => {
    const feedbackValue = feedback[item.id]?.trim() ?? '';
    if (mode === 'feedback' && !feedbackValue) {
      setFieldError((errors) => ({ ...errors, [item.id]: '请输入反馈后再提交。' }));
      return;
    }
    setFieldError((errors) => ({ ...errors, [item.id]: '' }));
    const response = await sessionApi.request(
      `${api}/api/v1/management/ai-suggestions/${item.id}/${mode}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          version: item.version,
          ...(mode === 'feedback' ? { feedback: feedbackValue } : {}),
        }),
      },
    );
    if (!response.ok) {
      setNote('操作未完成，请刷新后重试。');
      return;
    }
    setNote(
      mode === 'accept'
        ? '建议已采纳，实际业务动作仍需在对应业务入口确认执行。'
        : '反馈已记录，用于后续建议评估。',
    );
    setFeedback((values) => ({ ...values, [item.id]: '' }));
    await load();
  };

  if (state === 'loading') return <main className={styles.centered}>正在加载可执行建议…</main>;
  if (state === 'forbidden') {
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看 AI 建议</h1>
          <p>请使用具备经营管理权限的账号。</p>
        </section>
      </main>
    );
  }
  if (state === 'error') {
    return (
      <main className={styles.centered}>
        <section>
          <h1>AI 建议暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  }
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / AI 建议中心</p>
          <h1>把经营判断变成可确认的下一步</h1>
          <span>每条建议保留影响、动作类型、模型名称与版本；采纳不自动替代业务确认。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <section className={styles.grid}>
        {items.length ? (
          items.map((item) => (
            <article className={styles.card} key={item.id}>
              <div className={styles.top}>
                <span className={styles[item.status]}>{item.status}</span>
                <small>
                  {item.model_name} · {item.model_version}
                </small>
              </div>
              <h2>{item.title}</h2>
              <p>{item.reason}</p>
              <dl>
                <div>
                  <dt>预期影响</dt>
                  <dd>{item.impact}</dd>
                </div>
                <div>
                  <dt>建议动作</dt>
                  <dd>{item.action_type}</dd>
                </div>
              </dl>
              {item.feedback && <p className={styles.feedback}>反馈：{item.feedback}</p>}
              <div className={styles.feedbackForm}>
                <label htmlFor={`feedback-${item.id}`}>反馈</label>
                <input
                  id={`feedback-${item.id}`}
                  aria-invalid={Boolean(fieldError[item.id])}
                  aria-describedby={fieldError[item.id] ? `feedback-error-${item.id}` : undefined}
                  value={feedback[item.id] ?? ''}
                  maxLength={500}
                  onChange={(event) =>
                    setFeedback((values) => ({ ...values, [item.id]: event.target.value }))
                  }
                  placeholder="输入采纳后的观察或未采纳原因"
                />
                {fieldError[item.id] && (
                  <p id={`feedback-error-${item.id}`} className={styles.fieldError}>
                    {fieldError[item.id]}
                  </p>
                )}
              </div>
              <footer>
                <button
                  disabled={item.status !== 'pending'}
                  onClick={() => void update(item, 'accept')}
                >
                  采纳建议
                </button>
                <button onClick={() => void update(item, 'feedback')}>记录反馈</button>
              </footer>
            </article>
          ))
        ) : (
          <section className={styles.empty}>
            <h2>暂无建议</h2>
            <p>当经营异常或可优化信号进入系统后，建议会在此处出现。</p>
          </section>
        )}
      </section>
    </main>
  );
}
