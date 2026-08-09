'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  businessLabel,
  Button,
  Card,
  customerNameCopy,
  MetricCard,
  StatusBadge,
} from '@oneday/ui';
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
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总来源归因链"
          description="正在关联客户来源、员工贡献与经营证据。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看来源归因"
          description="请使用具备经营管理权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="来源归因暂不可用"
          description="归因记录未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const rows = data.records.filter((x) => role === 'all' || x.role === role);
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 商户经营归因"
        title="从首次触达，到当前经营与最终结果"
        description="来源、渠道与内容线索、员工贡献和证据等级均来自已留痕数据，可继续查看客户经营链路。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新数据
          </Button>
        }
      />
      <section className={styles.cards}>
        <MetricCard label="首次来源" value={data.summary.first} hint="初次进入经营链路" />
        <MetricCard label="当前来源" value={data.summary.current} hint="当前承接来源" />
        <MetricCard label="最终来源" value={data.summary.final} hint="最终结果归因" />
      </section>
      <Card className={styles.panel}>
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
                  <StatusBadge tone="info">{businessLabel(x.role)}</StatusBadge>
                  <strong>{customerNameCopy(x.customerName) || '未命名客户'}</strong>
                  <p>
                    {businessLabel(x.sourceType)} · 贡献 {x.contributors} / 已确认{' '}
                    {x.confirmedContributors} · 证据 {x.evidenceRefs}
                  </p>
                </div>
                <div>
                  <StatusBadge tone={x.evidenceLevel === 'confirmed' ? 'success' : 'neutral'}>
                    {businessLabel(x.evidenceLevel)}
                  </StatusBadge>
                  <a href={`/m/customers/${x.customerId}`}>查看客户链路</a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <AppStatePanel
            kind="empty"
            title="当前筛选下没有归因记录"
            description="切换归因阶段，或等待新的客户经营链路形成。"
          />
        )}
      </Card>
    </main>
  );
}
