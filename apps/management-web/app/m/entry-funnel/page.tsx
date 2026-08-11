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
type IndustryTemplate = {
  id: 'restaurant' | 'beauty' | 'retail';
  label: string;
  focusModules: string[];
  insights: string[];
};
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
    moduleImpressions?: number;
    consultClicks?: number;
    jumpConfirms?: number;
  };
  byEventCode: Bucket[];
  bySurface: Bucket[];
  byModule: Bucket[];
  byTargetPlatform: Bucket[];
  industryTemplates?: Record<string, IndustryTemplate>;
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

const MODULE_LABEL: Record<string, string> = {
  store_hero: '门店头图',
  banner_carousel: '活动轮播',
  quick_actions: '快捷入口',
  member_entry: '会员入口',
  member_wallet: '会员卡包',
  service_catalog: '服务目录',
  offer_compare: '全平台团购比价',
  content_feed: '门店活动',
  store_info: '门店信息',
  floating_consult: '悬浮咨询',
  storefront: '店页',
  circles_home: '商圈首页',
  circle_card: '商圈卡片',
  circle_detail: '商圈详情',
};

export default function EntryFunnelPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [days, setDays] = useState(7);
  const [industry, setIndustry] = useState<'restaurant' | 'beauty' | 'retail'>('restaurant');
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

  const template = data.industryTemplates?.[industry];
  const focusSet = new Set(template?.focusModules ?? []);
  const focusModules = data.byModule.filter(
    (row) => focusSet.has(row.key) || focusSet.size === 0,
  );

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
            <label className={styles.days}>
              行业模板
              <select
                aria-label="行业分析模板"
                value={industry}
                onChange={(e) =>
                  setIndustry(e.target.value as 'restaurant' | 'beauty' | 'retail')
                }
              >
                <option value="restaurant">餐饮</option>
                <option value="beauty">美业</option>
                <option value="retail">零售</option>
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
        <MetricCard
          label="模块曝光"
          value={data.totals.moduleImpressions ?? 0}
          hint="L2 去重可见"
        />
        <MetricCard
          label="咨询点击"
          value={data.totals.consultClicks ?? 0}
          hint="站内动作"
        />
        <MetricCard
          label="跳转确认"
          value={data.totals.jumpConfirms ?? 0}
          hint="确认页完成"
        />
      </section>

      {template ? (
        <Card className={styles.panelWide}>
          <h2>{template.label}行业模板（只解读痕迹）</h2>
          <p className={styles.hint}>
            关注模块：
            {template.focusModules.map((m) => MODULE_LABEL[m] ?? m).join(' · ')}
          </p>
          <ul className={styles.insights}>
            {template.insights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <BucketList
            rows={focusModules.length ? focusModules : data.byModule.slice(0, 8)}
            labelOf={(k) => MODULE_LABEL[k] ?? k}
          />
        </Card>
      ) : null}

      <div className={styles.grid}>
        <Card className={styles.panel}>
          <h2>按模块名</h2>
          <p className={styles.hint}>看板标题跟租户入口模块走；无模块名归入「未命名模块」。</p>
          <BucketList rows={data.byModule} labelOf={(k) => MODULE_LABEL[k] ?? k} />
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
