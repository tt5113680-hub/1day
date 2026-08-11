'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, businessLabel } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import { PlatformProductHome } from '../../platform-product-home';
import styles from './page.module.css';

type Data = {
  metrics: { tenants: number; channels: number; activeTenants: number; pendingEvents: number };
  risks: { type: string; count: number }[];
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
  return (
    <main className={styles.page}>
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
          仅平台专用权限可查看；指标来自真实租户、渠道、任务与事件。不含本平台收款与第三方订单履约。
        </p>
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
