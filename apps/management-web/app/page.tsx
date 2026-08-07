'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';
type Data = {
  metrics: { customers: number; orders30d: number; completedTasks30d: number; openTasks: number };
  anomalies: { id: string; type: string; title: string; occurredAt: string; deepLink: string }[];
  suggestions: { id: string; title: string; reason: string; deepLink: string }[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
export default function ManagementHome() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const token = () => sessionStorage.getItem('oneday.accessToken') ?? '';
  const load = useCallback(async () => {
    if (!token()) return setState('forbidden');
    setState('loading');
    try {
      const r = await fetch(`${api}/api/v1/management/dashboard`, {
        headers: { authorization: `Bearer ${token()}`, 'x-request-id': crypto.randomUUID() },
      });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error('LOAD');
      setData((await r.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (state === 'loading') return <main className={styles.centered}>正在汇总经营信号…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无法查看经营总览</h1>
          <p>请使用具备管理权限的账号登录。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>经营数据暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  const cards = [
    ['客户资产', data.metrics.customers],
    ['近 30 天订单', data.metrics.orders30d],
    ['已完成任务', data.metrics.completedTasks30d],
    ['待推进任务', data.metrics.openTasks],
  ];
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 经营总览</p>
          <h1>让每个经营信号，都能落到行动</h1>
          <span>数据来自客户、订单与任务明细，异常和建议均可追溯。</span>
        </div>
        <button onClick={() => void load()}>刷新数据</button>
      </header>
      <section className={styles.metrics}>
        {cards.map(([label, value]) => (
          <article key={label as string}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>实时经营快照</small>
          </article>
        ))}
      </section>
      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.head}>
            <h2>需要关注的异常</h2>
            <span>{data.anomalies.length} 项</span>
          </div>
          {data.anomalies.length ? (
            data.anomalies.map((item) => (
              <a className={styles.anomaly} href={item.deepLink} key={item.id}>
                <div>
                  <strong>{item.type === 'overdue_task' ? '任务逾期' : '归属审批'}</strong>
                  <p>{item.title}</p>
                </div>
                <time>{new Date(item.occurredAt).toLocaleDateString()}</time>
              </a>
            ))
          ) : (
            <div className={styles.empty}>当前没有待处理异常。</div>
          )}
        </div>
        <div className={styles.panel}>
          <div className={styles.head}>
            <h2>AI 行动建议</h2>
            <span>可解释</span>
          </div>
          {data.suggestions.map((item) => (
            <article className={styles.ai} key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.reason}</p>
              <a href={item.deepLink}>查看行动入口 →</a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
