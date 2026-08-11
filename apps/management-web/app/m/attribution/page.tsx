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
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

type Data = { records: Item[]; summary: { first: number; current: number; final: number } };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

function metaText(meta: Item['metadata'], key: string): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const value = meta[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default function AttributionPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [role, setRole] = useState<'all' | Item['role']>('all');
  const [sourceType, setSourceType] = useState('all');

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

  const sourceTypes = useMemo(() => {
    if (!data) return [] as string[];
    return [...new Set(data.records.map((r) => r.sourceType).filter(Boolean))].sort();
  }, [data]);

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总来源归因链"
          description="正在关联入口来源、员工贡献与经营证据（不含第三方成交）。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看来源归因"
          description="请使用具备推广员工具权限的账号。"
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

  const rows = data.records.filter(
    (x) =>
      (role === 'all' || x.role === role) &&
      (sourceType === 'all' || x.sourceType === sourceType),
  );

  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 推广员工具 · 来源归因"
        title="看清从哪进、谁承接、证据到哪一级"
        description="来源、渠道、分享码与员工贡献均来自已留痕数据。不表示第三方已下单或已支付；成交结果以外部平台为准。"
        actions={
          <>
            <Button
              tone="secondary"
              onClick={() => {
                window.location.href = '/m/entry-funnel';
              }}
            >
              入口痕迹看板
            </Button>
            <Button tone="secondary" onClick={() => void load()}>
              刷新数据
            </Button>
          </>
        }
      />
      <p className={styles.disclaimer} role="note">
        归因阶段（首次/当前/最终）描述入口与经营承接，不是销售漏斗成交阶段。
      </p>
      <section className={styles.cards}>
        <MetricCard label="首次来源" value={data.summary.first} hint="初次进入入口分流链路" />
        <MetricCard label="当前来源" value={data.summary.current} hint="当前承接来源" />
        <MetricCard label="最终来源" value={data.summary.final} hint="结果归因（非成交）" />
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
          <label>
            来源类型
            <select
              aria-label="来源类型"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
            >
              <option value="all">全部</option>
              {sourceTypes.map((t) => (
                <option key={t} value={t}>
                  {businessLabel(t)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {rows.length ? (
          <div className={styles.rows}>
            {rows.map((x) => {
              const scene = metaText(x.metadata, 'scene') ?? metaText(x.metadata, 'Scene');
              const share =
                metaText(x.metadata, 'shareCode') ?? metaText(x.metadata, 'share_code');
              return (
                <article key={x.id}>
                  <div>
                    <StatusBadge tone="info">{businessLabel(x.role)}</StatusBadge>
                    <strong>{customerNameCopy(x.customerName) || '未命名客户'}</strong>
                    <p>
                      {businessLabel(x.sourceType)} · 贡献 {x.contributors} / 已确认{' '}
                      {x.confirmedContributors} · 证据 {x.evidenceRefs}
                      {scene ? ` · 场景 ${scene}` : ''}
                      {share ? ` · 分享码 ${share}` : ''}
                    </p>
                  </div>
                  <div>
                    <StatusBadge tone={x.evidenceLevel === 'confirmed' ? 'success' : 'neutral'}>
                      {businessLabel(x.evidenceLevel)}
                    </StatusBadge>
                    <a href={`/m/customers/${x.customerId}`}>查看客户链路</a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <AppStatePanel
            kind="empty"
            title="当前筛选下没有归因记录"
            description="切换归因阶段或来源类型，或等待新的入口分流链路形成。"
          />
        )}
      </Card>
    </main>
  );
}
