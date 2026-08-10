'use client';

import type { ConsumerNavTab } from './types.js';

function renderTabs(
  tabs: ConsumerNavTab[],
  active: string,
  hrefOf: (tab: ConsumerNavTab) => string,
) {
  return tabs.map((tab) => (
    <a
      className={tab.key === active ? 'od-consumer-nav__link od-consumer-nav__link--active' : 'od-consumer-nav__link'}
      href={hrefOf(tab)}
      aria-current={tab.key === active ? 'page' : undefined}
      key={`${tab.key}:${tab.path}`}
    >
      <i aria-hidden="true">{tab.icon}</i>
      <span>{tab.label}</span>
    </a>
  ));
}

/**
 * Shared Consumer navigation chrome (mobile bottom tabs + desktop top bar).
 * Driven entirely by the `--od-sf-nav-*` storefront tokens so the Consumer
 * chrome and Storefront modules draw from ONE design-token palette, and E/M/P
 * admin shells share the same token system via `@oneday/ui`.
 */
export function ConsumerStorefrontNav({
  tabs,
  active,
  hrefOf,
  ariaLabelMobile = '门店主导航',
  ariaLabelDesktop = '门店桌面主导航',
}: {
  tabs: ConsumerNavTab[];
  active: string;
  hrefOf: (tab: ConsumerNavTab) => string;
  ariaLabelMobile?: string;
  ariaLabelDesktop?: string;
}) {
  return (
    <>
      <nav className="od-consumer-nav od-consumer-nav--desktop" aria-label={ariaLabelDesktop}>
        {renderTabs(tabs, active, hrefOf)}
      </nav>
      <nav className="od-consumer-nav od-consumer-nav--bottom" aria-label={ariaLabelMobile}>
        {renderTabs(tabs, active, hrefOf)}
      </nav>
    </>
  );
}
