'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button } from '@oneday/ui';
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
  sharePairing?: {
    sentCodes: number;
    openedCodes: number;
    pairedCodes: number;
    note: string;
  };
  industryTemplates?: Record<string, IndustryTemplate>;
  generatedAt: string;
};

type QueryResult = {
  days: number;
  groupBy: string;
  rows: Bucket[];
  disclaimer: string;
};
type InterpretResult = {
  days: number;
  mode: string;
  disclaimer: string;
  insights: string[];
  comparedToPriorWindow: { priorDays: number; visitsDelta: number; jumpsDelta: number };
  queryPreview: Bucket[];
};
type SavedView = {
  id: string;
  name: string;
  days: number;
  groupBy: string;
  surface: string | null;
  moduleKey: string | null;
  targetPlatform: string | null;
  eventCode: string | null;
  industryTemplate: string | null;
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

const barWidth = (total: number, value: number) =>
  total ? `${Math.max(2, (value / total) * 100)}%` : '0%';

export default function EntryFunnelPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [days, setDays] = useState(7);
  const [industry, setIndustry] = useState<'restaurant' | 'beauty' | 'retail'>('restaurant');
  const [data, setData] = useState<Summary | null>(null);
  const [groupBy, setGroupBy] = useState('module_key');
  const [filterSurface, setFilterSurface] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [diy, setDiy] = useState<QueryResult | null>(null);
  const [diyLoading, setDiyLoading] = useState(false);
  const [interpret, setInterpret] = useState<InterpretResult | null>(null);
  const [interpretLoading, setInterpretLoading] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const [r, viewsRes] = await Promise.all([
        sessionApi.request(`${api}/api/v1/management/entry-funnel/summary?days=${days}`, {
          headers: {},
        }),
        sessionApi.request(`${api}/api/v1/management/entry-funnel/saved-views`, {
          headers: {},
        }),
      ]);
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      setData((await r.json()).data as Summary);
      if (viewsRes.ok) {
        const body = (await viewsRes.json()).data as { items: SavedView[] };
        setSavedViews(body.items ?? []);
      }
      setState('ready');
    } catch {
      setState('error');
    }
  }, [days]);
  useEffect(() => void load(), [load]);

  const applySaved = (view: SavedView) => {
    setDays(view.days);
    setGroupBy(view.groupBy);
    setFilterSurface(view.surface ?? '');
    setFilterPlatform(view.targetPlatform ?? '');
    setFilterEvent(view.eventCode ?? '');
    if (
      view.industryTemplate === 'restaurant' ||
      view.industryTemplate === 'beauty' ||
      view.industryTemplate === 'retail'
    )
      setIndustry(view.industryTemplate);
    setViewName(view.name);
    setSaveNote(`已加载视图「${view.name}」，可再点查询/解读。`);
  };

  const saveCurrentView = async () => {
    if (!viewName.trim()) {
      setSaveNote('请先填写视图名称。');
      return;
    }
    try {
      const r = await sessionApi.request(`${api}/api/v1/management/entry-funnel/saved-views`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: viewName.trim(),
          days,
          groupBy,
          surface: filterSurface || null,
          targetPlatform: filterPlatform || null,
          eventCode: filterEvent || null,
          industryTemplate: industry,
        }),
      });
      if (!r.ok) throw Error();
      setSaveNote('视图已保存（同名覆盖）。');
      await load();
    } catch {
      setSaveNote('保存失败，请检查权限后重试。');
    }
  };

  const removeView = async (id: string) => {
    try {
      const r = await sessionApi.request(
        `${api}/api/v1/management/entry-funnel/saved-views/${encodeURIComponent(id)}/delete`,
        { method: 'POST', headers: {} },
      );
      if (!r.ok) throw Error();
      setSaveNote('视图已删除。');
      await load();
    } catch {
      setSaveNote('删除失败。');
    }
  };

  const runDiy = async () => {
    setDiyLoading(true);
    try {
      const q = new URLSearchParams({ days: String(days), groupBy });
      if (filterSurface) q.set('surface', filterSurface);
      if (filterPlatform) q.set('targetPlatform', filterPlatform);
      if (filterEvent) q.set('eventCode', filterEvent);
      const r = await sessionApi.request(`${api}/api/v1/management/entry-funnel/query?${q}`, {
        headers: {},
      });
      if (!r.ok) throw Error();
      setDiy((await r.json()).data as QueryResult);
    } catch {
      setDiy(null);
    } finally {
      setDiyLoading(false);
    }
  };

  const runInterpret = async () => {
    setInterpretLoading(true);
    try {
      const r = await sessionApi.request(`${api}/api/v1/management/entry-funnel/interpret`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          days,
          groupBy,
          surface: filterSurface || undefined,
          targetPlatform: filterPlatform || undefined,
          eventCode: filterEvent || undefined,
        }),
      });
      if (!r.ok) throw Error();
      setInterpret((await r.json()).data as InterpretResult);
    } catch {
      setInterpret(null);
    } finally {
      setInterpretLoading(false);
    }
  };

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
          description="请使用具备租户推广员工具权限的账号。"
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
  const focusModules = data.byModule.filter((row) => focusSet.has(row.key) || focusSet.size === 0);

  return (
    <main className={styles.page} data-testid="management-entry-funnel">
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 入口痕迹</span>
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
          <label className={styles.days}>
            行业模板
            <select
              aria-label="行业分析模板"
              value={industry}
              onChange={(e) => setIndustry(e.target.value as 'restaurant' | 'beauty' | 'retail')}
            >
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="retail">零售</option>
            </select>
          </label>
          <button
            type="button"
            className={styles.topBarRefresh}
            onClick={() => {
              window.location.href = '/m/attribution';
            }}
          >
            来源归因
          </button>
          <button type="button" className={styles.topBarRefresh} onClick={() => void load()}>
            刷新
          </button>
        </div>
      </div>
      <section className={styles.heroCard} aria-label="入口痕迹概况">
        <h1>按模块看分流是否有效</h1>
        <p>{data.disclaimer}</p>
      </section>
      {data.sharePairing?.note ? (
        <p className={styles.hint} role="note">
          {data.sharePairing.note}
        </p>
      ) : null}
      <section className={styles.panel}>
        <div className={styles.summaryStrip} aria-label="入口数据概况">
          <div>
            <span>观看</span>
            <strong>{data.totals.impressions}</strong>
          </div>
          <div>
            <span>访问</span>
            <strong>{data.totals.visits}</strong>
          </div>
          <div>
            <span>跳转</span>
            <strong>{data.totals.jumps}</strong>
          </div>
          <div>
            <span>停留</span>
            <strong>{data.totals.dwells}</strong>
          </div>
          <div>
            <span>模块曝光</span>
            <strong>{data.totals.moduleImpressions ?? 0}</strong>
          </div>
          <div>
            <span>咨询点击</span>
            <strong>{data.totals.consultClicks ?? 0}</strong>
          </div>
          <div>
            <span>跳转确认</span>
            <strong>{data.totals.jumpConfirms ?? 0}</strong>
          </div>
          <div>
            <span>分享配对</span>
            <strong>{data.sharePairing?.pairedCodes ?? 0}</strong>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>入口痕迹分布</h2>
          <span className={styles.panelMeta}>真实 L0–L2 痕迹行聚合 · 禁止假 BI</span>
        </div>
        <div className={styles.distribution} aria-label="入口痕迹分布">
          <div className={styles.panelBlock}>
            <h3>事件分布</h3>
            {renderBuckets(data.byEventCode, (k) => EVENT_LABEL[k] ?? k)}
          </div>
          <div className={styles.panelBlock}>
            <h3>入口面分布</h3>
            {renderBuckets(data.bySurface, (k) => SURFACE_LABEL[k] ?? k)}
          </div>
          <div className={styles.panelBlock}>
            <h3>模块分布</h3>
            {renderBuckets(data.byModule, (k) => MODULE_LABEL[k] ?? k)}
          </div>
          <div className={styles.panelBlock}>
            <h3>跳转目标平台分布</h3>
            {renderBuckets(data.byTargetPlatform, (k) => k)}
          </div>
        </div>
        <p className={styles.honest} role="note">
          分布全部由已抓取 entrance L0–L2
          入口痕迹行现场推导（source=local）；仅统计观看/访问/跳转/停留/分享等入口行为，跳转统计到跳转为止，不包含本平台收款，非本平台下单，不含支付金额与第三方成交。
        </p>
      </section>

      {template ? (
        <section className={styles.panelWide}>
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
        </section>
      ) : null}

      <section className={styles.panelWide}>
        <h2>自助分析（DIY 维度）</h2>
        <p className={styles.hint}>拖选维度与过滤条件，只聚合 L0–L2 痕迹表。</p>
        <div className={styles.diyRow}>
          <label>
            分组
            <select
              aria-label="分组维度"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="module_key">模块</option>
              <option value="surface">入口面</option>
              <option value="target_platform">目标平台</option>
              <option value="event_code">事件</option>
              <option value="day">按日</option>
            </select>
          </label>
          <label>
            入口面
            <select
              aria-label="过滤入口面"
              value={filterSurface}
              onChange={(e) => setFilterSurface(e.target.value)}
            >
              <option value="">全部</option>
              {Object.entries(SURFACE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            平台
            <select
              aria-label="过滤平台"
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
            >
              <option value="">全部</option>
              <option value="meituan">meituan</option>
              <option value="douyin">douyin</option>
              <option value="saabei">saabei</option>
              <option value="external">external</option>
            </select>
          </label>
          <label>
            事件
            <select
              aria-label="过滤事件"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
            >
              <option value="">全部</option>
              {Object.keys(EVENT_LABEL).map((k) => (
                <option key={k} value={k}>
                  {EVENT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <Button loading={diyLoading} onClick={() => void runDiy()}>
            查询
          </Button>
          <Button tone="secondary" loading={interpretLoading} onClick={() => void runInterpret()}>
            AI 解读（只读痕迹）
          </Button>
        </div>
        <div className={styles.diyRow}>
          <label className={styles.grow}>
            视图名
            <input
              aria-label="保存视图名称"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="例如：比价跳转周报"
              maxLength={120}
            />
          </label>
          <Button tone="secondary" onClick={() => void saveCurrentView()}>
            保存当前 DIY
          </Button>
        </div>
        {saveNote ? (
          <p className={styles.hint} role="status">
            {saveNote}
          </p>
        ) : null}
        {savedViews.length ? (
          <ul className={styles.savedList}>
            {savedViews.map((view) => (
              <li key={view.id}>
                <button type="button" className={styles.savedLink} onClick={() => applySaved(view)}>
                  {view.name}
                  <span>
                    {view.days}d · {view.groupBy}
                  </span>
                </button>
                <Button tone="secondary" onClick={() => void removeView(view.id)}>
                  删除
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>尚未保存 DIY 视图。</p>
        )}
        {diy ? (
          <>
            <p className={styles.hint}>{diy.disclaimer}</p>
            <BucketList
              rows={diy.rows}
              labelOf={(k) =>
                groupBy === 'surface'
                  ? (SURFACE_LABEL[k] ?? k)
                  : groupBy === 'event_code'
                    ? (EVENT_LABEL[k] ?? k)
                    : groupBy === 'module_key'
                      ? (MODULE_LABEL[k] ?? k)
                      : k
              }
            />
          </>
        ) : null}
        {interpret ? (
          <div className={styles.interpretBox}>
            <h3>解读结果</h3>
            <p className={styles.hint}>{interpret.disclaimer}</p>
            <p className={styles.hint}>
              较上一窗：访问 Δ{interpret.comparedToPriorWindow.visitsDelta} · 跳转 Δ
              {interpret.comparedToPriorWindow.jumpsDelta}
            </p>
            <ul className={styles.insights}>
              {interpret.insights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>按模块名</h2>
          <p className={styles.hint}>看板标题跟租户入口模块走；无模块名归入「未命名模块」。</p>
          <BucketList rows={data.byModule} labelOf={(k) => MODULE_LABEL[k] ?? k} />
        </section>
        <section className={styles.panel}>
          <h2>按入口面</h2>
          <BucketList rows={data.bySurface} labelOf={(k) => SURFACE_LABEL[k] ?? k} />
        </section>
        <section className={styles.panel}>
          <h2>按事件</h2>
          <BucketList rows={data.byEventCode} labelOf={(k) => EVENT_LABEL[k] ?? k} />
        </section>
        <section className={styles.panel}>
          <h2>跳转目标平台</h2>
          <p className={styles.hint}>仅 jump / jump_confirm；统计到跳转为止。</p>
          <BucketList rows={data.byTargetPlatform} labelOf={(k) => k} />
        </section>
      </div>
    </main>
  );
}

function BucketList({ rows, labelOf }: { rows: Bucket[]; labelOf: (key: string) => string }) {
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

function renderBuckets(rows: Bucket[], labelOf: (key: string) => string) {
  if (!rows.length)
    return (
      <>
        <p className={styles.barEmpty}>当前窗口暂无痕迹分布。</p>
        <p className={styles.barEmpty}>暂无记录</p>
      </>
    );
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <ul className={styles.bars}>
      {rows.map((row) => (
        <li className={styles.barRow} key={row.key}>
          <span className={styles.barLabel}>{labelOf(row.key)}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: barWidth(total, row.count) }} />
          </span>
          <span className={styles.barValue}>{row.count}</span>
        </li>
      ))}
    </ul>
  );
}
