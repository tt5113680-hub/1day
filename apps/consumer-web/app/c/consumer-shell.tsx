import type { ReactNode } from 'react';
import { ConsumerStorefrontNav } from '@oneday/storefront-renderer';
import '@oneday/storefront-renderer/storefront.css';
import { MobileShell } from '@oneday/ui';
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
  return (
    <MobileShell>
      <ConsumerStorefrontNav
        tabs={navTabs}
        active={active}
        hrefOf={(tab) => storeHref(context, tab.path, `tab_${tab.key}`)}
      />
      {children}
    </MobileShell>
  );
}
