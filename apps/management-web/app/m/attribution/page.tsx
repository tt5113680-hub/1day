'use client';
import { SessionApiClient } from '@oneday/session-client';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';
type Item = {
  id: string;
  customerId: string;
  customerName: string;
  role: 'first_source' | 'current_source' | 'final_source';
  sourceType: string;
  sourceId: string | null;
  contributors: number;
  confirmedContributors: number;
  evidenceRefs: number;
  evidenceLevel: 'confirmed' | 'recorded' | 'source_only';
};
type Data = { records: Item[]; summary: { first: number; current: number; final: number } };
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const roles = { first_source: '首次来源', current_source: '当前来源', final_source: '最终来源' };
export default function AttributionPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [data, setData] = useState<Data | null>(null),
    [role, setRole] = useState<'all' | Item['role']>('all');
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/management/attribution`, {
        headers: {},
      });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      setData((await r.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  if (state === 'loading') return <main className={styles.centered}>正在汇总来源归因链…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看来源归因</h1>
          <p>请使用具备经营管理权限的账号。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>来源归因暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  const rows = data.records.filter((x) => role === 'all' || x.role === role);
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 来源归因</p>
          <h1>从首次触达，到当前经营与最终结果</h1>
          <span>来源、渠道/内容线索、员工贡献和证据等级均来自已留痕数据，可下钻查看客户链路。</span>
        </div>
        <button onClick={() => void load()}>刷新数据</button>
      </header>
      <section className={styles.cards}>
        <article>
          <span>首次来源</span>
          <strong>{data.summary.first}</strong>
        </article>
        <article>
          <span>当前来源</span>
          <strong>{data.summary.current}</strong>
        </article>
        <article>
          <span>最终来源</span>
          <strong>{data.summary.final}</strong>
        </article>
      </section>
      <section className={styles.panel}>
        <div className={styles.controls}>
          <h2>可解释归因记录</h2>
          <label>
            归因阶段
            <select
              aria-label="归因阶段"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              <option value="all">全部</option>
              <option value="first_source">首次来源</option>
              <option value="current_source">当前来源</option>
              <option value="final_source">最终来源</option>
            </select>
          </label>
        </div>
        {rows.length ? (
          <div className={styles.rows}>
            {rows.map((x) => (
              <article key={x.id}>
                <div>
                  <span className={styles.tag}>{roles[x.role]}</span>
                  <strong>{x.customerName}</strong>
                  <p>
                    {x.sourceType}
                    {x.sourceId ? ` · ${x.sourceId}` : ''} · 贡献 {x.contributors} / 已确认{' '}
                    {x.confirmedContributors}
                  </p>
                </div>
                <div>
                  <span className={styles.level}>
                    {x.evidenceLevel === 'confirmed'
                      ? '已确认并附证据'
                      : x.evidenceLevel === 'recorded'
                        ? '已有贡献记录'
                        : '仅来源记录'}
                  </span>
                  <a href={`/m/customers/${x.customerId}`}>查看客户链路</a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>当前筛选下没有归因记录。</div>
        )}
      </section>
    </main>
  );
}
