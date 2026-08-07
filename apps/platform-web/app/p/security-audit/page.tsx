'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';
type Risk = {
  risk_key: string;
  kind: string;
  label: string;
  severity: string;
  detail: string;
  review_status?: string;
  review_note?: string;
  review_version?: number;
};
type Event = {
  action: string;
  resource_type: string;
  resource_id: string;
  correlation_id: string;
  created_at: string;
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
export default function SecurityAudit() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [risks, setRisks] = useState<Risk[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const headers = () => ({
    authorization: `Bearer ${sessionStorage.getItem('oneday.accessToken')}`,
    'x-request-id': crypto.randomUUID(),
  });
  const load = useCallback(async () => {
    if (!sessionStorage.getItem('oneday.accessToken')) return setState('forbidden');
    setState('loading');
    try {
      const r = await fetch(`${api}/api/v1/platform/security-audit`, { headers: headers() });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      const data = (await r.json()).data;
      setRisks(data.risks);
      setEvents(data.events);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const acknowledge = async (risk: Risk) => {
    setSaving(true);
    setNote('');
    try {
      const r = await fetch(`${api}/api/v1/platform/security-audit/acknowledgements`, {
        method: 'POST',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          riskKey: risk.risk_key,
          note: 'Reviewed by platform operator; evidence retained for follow-up.',
          version: risk.review_version ?? 1,
        }),
      });
      if (r.status === 409) return setNote('该风险处置已变化，请刷新后重试。');
      if (!r.ok) throw Error();
      setNote('风险信号已处置并保留审计与事件记录。');
      await load();
    } catch {
      setNote('处置保存失败。');
    } finally {
      setSaving(false);
    }
  };
  if (state === 'loading') return <main className={styles.centered}>正在加载安全审计…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看平台安全审计</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>平台安全审计暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 平台安全审计</p>
          <h1>风险信号、越权审计、连接器与安全事件</h1>
          <span>风险为可核查信号而非未经证实的入侵结论；处置会保留责任、理由和事件链。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <section className={styles.panel}>
          <h2>待审查风险信号</h2>
          {risks.length ? (
            risks.map((r) => (
              <article key={r.risk_key}>
                <div>
                  <strong>
                    {r.kind} · {r.label}
                  </strong>
                  <span>
                    {r.severity} · {r.detail}
                  </span>
                  <small>{r.review_status ? `已处置：${r.review_note}` : '尚未处置'}</small>
                </div>
                <button disabled={saving} onClick={() => void acknowledge(r)}>
                  {r.review_status ? '更新处置' : '确认处置'}
                </button>
              </article>
            ))
          ) : (
            <p>当前没有可定位的风险信号。</p>
          )}
        </section>
        <section className={styles.panel}>
          <h2>安全事件链</h2>
          {events.length ? (
            events.map((e, i) => (
              <article key={`${e.correlation_id}-${i}`}>
                <div>
                  <strong>{e.action}</strong>
                  <span>
                    {e.resource_type} · {e.created_at}
                  </span>
                  <small>关联：{e.correlation_id}</small>
                </div>
              </article>
            ))
          ) : (
            <p>暂无匹配的安全审计事件。</p>
          )}
        </section>
      </section>
    </main>
  );
}
