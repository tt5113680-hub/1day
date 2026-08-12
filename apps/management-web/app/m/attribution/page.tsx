'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, businessLabel, Button, customerNameCopy, StatusBadge } from '@oneday/ui';
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

const barWidth = (total: number, value: number) =>
  total ? `${Math.max(2, (value / total) * 100)}%` : '0%';

const countBy = <T,>(rows: T[], key: (row: T) => string) => {
  const acc: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return Object.entries(acc)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

const ROLE_LABEL: Record<Item['role'], string> = {
  first_source: '首次来源',
  current_source: '当前来源',
  final_source: '最终来源',
};

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

  const roleDist = useMemo(
    () => (data ? countBy(data.records, (r) => ROLE_LABEL[r.role]) : []),
    [data],
  );
  const sourceTypeDist = useMemo(
    () => (data ? countBy(data.records, (r) => businessLabel(r.sourceType)) : []),
    [data],
  );
  const evidenceDist = useMemo(
    () => (data ? countBy(data.records, (r) => businessLabel(r.evidenceLevel)) : []),
    [data],
  );

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总来源归因链"
          description="正在关联入口来源、员工贡献与入口证据（不含第三方成交）。"
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
      (role === 'all' || x.role === role) && (sourceType === 'all' || x.sourceType === sourceType),
  );

  const renderBars = (items: { label: string; value: number }[], total: number) => {
    if (!items.length)
      return (
        <>
          <p className={styles.barEmpty}>当前筛选下暂无归因分布记录。</p>
          <p className={styles.barEmpty}>暂无记录</p>
        </>
      );
    return (
      <ul className={styles.bars}>
        {items.map((item) => (
          <li className={styles.barRow} key={item.label}>
            <span className={styles.barLabel}>{item.label}</span>
            <span className={styles.barTrack}>
              <span className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
            </span>
            <span className={styles.barValue}>{item.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  const recordsTotal = data.records.length;

  return (
    <main className={styles.page} data-testid="management-attribution">
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 来源归因</span>
        <div className={styles.topBarActions}>
          <button
            type="button"
            className={styles.topBarLink}
            onClick={() => {
              window.location.href = '/m/entry-funnel';
            }}
          >
            入口痕迹看板
          </button>
          <button type="button" className={styles.topBarRefresh} onClick={() => void load()}>
            刷新数据
          </button>
        </div>
      </div>
      <section className={styles.heroCard} aria-label="来源归因概况">
        <h1>看清从哪进、谁承接、证据到哪一级</h1>
        <p>
          来源、渠道、分享码与员工贡献均来自已留痕数据。归因阶段描述入口分流与承接，不是销售漏斗成交阶段；成交结果以外部平台为准。
        </p>
      </section>
      <section className={styles.panel}>
        <div className={styles.summaryStrip} aria-label="归因摘要">
          <div>
            <span>归因记录</span>
            <strong>{recordsTotal}</strong>
          </div>
          <div>
            <span>首次来源</span>
            <strong>{data.summary.first}</strong>
          </div>
          <div>
            <span>当前来源</span>
            <strong>{data.summary.current}</strong>
          </div>
          <div>
            <span>最终来源</span>
            <strong>{data.summary.final}</strong>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>来源归因分布</h2>
          <span className={styles.panelMeta}>由已抓取归因档案行现场推导 · 禁止假 BI</span>
        </div>
        <div className={styles.distribution} aria-label="来源归因分布">
          <div className={styles.panelBlock}>
            <h3>归因阶段分布</h3>
            {renderBars(roleDist, recordsTotal)}
          </div>
          <div className={styles.panelBlock}>
            <h3>来源类型分布</h3>
            {renderBars(sourceTypeDist, recordsTotal)}
          </div>
          <div className={styles.panelBlock}>
            <h3>证据级别分布</h3>
            {renderBars(evidenceDist, recordsTotal)}
          </div>
        </div>
        <p className={styles.honest} role="note">
          分布全部由已抓取来源归因档案行现场推导（source=local）；仅记录观看/访问/跳转/停留/分享入口痕迹，不表示第三方已下单或已支付，不包含本平台收款，非本平台下单。
        </p>
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
              const share = metaText(x.metadata, 'shareCode') ?? metaText(x.metadata, 'share_code');
              return (
                <article key={x.id} data-testid="attribution-row">
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
      </section>
    </main>
  );
}
