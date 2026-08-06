'use client';

import { useState } from 'react';
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
const string = (value: unknown) => (typeof value === 'string' ? value : '');
const cards = (value: unknown): Card[] =>
  Array.isArray(value)
    ? value
        .map(object)
        .map((item) => ({
          title: string(item.title),
          description: string(item.description),
          tag: string(item.tag),
        }))
        .filter((item) => item.title && item.description)
        .slice(0, 6)
    : [];
const navigation: Array<[string, string]> = [
  ['首页', '⌂'],
  ['发现', '◈'],
  ['权益', '◇'],
  ['咨询', '◌'],
];

export function EntryState({ kind }: { kind: 'empty' | 'forbidden' | 'error' }) {
  const copy = {
    empty: ['暂未开放入口', '商家正在准备服务内容，请稍后再试。', '◌'],
    forbidden: ['此入口暂不可用', '请确认场景链接或联系商家获取可访问入口。', '⌁'],
    error: ['加载遇到问题', '网络连接不稳定，请检查后重新加载。', '↻'],
  }[kind];
  return (
    <main className={styles.message}>
      <section className={styles.messageCard}>
        <div className={styles.emptyIcon}>{copy[2]}</div>
        <h1>{copy[0]}</h1>
        <p>{copy[1]}</p>
        {kind === 'error' && (
          <button className={styles.retry} onClick={() => window.location.reload()}>
            重新加载
          </button>
        )}
      </section>
    </main>
  );
}

export default function ConsumerEntry({ entry }: { entry: Entry }) {
  const [active, setActive] = useState('首页');
  const hero = object(entry.modules.find((item) => item.module_type === 'hero')?.config);
  const content = entry.modules
    .filter((item) => item.module_type === 'content')
    .flatMap((item) => cards(object(item.config).cards));
  const recommendations = entry.modules
    .filter((item) => item.module_type === 'action_grid')
    .flatMap((item) => cards(object(item.config).recommendations));
  const title = string(hero.title) || entry.tenant.name;
  const scene = string(hero.sceneLabel) || '为你准备的专属入口';
  const summary = string(hero.summary) || '查看商家已发布的服务、权益和咨询方式。';
  const benefit = string(hero.benefit) || '服务内容由商家实时配置';
  const primary =
    entry.actions.find((item) => item.code.includes('consult') || item.name.includes('咨询')) ??
    entry.actions[0];
  if (!entry.template)
    return (
      <main className={styles.empty}>
        <section className={styles.emptyCard}>
          <div className={styles.emptyIcon}>◌</div>
          <h1>商家正在准备内容</h1>
          <p>{entry.tenant.name} 暂未发布消费者入口，请稍后再来看看。</p>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.topbar}>
            <span className={styles.brand}>
              <span className={styles.brandMark}>O</span>
              {entry.tenant.name}
            </span>
            <span className={styles.status}>已为你匹配</span>
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{scene}</p>
            <h1>{title}</h1>
            <p>{summary}</p>
            <span className={styles.heroBadge}>✦ {benefit}</span>
          </div>
        </section>
        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="recommendations">
            <div className={styles.sectionHead}>
              <h2 id="recommendations">AI 为你推荐</h2>
              <p className={styles.sectionHint}>基于当前场景</p>
            </div>
            <div className={styles.recommendations}>
              {recommendations.length ? (
                recommendations.map((item, index) => (
                  <button
                    key={`${item.title}-${index}`}
                    className={styles.recommendation}
                    type="button"
                    onClick={() => setActive('发现')}
                  >
                    <span className={styles.icon}>{['✦', '◈', '⌁'][index % 3]}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </span>
                    <span className={styles.arrow}>›</span>
                  </button>
                ))
              ) : (
                <p className={styles.sectionHint}>商家尚未配置推荐内容。</p>
              )}
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
              <p className={styles.sectionHint}>安全跳转至商家配置入口</p>
            </div>
            <div className={styles.actions}>
              {entry.actions.length ? (
                entry.actions.map((action) => (
                  <a
                    key={action.id}
                    className={`${styles.action} ${action.id === primary?.id ? styles.actionPrimary : ''}`}
                    href={action.targetUrl ?? '#'}
                    target={action.targetUrl ? '_blank' : undefined}
                    rel={action.targetUrl ? 'noreferrer' : undefined}
                    aria-label={`打开${action.name}`}
                  >
                    {action.name}
                    <span>›</span>
                  </a>
                ))
              ) : (
                <p className={styles.sectionHint}>暂未配置咨询或行动入口。</p>
              )}
            </div>
          </section>
        </div>
      </div>
      <nav className={styles.bottom} aria-label="消费者入口导航">
        <div className={styles.bottomInner}>
          {navigation.map(([name, icon]) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              className={`${styles.navButton} ${active === name ? styles.navButtonActive : ''}`}
              onClick={() => setActive(name)}
            >
              <span className={styles.navIcon}>{icon}</span>
              {name}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
