'use client';

import { useEffect, useState } from 'react';
import {
  PLATFORM_PRODUCT_HOMES,
  resolvePlatformShellAccess,
  type MenuItemDto,
  type MenuProductLink,
  type MenuScopeDto,
} from '@oneday/contracts';
import { SessionApiClient } from '@oneday/session-client';
import styles from './platform-product-home.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

type Mode = 'platform' | 'channel' | 'circle';

export function PlatformProductHome({ mode }: { mode: Mode }) {
  const meta = PLATFORM_PRODUCT_HOMES[mode];
  const [context, setContext] = useState(meta.description);
  const [scopes, setScopes] = useState<MenuScopeDto[]>([]);
  const [items, setItems] = useState<MenuItemDto[]>([]);
  const [availableProducts, setAvailableProducts] = useState<MenuProductLink[]>([]);
  const [boundary, setBoundary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) return;
        const response = await sessionApi.request(`${api}/api/v1/me/menu?product=${mode}`);
        if (!response.ok) return;
        const payload = (await response.json()).data as {
          context?: string;
          scopes?: MenuScopeDto[];
          items?: MenuItemDto[];
          availableProducts?: MenuProductLink[];
          permissionCodes?: string[];
        };
        if (cancelled) return;
        if (payload.context) setContext(payload.context);
        if (payload.scopes?.length) setScopes(payload.scopes);
        if (payload.items?.length) setItems(payload.items);
        if (payload.availableProducts?.length) setAvailableProducts(payload.availableProducts);
        if (payload.permissionCodes?.length) {
          const access = resolvePlatformShellAccess(payload.permissionCodes);
          if (!access.allowed.includes('platform')) {
            setBoundary(
              mode === 'channel'
                ? '当前账号为渠道经营范围，不含平台租户开通/冻结治理。'
                : mode === 'circle'
                  ? '当前账号为商圈经营范围，不含平台租户生命周期治理。'
                  : null,
            );
          } else {
            setBoundary(null);
          }
        }
      } catch {
        // Role home remains readable from static product meta.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const shellModes = availableProducts.filter((link) =>
    ['platform', 'channel', 'circle'].includes(link.product),
  );

  return (
    <section className={styles.home} aria-label={`${meta.label}角色首页`}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>角色工作区 · {meta.label}</p>
        <h2>{meta.label}首页</h2>
        <p>{context}</p>
        {boundary ? <p className={styles.boundary}>{boundary}</p> : null}
      </div>
      {shellModes.length > 1 ? (
        <nav className={styles.switcher} aria-label="产品工作区切换">
          {shellModes.map((link) => (
            <a
              aria-current={link.product === mode ? 'page' : undefined}
              className={link.product === mode ? styles.switcherActive : undefined}
              href={link.homeHref}
              key={link.product}
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
      {scopes.length ? (
        <ul className={styles.scopes} aria-label="授权范围">
          {scopes.map((scope) => (
            <li key={`${scope.type}:${scope.id}`}>
              <span>{scope.type}</span>
              {scope.label}
            </li>
          ))}
        </ul>
      ) : null}
      {items.length ? (
        <div className={styles.actions} aria-label="本工作区入口">
          {items.slice(0, 4).map((item) => (
            <a href={item.href} key={item.key}>
              {item.label}
            </a>
          ))}
        </div>
      ) : (
        <div className={styles.actions}>
          <a href={meta.homeHref}>进入{meta.label}</a>
        </div>
      )}
    </section>
  );
}
