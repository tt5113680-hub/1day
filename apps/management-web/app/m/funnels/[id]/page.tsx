'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Stage = {
  id: string;
  label: string;
  value: number | null;
  resultType: 'confirmed' | 'inferred';
  note?: string;
};
type Funnel = {
  id: string;
  stages: Stage[];
  definitions: Record<string, string>;
  generatedAt: string;
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export default function ManagementFunnel({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [data, setData] = useState<Funnel | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  useEffect(() => {
    void params.then(({ id: value }) => setId(value));
  }, [params]);
  const load = useCallback(async () => {
    const token = sessionStorage.getItem('oneday.accessToken');
    if (!token) return setState('forbidden');
    if (!id) return;
    setState('loading');
    try {
      const response = await fetch(`${api}/api/v1/management/funnels/${encodeURIComponent(id)}`, {
        headers: { authorization: `Bearer ${token}`, 'x-request-id': crypto.randomUUID() },
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);
  useEffect(() => void load(), [load]);

  if (state === 'loading') return <main className={styles.centered}>正在汇总漏斗数据…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无法查看经营漏斗</h1>
          <p>请使用具备管理权限的账号登录。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>经营漏斗暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  const confirmed = data.stages.filter((stage) => stage.resultType === 'confirmed');
  const baseline = confirmed[0]?.value || 0;
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 经营漏斗</p>
          <h1>从来源到复购，确认每一步的经营结果</h1>
          <span>漏斗：{data.id}。确认数据与推断数据分开呈现。</span>
        </div>
        <button onClick={() => void load()}>刷新数据</button>
      </header>
      <section className={styles.funnel} aria-label="经营漏斗">
        {data.stages.map((stage) => (
          <article
            className={stage.resultType === 'confirmed' ? styles.confirmed : styles.inferred}
            key={stage.id}
          >
            <div>
              <span>{stage.label}</span>
              <strong>{stage.value === null ? '暂不可确认' : stage.value}</strong>
            </div>
            <small>
              {stage.resultType === 'confirmed'
                ? `确认结果 · ${baseline ? Math.round(((stage.value ?? 0) / baseline) * 100) : 0}% 来源转化`
                : '推断结果 · 不计入转化率'}
            </small>
            <p>{stage.note ?? data.definitions[stage.id]}</p>
          </article>
        ))}
      </section>
      <section className={styles.notice}>
        <h2>口径说明</h2>
        <p>
          “访问”未和来源客户建立持久化关联，因此明确标为推断，避免把不可确认行为当作经营结果。其余阶段均可回溯至来源、客户、任务或订单明细。
        </p>
      </section>
    </main>
  );
}
