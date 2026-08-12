'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, businessLabel } from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlatformProductHome } from '../../platform-product-home';
import styles from './page.module.css';

type Metric = { tenants: number; channels: number; activeTenants: number; pendingEvents: number };
type Risk = { type: string; count: number };
type TenantRow = { status: string; plan: string; riskLevel: string };
type ChannelRow = { platform: string; status: string };
type OutboxRow = { eventType: string; aggregateType: string; attempts: number; tenantId: string };
type SignalRow = { key: string; count: number };
type Data = {
  metrics: Metric;
  risks: Risk[];
  tenants: TenantRow[];
  channels: ChannelRow[];
  outbox: OutboxRow[];
  signals: SignalRow[];
  system: { database: string; checkedAt: string; databaseName: string };
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const PLATFORM_SHORTCUTS = [
  { href: '/p/tenants', label: '租户', desc: '租户治理' },
  { href: '/p/tenants/new', label: '开通', desc: '开通租户' },
  { href: '/p/channels', label: '渠道', desc: '渠道运营' },
  { href: '/p/agents', label: '代理', desc: '代理管理' },
  { href: '/p/business-circles', label: '商圈', desc: '商圈集合' },
  { href: '/p/templates', label: '模板', desc: '模板目录' },
  { href: '/p/security-audit', label: '审计', desc: '安全审计' },
  { href: '/p/outbox', label: '事件', desc: 'Outbox 死信' },
] as const;

const SHORTCUT_ICONS: Record<string, string> = {
  租户: '租',
  开通: '开',
  渠道: '渠',
  代理: '代',
  商圈: '圈',
  模板: '模',
  审计: '审',
  事件: '件',
};

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const tenantStatusLabel = (status: string) => (status === 'active' ? '开通中' : '已暂停');
const planLabel = (plan: string) =>
  ({ starter: '起步版', growth: '成长版', enterprise: '企业版' })[plan] ?? plan;
const riskLevelLabel = (risk: string) => ({ low: '低', medium: '中', high: '高' })[risk] ?? risk;
const eventLabel = (key: string) =>
  ({
    impression: '观看（曝光）',
    visit: '访问（进页）',
    jump: '跳转（出站）',
    dwell: '停留',
    share: '分享发出',
    share_open: '分享打开',
    jump_confirm: '跳转确认',
    consult_click: '咨询点击',
    module_impression: '模块曝光',
  })[key] ?? key;
const attemptBuckets = (n: number) =>
  n <= 1 ? '首次失败 1' : n <= 5 ? '多次重试 2-5' : '已达上限 6+';

export default function PlatformDashboard() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/dashboard`, {
        headers: {},
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);

  const tenantStatusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.tenants ?? []) {
      const key = tenantStatusLabel(row.status);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [data]);
  const planCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.tenants ?? []) {
      const key = planLabel(row.plan);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [data]);
  const riskLevelCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.tenants ?? []) {
      const key = riskLevelLabel(row.riskLevel);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [data]);
  const channelPlatformCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.channels ?? []) {
      const key = businessLabel(row.platform);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [data]);
  const signalCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.signals ?? []) {
      const key = eventLabel(row.key);
      map.set(key, (map.get(key) ?? 0) + row.count);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [data]);
  const outboxEventCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.outbox ?? []) {
      const key = row.eventType || '未分类';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [data]);
  const outboxAttemptsCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.outbox ?? []) {
      const key = attemptBuckets(row.attempts ?? 0);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [data]);

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载平台经营信号"
          description="正在连接租户、渠道和安全数据。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看平台总览"
          description="请使用平台运营账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="平台总览暂不可用"
          description="请检查网络后重新加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data)
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="empty"
          title="暂无平台数据"
          description="请先完成租户开通或刷新数据。"
        />
      </main>
    );
  const metricCards = [
    { label: '活跃租户', value: data.metrics.tenants, hint: '已开通租户' },
    { label: '已接入渠道', value: data.metrics.channels, hint: '渠道网络' },
    { label: '30 天活跃租户', value: data.metrics.activeTenants, hint: '近 30 天活跃' },
    { label: '待投递事件', value: data.metrics.pendingEvents, hint: 'Outbox 队列' },
  ] as const;
  const signalTotal = signalCounts.reduce((acc, b) => acc + b.value, 0);
  const channelTotal = data.channels.length;
  const outboxTotal = data.outbox.length;
  return (
    <main className={styles.page} data-testid="platform-dashboard">
      <PlatformProductHome mode="platform" />

      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 平台总览</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="平台总览">
        <h1>跨租户入口信号与系统状态</h1>
        <p>
          仅平台专用权限可查看；指标来自真实租户、渠道、入口痕迹与待投递事件。不含本平台收款与第三方订单履约。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="平台概况">
        <div>
          <span>租户</span>
          <strong>{data.tenants.length}</strong>
        </div>
        <div>
          <span>渠道</span>
          <strong>{data.channels.length}</strong>
        </div>
        <div>
          <span>30 天入口痕迹</span>
          <strong>{signalTotal}</strong>
        </div>
        <div>
          <span>Outbox 死信</span>
          <strong>{outboxTotal}</strong>
        </div>
      </section>

      <section className={styles.panel} aria-label="常用功能">
        <div className={styles.panelHead}>
          <h2>常用功能</h2>
          <span className={styles.panelMeta}>平台治理快捷入口</span>
        </div>
        <div className={styles.functions}>
          {PLATFORM_SHORTCUTS.map((item) => (
            <a className={styles.function} href={item.href} key={item.href}>
              <span className={styles.functionIcon} aria-hidden>
                {SHORTCUT_ICONS[item.label] ?? '·'}
              </span>
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.distribution} aria-label="平台运营分布">
        <div className={styles.panelBlock}>
          <h2>租户状态分布</h2>
          <ul className={styles.bars}>
            {tenantStatusCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(data.tenants.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.tenants.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>套餐分布</h2>
          <ul className={styles.bars}>
            {planCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(data.tenants.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.tenants.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>风险等级分布</h2>
          <ul className={styles.bars}>
            {riskLevelCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(data.tenants.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.tenants.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>渠道平台分布</h2>
          <ul className={styles.bars}>
            {channelPlatformCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(channelTotal, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!channelTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>入口痕迹分布</h2>
          <ul className={styles.bars}>
            {signalCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(signalTotal, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!signalTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>Outbox 死信状态分布</h2>
          <ul className={styles.bars}>
            {outboxEventCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(outboxTotal, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!outboxTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>死信重试分布</h2>
          <ul className={styles.bars}>
            {outboxAttemptsCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(outboxTotal, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!outboxTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取平台档案行现场推导（source=local）：租户状态、套餐、风险等级由真实租户行映射；
        渠道平台由真实 external_actions 行经 businessLabel 映射；入口痕迹仅
        L0–L2（观看/访问/跳转/停留/分享等）； Outbox
        死信按真实待投递事件行统计。不含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据。
      </p>

      <section className={styles.panel} aria-label="平台指标">
        <div className={styles.panelHead}>
          <h2>平台指标</h2>
        </div>
        <div className={styles.metrics}>
          {metricCards.map((item) => (
            <article className={styles.metric} key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel} aria-label="风险队列">
          <div className={styles.panelHead}>
            <h2>风险队列</h2>
          </div>
          {data.risks.length ? (
            data.risks.map((risk) => (
              <p className={styles.riskRow} key={risk.type}>
                <b>{risk.count}</b> · {businessLabel(risk.type)}
              </p>
            ))
          ) : (
            <p className={styles.empty}>当前没有可归类的平台风险。</p>
          )}
        </section>
        <section className={styles.panel} aria-label="系统状态">
          <div className={styles.panelHead}>
            <h2>系统状态</h2>
          </div>
          <p className={styles.systemRow}>
            <b>{data.system.database}</b> · PostgreSQL 已连接
          </p>
          <p className={styles.systemRow}>数据库：{data.system.databaseName}</p>
          <p className={styles.systemRow}>
            检查时间：{new Date(data.system.checkedAt).toLocaleString()}
          </p>
        </section>
      </div>
    </main>
  );
}
