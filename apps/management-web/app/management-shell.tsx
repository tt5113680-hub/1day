'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MANAGEMENT_MENU_CATALOG, type MenuItemDto } from '@oneday/contracts';
import { SessionApiClient } from '@oneday/session-client';
import { AdminShell } from '@oneday/ui';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const fallbackNavigation: MenuItemDto[] = MANAGEMENT_MENU_CATALOG.map(
  ({ key, href, label, group }) => ({ key, href, label, group }),
);

export function ManagementShell({
  children,
  controls,
}: {
  children: ReactNode;
  controls?: ReactNode;
}) {
  const pathname = usePathname();
  const [navigation, setNavigation] = useState(fallbackNavigation);
  const [contextLabel, setContextLabel] = useState('租户经营工作台');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) return;
        const response = await sessionApi.request(`${api}/api/v1/me/menu?product=management`);
        if (!response.ok) return;
        const payload = (await response.json()).data as {
          context?: string;
          items?: MenuItemDto[];
          homeHref?: string;
        };
        if (cancelled) return;
        if (payload.context) setContextLabel(payload.context);
        if (payload.items?.length) setNavigation(payload.items);
      } catch {
        // Keep static catalog fail-open so offline/login still render.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (pathname === '/login') return children;
  return (
    <AdminShell
      activeHref={pathname}
      product="商户经营"
      context={contextLabel}
      controls={controls}
      navigation={navigation}
    >
      {children}
    </AdminShell>
  );
}
