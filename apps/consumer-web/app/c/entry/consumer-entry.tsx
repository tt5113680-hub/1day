import { AppStatePanel, Button } from '@oneday/ui';
import { FunnelPageBeacon } from '../funnel-page-beacon';
import '@oneday/storefront-renderer/storefront.css';
import styles from './consumer-entry.module.css';

export type ConsumerAction = {
  id: string;
  code: string;
  name: string;
  actionType: string;
  targetUrl: string | null;
  miniProgramAppId: string | null;
  miniProgramPath: string | null;
  platform: string | null;
};
export type ConsumerModule = { id: string; module_type: string; position: number; config: unknown };
type Entry = {
  tenant: { slug: string; name: string };
  template: { id: string; code: string; name: string } | null;
  modules: ConsumerModule[];
  actions: ConsumerAction[];
};
type Card = { title: string; description: string; tag?: string };
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === 'string' ? value : '');
const cards = (value: unknown): Card[] =>
  Array.isArray(value)
    ? value
        .map(object)
        .map((item) => ({
          title: text(item.title),
          description: text(item.description),
          tag: text(item.tag),
        }))
        .filter((item) => item.title && item.description)
        .slice(0, 6)
    : [];
export function EntryState({ kind }: { kind: 'empty' | 'forbidden' | 'error' }) {
  const copy: readonly [string, string] = (
    {
      empty: ['暂未开放入口', '商家正在准备服务内容，请稍后再试。'],
      forbidden: ['此入口暂不可用', '请确认场景链接，或联系商家获取可访问入口。'],
      error: ['加载遇到问题', '网络连接暂不可用，请检查后重新加载。'],
    } as const
  )[kind];
  return (
    <main className={styles.message}>
      <AppStatePanel
        kind={kind}
        title={copy[0]}
        description={copy[1]}
        action={
          kind === 'error' ? (
            <Button onClick={() => window.location.reload()}>重新加载</Button>
          ) : undefined
        }
      />
    </main>
  );
}
const iconFor = (action: ConsumerAction) =>
  action.platform === 'meituan'
    ? '团'
    : action.platform === 'douyin'
      ? '抖'
      : action.platform === 'saabei'
        ? '扫'
        : action.name.includes('咨询')
          ? '问'
          : '享';
const platformLabel = (platform: string | null) =>
  platform === 'meituan'
    ? '美团'
    : platform === 'douyin'
      ? '抖音'
      : platform === 'saabei'
        ? '扫呗平台'
        : '外链';
const entryTypeLabel = (actionType: string) =>
  actionType === 'consultation'
    ? '咨询跟进'
    : actionType === 'platform_entry'
      ? '平台入口'
      : '外链服务';
const landingLabel = (platform: string | null) =>
  platform === 'meituan'
    ? '美团团购'
    : platform === 'douyin'
      ? '抖音团购'
      : platform === 'saabei'
        ? '扫呗入口'
        : '直接外链';
