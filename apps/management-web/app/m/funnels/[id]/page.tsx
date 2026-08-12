'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function ManagementFunnel({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [data, setData] = useState<Funnel | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  useEffect(() => {
    void params.then(({ id: value }) => setId(value));
  }, [params]);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    if (!id) return;
    setState('loading');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/funnels/${encodeURIComponent(id)}`,
        {
          headers: {},
        },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);
  useEffect(() => void load(), [load]);

  const typeDist = useMemo(
    () =>
      data
        ? countBy(data.stages, (s) => (s.resultType === 'confirmed' ? '确认结果' : '推断结果'))
        : [],
    [data],
  );

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总来源归因漏斗"
          description="正在区分可确认结果与推断信号。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看来源归因漏斗"
          description="请使用具备管理权限的账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="来源归因漏斗暂不可用"
          description="漏斗口径与结果数据未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const confirmed = data.stages.filter((stage) => stage.resultType === 'confirmed');
  const baseline = confirmed[0]?.value || 0;

  const stageTotal = data.stages.length;

  const renderBars = (items: { label: string; value: number }[], total: number) => {
    if (!items.length)
      return (
        <>
          <p className={styles.barEmpty}>当前漏斗暂无阶段分布。</p>
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

  return (
    <main className={styles.page} data-testid="management-funnel">
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 来源归因漏斗</span>
        <button type="button" className={styles.topBarRefresh} onClick={() => void load()}>
          刷新数据
        </button>
      </div>
      <section className={styles.heroCard} aria-label="来源归因漏斗概况">
        <h1>从来源到进店承接，跟踪每一步的入口分流</h1>
        <p>{`漏斗：${data.id}。确认数据与推断数据分开呈现。`}</p>
      </section>
      <section className={styles.panel}>
        <div className={styles.summaryStrip} aria-label="漏斗摘要">
          <div>
            <span>阶段数</span>
            <strong>{stageTotal}</strong>
          </div>
          <div>
            <span>确认阶段</span>
            <strong>{confirmed.length}</strong>
          </div>
          <div>
            <span>推断阶段</span>
            <strong>{data.stages.length - confirmed.length}</strong>
          </div>
          <div>
            <span>确认来源转化</span>
            <strong>{baseline ? 100 : 0}%</strong>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>漏斗阶段分布</h2>
          <span className={styles.panelMeta}>由已抓取漏斗阶段行现场推导 · 禁止假 BI</span>
        </div>
        <div className={styles.distribution} aria-label="漏斗分布">
          <div className={styles.panelBlock}>
            <h3>阶段结果类型分布</h3>
            {renderBars(typeDist, stageTotal)}
          </div>
          <div className={styles.panelBlock}>
            <h3>各阶段来源转化</h3>
            <ul className={styles.bars}>
              {data.stages.map((stage) => (
                <li className={styles.barRow} key={stage.id}>
                  <span className={styles.barLabel}>{stage.label}</span>
                  <span className={styles.barTrack}>
                    <span
                      className={styles.barFill}
                      style={{
                        width:
                          stage.value === null || baseline === 0
                            ? '0%'
                            : barWidth(baseline, stage.value),
                      }}
                    />
                  </span>
                  <span className={styles.barValue}>
                    {stage.value === null ? '—' : `${Math.round((stage.value / baseline) * 100)}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className={styles.honest} role="note">
          分布全部由已抓取来源归因漏斗阶段行现场推导（source=local）；“访问”未与来源客户建立持久化关联时明确标为推断，避免把不可确认行为当作入口分流结果；仅记录观看/访问/跳转/停留/分享入口痕迹，不包含本平台收款，非本平台下单。
        </p>
      </section>
      <section className={styles.funnel} aria-label="来源归因漏斗">
        {data.stages.map((stage) => (
          <div
            className={stage.resultType === 'confirmed' ? styles.confirmed : styles.inferred}
            key={stage.id}
          >
            <div>
              <span>{stage.label}</span>
              <strong>{stage.value === null ? '暂不可确认' : stage.value}</strong>
            </div>
            <StatusBadge tone={stage.resultType === 'confirmed' ? 'success' : 'warning'}>
              {stage.resultType === 'confirmed' ? '确认结果' : '推断结果'}
            </StatusBadge>
            <small>
              {stage.resultType === 'confirmed'
                ? `确认结果 · ${baseline ? Math.round(((stage.value ?? 0) / baseline) * 100) : 0}% 来源转化`
                : '推断结果 · 不计入转化率'}
            </small>
            <p>{stage.note ?? data.definitions[stage.id]}</p>
          </div>
        ))}
      </section>
      <section className={styles.panel}>
        <h2>口径说明</h2>
        <p className={styles.noteText}>
          “访问”未和来源客户建立持久化关联，因此明确标为推断，避免把不可确认行为当作入口分流结果。其余阶段均可回溯至来源、客户、任务或订单明细。
        </p>
      </section>
    </main>
  );
}
