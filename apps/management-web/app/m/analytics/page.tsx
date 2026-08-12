'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ManagementEarlyMeetingKpi } from '../management-early-meeting-kpi';
import styles from './page.module.css';

type DayRow = {
  day: string;
  impressions: number;
  visits: number;
  jumps: number;
  dwells: number;
  shares: number;
  moduleImpressions: number;
  consultClicks: number;
  jumpConfirms: number;
  visitRate: number;
  jumpRate: number;
};
type DailyReport = {
  days: number;
  disclaimer: string;
  today: {
    impressions: number;
    visits: number;
    jumps: number;
    dwells: number;
    shares: number;
    moduleImpressions: number;
    consultClicks: number;
    jumpConfirms: number;
    sentCodes: number;
    visitRate: number;
    jumpRate: number;
  };
  vsPrior: { impressions: number; visits: number; jumps: number };
  daily: DayRow[];
  generatedAt: string;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const pct = (value: number) => (value > 0 ? `+${value}%` : `${value}%`);
type Bucket = { label: string; value: number };
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const buckets = (items: [string, number][]) =>
  items
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));

export default function AnalyticsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [days, setDays] = useState(7);
  const [data, setData] = useState<DailyReport | null>(null);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/entry-funnel/daily-report?days=${days}`,
        { headers: {} },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw new Error('LOAD');
      setData((await response.json()).data as DailyReport);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [days]);
  useEffect(() => void load(), [load]);

  const funnelDist = useMemo<Bucket[]>(() => {
    if (!data) return [];
    const t = data.today;
    return buckets([
      ['观看', t.impressions],
      ['访问', t.visits],
      ['跳转', t.jumps],
      ['停留', t.dwells],
      ['分享', t.shares],
    ]);
  }, [data]);

  const actionDist = useMemo<Bucket[]>(() => {
    if (!data) return [];
    const t = data.today;
    return buckets([
      ['模块曝光', t.moduleImpressions],
      ['咨询点击', t.consultClicks],
      ['跳转确认', t.jumpConfirms],
      ['分享发出码', t.sentCodes],
    ]);
  }, [data]);

  const dayDist = useMemo<Bucket[]>(() => {
    if (!data) return [];
    const rows = data.daily.map((row) => ({
      label: row.day,
      value: row.impressions + row.visits + row.jumps,
    }));
    return rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)).slice(0, 10);
  }, [data]);

  const funnelTotal = data?.today
    ? data.today.impressions +
      data.today.visits +
      data.today.jumps +
      data.today.dwells +
      data.today.shares
    : 0;

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总入口痕迹日报"
          description="统计观看、访问、跳转、停留与分享（不含支付成交）。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看数据分析"
          description="请使用具备租户推广员工具权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="数据分析暂不可用"
          description="日报汇总未能完成，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;

  return (
    <main className={styles.page} data-testid="management-analytics">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 数据/经营分析</span>
        <div className={styles.topBarActions}>
          <label className={styles.days}>
            窗口
            <select
              aria-label="统计天数"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>近 7 天</option>
              <option value={30}>近 30 天</option>
              <option value={90}>近 90 天</option>
            </select>
          </label>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </div>
      </header>

      <section className={styles.heroCard} aria-label="数据分析说明">
        <h1>按美团经营日报密度审视入口分流</h1>
        <p>
          逐日展示观看、访问、跳转、停留与分享等入口痕迹，并给出今日对比前一窗口的变化。
          数据全部来自真实 L0–L2 痕迹表，不含支付、成交或第三方订单数据。
        </p>
      </section>

      <ManagementEarlyMeetingKpi page="analytics" />

      <section className={styles.summaryStrip} aria-label="入口痕迹日报（L0–L2）">
        <div>
          <span>今日观看</span>
          <strong>{data.today.impressions}</strong>
          <small>曝光 {pct(data.vsPrior.impressions)}</small>
        </div>
        <div>
          <span>今日访问</span>
          <strong>{data.today.visits}</strong>
          <small>进店 {pct(data.vsPrior.visits)}</small>
        </div>
        <div>
          <span>今日跳转</span>
          <strong>{data.today.jumps}</strong>
          <small>出站 {pct(data.vsPrior.jumps)}</small>
        </div>
        <div>
          <span>今日停留</span>
          <strong>{data.today.dwells}</strong>
          <small>秒级停留记录</small>
        </div>
        <div>
          <span>今日分享</span>
          <strong>{data.today.shares}</strong>
          <small>发/打开合计</small>
        </div>
        <div>
          <span>进店率</span>
          <strong>{data.today.visitRate}</strong>
          <small>访问 ÷ 观看</small>
        </div>
      </section>

      <section className={styles.distributionPanel} aria-label="经营分析分布">
        <div className={styles.panelHead}>
          <h2>经营分析分布</h2>
          <span className={styles.panelMeta}>由真实 L0–L2 痕迹行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>今日漏斗分布</h3>
            {data.today.impressions > 0 ? (
              <BarList items={funnelDist} total={funnelTotal} />
            ) : (
              <p className={styles.barEmpty}>暂无记录</p>
            )}
          </div>
          <div className={styles.panelBlock}>
            <h3>今日 L2 动作分布</h3>
            {data.today.moduleImpressions +
              data.today.consultClicks +
              data.today.jumpConfirms +
              data.today.sentCodes >
            0 ? (
              <BarList
                items={actionDist}
                total={
                  data.today.moduleImpressions +
                  data.today.consultClicks +
                  data.today.jumpConfirms +
                  data.today.sentCodes
                }
              />
            ) : (
              <p className={styles.barEmpty}>暂无记录</p>
            )}
          </div>
          <div className={styles.panelBlock}>
            <h3>逐日流量分布（近 {data.days} 天）</h3>
            {dayDist.length ? (
              <BarList items={dayDist} total={dayDist.reduce((n, b) => n + b.value, 0)} />
            ) : (
              <p className={styles.barEmpty}>暂无记录</p>
            )}
          </div>
        </div>
        <p className={styles.honest} role="note">
          以上分布全部由已抓取入口痕迹行现场推导(source=local)：今日漏斗分布、今日 L2
          动作分布与逐日流量分布均按真实 L0–L2
          计数。仅统计观看/访问/跳转/停留/分享等入口痕迹，不含支付、成交或第三方订单数据。
        </p>
      </section>

      <section className={styles.rateStrip} aria-label="转化与 L2 痕迹">
        <article className={styles.panel}>
          <h2>漏斗（今日）</h2>
          <dl className={styles.funnel}>
            <div>
              <dt>观看 → 访问</dt>
              <dd>{data.today.visitRate}</dd>
            </div>
            <div>
              <dt>访问 → 跳转</dt>
              <dd>{data.today.jumpRate}</dd>
            </div>
            <div>
              <dt>分享发出码</dt>
              <dd>{data.today.sentCodes}</dd>
            </div>
          </dl>
          <p className={styles.hint}>
            比率由观看/访问/跳转真实计数计算，仅代表入口承接，不代表成交。
          </p>
        </article>
        <article className={styles.panel}>
          <h2>L2 站内动作（今日）</h2>
          <dl className={styles.funnel}>
            <div>
              <dt>模块曝光</dt>
              <dd>{data.today.moduleImpressions}</dd>
            </div>
            <div>
              <dt>咨询点击</dt>
              <dd>{data.today.consultClicks}</dd>
            </div>
            <div>
              <dt>跳转确认</dt>
              <dd>{data.today.jumpConfirms}</dd>
            </div>
          </dl>
          <p className={styles.hint}>
            模块曝光等为 L2 去重可见性观察痕迹，仅做装修与互助效果参考。
          </p>
        </article>
      </section>

      {data.daily.length ? (
        <section className={styles.panel} aria-label="逐日明细">
          <h2>逐日明细（近 {data.days} 天）</h2>
          <p className={styles.hint}>{data.disclaimer}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>观看</th>
                  <th>访问</th>
                  <th>跳转</th>
                  <th>停留</th>
                  <th>分享</th>
                  <th>进店率</th>
                  <th>出站率</th>
                </tr>
              </thead>
              <tbody>
                {[...data.daily].reverse().map((row) => (
                  <tr key={row.day}>
                    <td>{row.day}</td>
                    <td>{row.impressions}</td>
                    <td>{row.visits}</td>
                    <td>{row.jumps}</td>
                    <td>{row.dwells}</td>
                    <td>{row.shares}</td>
                    <td>{row.visitRate}</td>
                    <td>{row.jumpRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className={styles.panel}>
          <AppStatePanel
            kind="empty"
            title="本窗口暂无痕迹"
            description="投放入口并保持 L0–L2 上报后，此处将展示逐日明细。"
          />
        </section>
      )}

      <p className={styles.footnote} role="note">
        {data.disclaimer} ·<a href="/m/entry-funnel">入口痕迹看板</a> ·
        <a href="/m/attribution">来源分析</a>
      </p>
    </main>
  );
}
function BarList({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li key={item.label} className={styles.barRow}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </span>
          <span className={styles.barValue}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
