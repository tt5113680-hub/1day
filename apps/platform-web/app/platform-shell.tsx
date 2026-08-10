'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  CHANNEL_MENU_CATALOG,
  CIRCLE_MENU_CATALOG,
  PLATFORM_MENU_CATALOG,
  type MenuItemDto,
  type MenuProduct,
  type MenuProductLink,
} from '@oneday/contracts';
import { SessionApiClient } from '@oneday/session-client';
import { AdminShell } from '@oneday/ui';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const fallbackByProduct: Record<'platform' | 'channel' | 'circle', MenuItemDto[]> = {
  platform: PLATFORM_MENU_CATALOG.map(({ key, href, label, group }) => ({
    key,
    href,
    label,
    group,
  })),
  channel: CHANNEL_MENU_CATALOG.map(({ key, href, label, group }) => ({
    key,
    href,
    label,
    group,
  })),
  circle: CIRCLE_MENU_CATALOG.map(({ key, href, label, group }) => ({
    key,
    href,
    label,
    group,
  })),
};

const productMeta: Record<
  'platform' | 'channel' | 'circle',
  { product: string; context: string; query: MenuProduct }
> = {
  platform: { product: '平台运营', context: '系统租户 · 治理控制台', query: 'platform' },
  channel: { product: '渠道经营', context: '渠道负责人 · 授权渠道范围', query: 'channel' },
  circle: { product: '商圈经营', context: '商圈负责人 · 授权商圈范围', query: 'circle' },
};

function modeFromPath(pathname: string): 'platform' | 'channel' | 'circle' {
  if (pathname.startsWith('/ch/')) return 'channel';
  if (pathname.startsWith('/bc/')) return 'circle';
  return 'platform';
}

export function PlatformShell({
  children,
  controls,
}: {
  children: ReactNode;
  controls?: ReactNode;
}) {
  const pathname = usePathname();
  const mode = modeFromPath(pathname);
  const meta = productMeta[mode];
  const [navigation, setNavigation] = useState(fallbackByProduct[mode]);
  const [contextLabel, setContextLabel] = useState(meta.context);
  const [availableProducts, setAvailableProducts] = useState<MenuProductLink[]>([]);

  useEffect(() => {
    setNavigation(fallbackByProduct[mode]);
    setContextLabel(productMeta[mode].context);
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) return;
        const response = await sessionApi.request(
          `${api}/api/v1/me/menu?product=${productMeta[mode].query}`,
        );
        if (!response.ok) return;
        const payload = (await response.json()).data as {
          context?: string;
          items?: MenuItemDto[];
          availableProducts?: MenuProductLink[];
        };
        if (cancelled) return;
        if (payload.context) setContextLabel(payload.context);
        if (payload.items?.length) setNavigation(payload.items);
        if (payload.availableProducts?.length) setAvailableProducts(payload.availableProducts);
      } catch {
        // Keep static catalog fail-open so offline/login still render.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const modeSwitcher = useMemo(() => {
    const shellModes = availableProducts.filter((link) =>
      ['platform', 'channel', 'circle'].includes(link.product),
    );
    if (shellModes.length < 2) return null;
    return (
      <nav aria-label="角色工作区" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {shellModes.map((link) => (
          <a
            href={link.homeHref}
            key={link.product}
            style={{
              fontSize: 12,
              fontWeight: link.product === mode ? 700 : 500,
              textDecoration: link.product === mode ? 'underline' : 'none',
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    );
  }, [availableProducts, mode]);

  if (pathname === '/login') return children;
  return (
    <AdminShell
      activeHref={pathname}
      product={meta.product}
      context={contextLabel}
      controls={
        <>
          {modeSwitcher}
          {controls}
        </>
      }
      navigation={navigation}
    >
      {children}
    </AdminShell>
  );
}
