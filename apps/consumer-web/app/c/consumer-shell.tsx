import type { ReactNode } from 'react';
import styles from './consumer-shell.module.css';

export type ConsumerContext = {
  tenant: string;
  storeId: string;
  source?: string | null;
  scene?: string | null;
  shareCode?: string | null;
};

export type ConsumerTab = 'home' | 'group-buy' | 'menu' | 'membership' | 'profile';

const tabs: { key: ConsumerTab; label: string; icon: string; path: string }[] = [
  { key: 'home', label: '首页', icon: '⌂', path: '' },
  { key: 'group-buy', label: '团购', icon: '券', path: '/group-buy' },
  { key: 'menu', label: '菜单', icon: '单', path: '/menu' },
  { key: 'membership', label: '会员', icon: '会', path: '/membership' },
  { key: 'profile', label: '我的', icon: '我', path: '/profile' },
];

export function consumerQuery(context: ConsumerContext, scene?: string) {
  const params = new URLSearchParams({
    tenant: context.tenant,
    source: context.source ?? 'consumer:storefront',
    scene: scene ?? context.scene ?? 'consumer_storefront',
  });
  if (context.shareCode) params.set('shareCode', context.shareCode);
  return params;
}

export function storeHref(context: ConsumerContext, path = '', scene?: string) {
  return `/c/stores/${context.storeId}${path}?${consumerQuery(context, scene).toString()}`;
}

export function ConsumerShell({
  context,
  active,
  children,
}: {
  context: ConsumerContext;
  active: ConsumerTab;
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <nav className={styles.bottomNav} aria-label="门店主导航">
        {tabs.map((tab) => (
          <a
            className={tab.key === active ? styles.active : undefined}
            href={storeHref(context, tab.path, `tab_${tab.key}`)}
            key={tab.key}
          >
            <i aria-hidden="true">{tab.icon}</i>
            <span>{tab.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
