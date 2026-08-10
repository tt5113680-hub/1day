import type { ReactNode } from 'react';
import { MobileShell } from '@oneday/ui';
import styles from './consumer-shell.module.css';
import {
  FALLBACK_CONSUMER_TABS,
  resolveConsumerTabs,
  type ConsumerNavTab,
} from './resolve-consumer-tabs';

export type ConsumerContext = {
  tenant: string;
  storeId: string;
  source?: string | null;
  scene?: string | null;
  shareCode?: string | null;
};

export type ConsumerTab = 'home' | 'group-buy' | 'menu' | 'membership' | 'profile' | string;
export type { ConsumerNavTab };
export { resolveConsumerTabs, FALLBACK_CONSUMER_TABS };

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
  tabs,
}: {
  context: ConsumerContext;
  active: ConsumerTab;
  children: ReactNode;
  tabs?: ConsumerNavTab[];
}) {
  const navTabs = tabs?.length ? tabs : FALLBACK_CONSUMER_TABS;
  const navigation = (className: string | undefined, label: string) => (
    <nav className={className} aria-label={label}>
      {navTabs.map((tab) => (
        <a
          className={tab.key === active ? styles.active : undefined}
          href={storeHref(context, tab.path, `tab_${tab.key}`)}
          key={`${tab.key}:${tab.path}`}
        >
          <i aria-hidden="true">{tab.icon}</i>
          <span>{tab.label}</span>
        </a>
      ))}
    </nav>
  );
  return (
    <MobileShell>
      {navigation(styles.desktopNav, '门店桌面主导航')}
      {children}
      {navigation(styles.bottomNav, '门店主导航')}
    </MobileShell>
  );
}
