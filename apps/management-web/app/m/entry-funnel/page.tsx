'use client';

import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  Button,
  Card,
  MetricCard,
} from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Bucket = { key: string; count: number };
type Summary = {
  days: number;
  disclaimer: string;
  totals: {
    total: number;
    impressions: number;
    visits: number;
    jumps: number;
    dwells: number;
    shares: number;
    avgDwellMs: number;
  };
  byEventCode: Bucket[];
  bySurface: Bucket[];
  byModule: Bucket[];
  byTargetPlatform: Bucket[];
  generatedAt: string;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const EVENT_LABEL: Record<string, string> = {
  impression: '观看',
  visit: '访问',
  jump: '跳转',
  dwell: '停留',
  share: '分享发出',
  share_open: '分享打开',
  revisit: '回访',
  scroll_depth: '滚动深度',
  module_impression: '模块曝光',
  favorite_click: '收藏点击',
  consult_click: '咨询点击',
  circle_invite: '商圈邀约',
  circle_apply: '商圈申请',
  jump_confirm: '跳转确认',
};

const SURFACE_LABEL: Record<string, string> = {
  nearby: '附近',
  store: '店页',
  circle: '商圈',
  search: '搜索',
  one_code: '一码',
  entry: '入口',
  share: '分享落地',
  other: '其它',
};

export default function EntryFunnelPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Summary | null>(null);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const r = await sessionApi.request(
        `${api}/api/v1/management/entry-funnel/summary?days=${days}`,
        { headers: {} },
      );
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      setData((await r.json()).data as Summary);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [days]);
  useEffect(() => void load(), [load]);

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总入口痕迹"
          description="统计观看、访问、跳转、停留与分享（不含支付成交）。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看入口痕迹"
          description="请使用具备租户经营管理权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="入口痕迹暂不可用"
          description="汇总未能完成，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;

  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 推广员工具 · 入口痕迹"
        title="按模块看分流是否有效"
        description={data.disclaimer}
        actions={
          <>
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
            <Button tone="secondary" onClick={() => void load()}>
              刷新
            </Button>
          </>
        }
      />
      <section className={styles.cards}>
        <MetricCard label="观看" value={data.totals.impressions} hint="曝光" />
        <MetricCard label="访问" value={data.totals.visits} hint="进页" />
        <MetricCard label="跳转" value={data.totals.jumps} hint="出站（至第三方）" />
        <MetricCard label="停留事件" value={data.totals.dwells} hint={`均 ${data.totals.avgDwellMs} ms`} />
        <MetricCard label="分享相关" value={data.totals.shares} hint="发出 + 打开" />
        <MetricCard label="全部事件" value={data.totals.total} hint={`近 ${data.days} 天`} />
      </section>
      <div className={styles.grid}>
        <Card className={styles.panel}>
          <h2>按模块名</h2>
          <p className={styles.hint}>看板标题跟租户入口模块走；无模块名归入「未命名模块」。</p>
          <BucketList rows={data.byModule} labelOf={(k) => k} />
        </Card>
        <Card className={styles.panel}>
          <h2>按入口面</h2>
          <BucketList rows={data.bySurface} labelOf={(k) => SURFACE_LABEL[k] ?? k} />
        </Card>
        <Card className={styles.panel}>
          <h2>按事件</h2>
          <BucketList rows={data.byEventCode} labelOf={(k) => EVENT_LABEL[k] ?? k} />
        </Card>
        <Card className={styles.panel}>
          <h2>跳转目标平台</h2>
          <p className={styles.hint}>仅 jump / jump_confirm；统计到跳转为止。</p>
          <BucketList rows={data.byTargetPlatform} labelOf={(k) => k} />
        </Card>
      </div>
    </main>
  );
}

function BucketList({
  rows,
  labelOf,
}: {
  rows: Bucket[];
  labelOf: (key: string) => string;
}) {
  if (!rows.length) return <p className={styles.empty}>本窗口暂无痕迹。</p>;
  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.key}>
          <span>{labelOf(row.key)}</span>
          <strong>{row.count}</strong>
        </li>
      ))}
    </ul>
  );
}