const countBy = (rows: string[]) => {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    buckets.set(row, (buckets.get(row) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};
const barWidth = (total: number, value: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);
export default function ConsumerEntry({ entry }: { entry: Entry }) {
  const hero = object(entry.modules.find((item) => item.module_type === 'hero')?.config);
  const content = entry.modules
    .filter((item) => item.module_type === 'content')
    .flatMap((item) => cards(object(item.config).cards));
  const title = text(hero.title) || entry.tenant.name,
    summary =
      text(hero.summary) ||
      '统一入口：发现门店、商圈与第三方服务；成交在美团/抖音/扫呗等外部平台完成。';
  const entryUrl = `/c/entry?tenant=${encodeURIComponent(entry.tenant.slug)}`;
  const actionUrl = (action: ConsumerAction) =>
    `/c/actions/${action.id}?tenant=${encodeURIComponent(entry.tenant.slug)}&source=consumer:entry&scene=entry_shortcut&returnTo=${encodeURIComponent(entryUrl)}`;
  const primary = entry.actions.find((item) => item.name.includes('咨询')) ?? entry.actions[0];
  const platformDist = countBy(entry.actions.map((action) => platformLabel(action.platform)));
  const typeDist = countBy(entry.actions.map((action) => entryTypeLabel(action.actionType)));
  const landingDist = countBy(entry.actions.map((action) => landingLabel(action.platform)));
  const actionCount = entry.actions.length;
  if (!entry.template) return <EntryState kind="empty" />;
  return (
    <main id="top" className={`${styles.page} od-sf-theme`}>
      <FunnelPageBeacon
        tenantSlug={entry.tenant.slug}
        surface="entry"
        moduleKey="consumer_entry"
        scene="entry"
      />
      <div className={styles.shell}>
        <h1 className={styles.visuallyHidden}>{title}</h1>
        <header className={styles.topBar}>
          <a
            className={styles.backLink}
            href={`/c/discovery?tenant=${encodeURIComponent(entry.tenant.slug)}`}
            aria-label="返回发现"
          >
            ‹
          </a>
          <span className={styles.topTitle}>统一入口</span>
          <span className={styles.topMark}>推广员工具</span>
        </header>

        <section className={styles.heroCard} aria-label="统一入口概况">
          <header className={styles.heroHead}>
            <span>{entry.tenant.name} · 推广员工具 · 统一分流</span>
            <h2>{title}</h2>
            <p role="note">{summary}</p>
          </header>
          <div className={styles.summaryStrip} aria-label="入口数据概况">
            <dl>
              <dt>快捷入口</dt>
              <dd>{actionCount}</dd>
            </dl>
            <dl>
              <dt>覆盖平台</dt>
              <dd>{platformDist.length}</dd>
            </dl>
            <dl>
              <dt>入口分流</dt>
              <dd>统一</dd>
            </dl>
          </div>
        </section>

        <section className={styles.distribution} aria-label="统一入口分布">
          <header className={styles.panelHead}>
            <h3>统一入口分布</h3>
            <p>分布由商家已配置入口档案行现场推导 · 仅统计观看/跳转，不涉及成交</p>
          </header>
          <div className={styles.panelBlock}>
            <span className={styles.barLabel}>平台入口分布</span>
            <div className={styles.bars} role="list">
              {platformDist.length ? (
                platformDist.map((bar) => (
                  <div className={styles.barRow} role="listitem" key={bar.label}>
                    <span>{bar.label}</span>
                    <b>
                      <i style={{ width: `${barWidth(actionCount, bar.value)}%` }} />
                    </b>
                    <em>{bar.value}</em>
                  </div>
                ))
              ) : (
                <span className={styles.barEmpty}>暂无记录</span>
              )}
            </div>
          </div>
          <div className={styles.panelBlock}>
            <span className={styles.barLabel}>入口类型分布</span>
            <div className={styles.bars} role="list">
              {typeDist.length ? (
                typeDist.map((bar) => (
                  <div className={styles.barRow} role="listitem" key={bar.label}>
                    <span>{bar.label}</span>
                    <b>
                      <i style={{ width: `${barWidth(actionCount, bar.value)}%` }} />
                    </b>
                    <em>{bar.value}</em>
                  </div>
                ))
              ) : (
                <span className={styles.barEmpty}>暂无记录</span>
              )}
            </div>
          </div>
          <div className={styles.panelBlock}>
            <span className={styles.barLabel}>落地方案分布</span>
            <div className={styles.bars} role="list">
              {landingDist.length ? (
                landingDist.map((bar) => (
                  <div className={styles.barRow} role="listitem" key={bar.label}>
                    <span>{bar.label}</span>
                    <b>
                      <i style={{ width: `${barWidth(actionCount, bar.value)}%` }} />
                    </b>
                    <em>{bar.value}</em>
                  </div>
                ))
              ) : (
                <span className={styles.barEmpty}>暂无记录</span>
              )}
            </div>
          </div>
        </section>

        <p className={styles.honest} role="note">
          以上分布全部由商家已配置入口档案行现场推导，源
          source=local；成交在美团/抖音/扫呗等外部平台完成；
          仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额。非本平台下单。不在此下单。
        </p>

        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="shortcuts">
            <div className={styles.sectionHead}>
              <h2 id="shortcuts">快捷入口</h2>
              <p className={styles.sectionHint}>只展示当前可用的真实服务</p>
            </div>
            <div className={styles.recommendations}>
              <a
                className={styles.recommendation}
                href={`/c/discovery?tenant=${encodeURIComponent(entry.tenant.slug)}`}
              >
                <span className={`${styles.icon} ${styles.iconNeutral}`}>店</span>
                <span>
                  <strong>发现门店</strong>
                  <span>附近与公开引流商家</span>
                </span>
                <b className={styles.arrow}>›</b>
              </a>
              <a
                className={styles.recommendation}
                href={`/c/circles?tenant=${encodeURIComponent(entry.tenant.slug)}`}
              >
                <span className={`${styles.icon} ${styles.iconNeutral}`}>圈</span>
                <span>
                  <strong>商圈联盟</strong>
                  <span>进圈找店 · 互助引流</span>
                </span>
                <b className={styles.arrow}>›</b>
              </a>
              {entry.actions.map((action) => (
                <a className={styles.recommendation} key={action.id} href={actionUrl(action)}>
                  <span
                    className={`${styles.icon} ${styles[`platform${action.platform ?? 'external'}`]}`}
                  >
                    {iconFor(action)}
                  </span>
                  <span>
                    <strong>{action.name}</strong>
                    <span>
                      {action.platform === 'meituan'
                        ? '美团入口（经确认页跳转）'
                        : action.platform === 'douyin'
                          ? '抖音入口（经确认页跳转）'
                          : action.platform === 'saabei'
                            ? '扫呗入口（经确认页跳转）'
                            : '打开商家已配置服务（经确认页）'}
                    </span>
                  </span>
                  <b className={styles.arrow}>›</b>
                </a>
              ))}
            </div>
          </section>
          {content.length > 0 && (
            <section className={styles.section} aria-labelledby="services">
              <div className={styles.sectionHead}>
                <h2 id="services">服务与权益</h2>
                <p className={styles.sectionHint}>以商家发布为准</p>
              </div>
              <div className={styles.cards}>
                {content.map((item, index) => (
                  <article className={styles.card} key={`${item.title}-${index}`}>
                    {item.tag && <span className={styles.cardTag}>{item.tag}</span>}
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </article>
                ))}
              </div>
            </section>
          )}
          <section className={styles.section} aria-labelledby="actions">
            <div className={styles.sectionHead}>
              <h2 id="actions">立即行动</h2>
              <p className={styles.sectionHint}>先经确认页记录跳转，再前往第三方</p>
            </div>
            <div className={styles.actions}>
              {primary ? (
                <a className={`${styles.action} ${styles.actionPrimary}`} href={actionUrl(primary)}>
                  {primary.name}
                  <span>→</span>
                </a>
              ) : (
                <p className={styles.sectionHint}>商家暂未配置可用行动入口。</p>
              )}
            </div>
          </section>
        </div>
      </div>
      <nav className={styles.bottom} aria-label="消费者导航">
        <div className={styles.bottomInner}>
          <a
            aria-label="首页"
            className={`${styles.navButton} ${styles.navButtonActive}`}
            href="#top"
          >
            <span className={styles.navIcon}>⌂</span>首页
          </a>
          <a
            aria-label="发现"
            className={styles.navButton}
            href={`/c/discovery?tenant=${encodeURIComponent(entry.tenant.slug)}`}
          >
            <span className={styles.navIcon}>⌕</span>发现
          </a>
          {primary && (
            <a aria-label="咨询" className={styles.navButton} href={actionUrl(primary)}>
              <span className={styles.navIcon}>◉</span>咨询
            </a>
          )}
        </div>
      </nav>
    </main>
  );
}
