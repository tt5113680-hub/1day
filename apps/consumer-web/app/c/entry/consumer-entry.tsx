import { AppStatePanel, Button } from '@oneday/ui';
import { FunnelPageBeacon } from '../funnel-page-beacon';
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
export default function ConsumerEntry({ entry }: { entry: Entry }) {
  const hero = object(entry.modules.find((item) => item.module_type === 'hero')?.config);
  const content = entry.modules
    .filter((item) => item.module_type === 'content')
    .flatMap((item) => cards(object(item.config).cards));
  const title = text(hero.title) || entry.tenant.name,
    summary = text(hero.summary) || '统一入口：发现门店、商圈与第三方服务；成交在外部平台完成。';
  const entryUrl = `/c/entry?tenant=${encodeURIComponent(entry.tenant.slug)}`;
  const actionUrl = (action: ConsumerAction) =>
    `/c/actions/${action.id}?tenant=${encodeURIComponent(entry.tenant.slug)}&source=consumer:entry&scene=entry_shortcut&returnTo=${encodeURIComponent(entryUrl)}`;
  const primary = entry.actions.find((item) => item.name.includes('咨询')) ?? entry.actions[0];
  if (!entry.template) return <EntryState kind="empty" />;
  return (
    <main id="top" className={styles.page}>
      <FunnelPageBeacon
        tenantSlug={entry.tenant.slug}
        surface="entry"
        moduleKey="consumer_entry"
        scene="entry"
      />
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.topbar}>
            <span className={styles.brand}>
              <span className={styles.brandMark}>O</span>
              {entry.tenant.name}
            </span>
            <span className={styles.status}>推广员入口</span>
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>统一入口 · 统一分流</p>
            <h1>{title}</h1>
            <p>{summary}</p>
            <span className={styles.heroBadge}>
              门店信息与外链以商家配置为准；确认跳转后只统计至出站
            </span>
          </div>
        </section>
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
                <span className={styles.icon}>店</span>
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
                <span className={styles.icon}>圈</span>
                <span>
                  <strong>商圈联盟</strong>
                  <span>进圈找店 · 互助引流</span>
                </span>
                <b className={styles.arrow}>›</b>
              </a>
              {entry.actions.map((action) => (
                <a className={styles.recommendation} key={action.id} href={actionUrl(action)}>
                  <span className={styles.icon}>{iconFor(action)}</span>
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
