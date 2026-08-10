'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { EMPLOYEE_MENU_CATALOG, type MenuItemDto } from '@oneday/contracts';
import { SessionApiClient } from '@oneday/session-client';
import { EmployeeWorkNav, type EmployeeNavItem } from '@oneday/ui';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const fallbackNavigation: EmployeeNavItem[] = EMPLOYEE_MENU_CATALOG.map(({ key, href, label, group }) => ({
  key,
  href,
  label,
  group,
}));

function activeKeyFor(pathname: string, items: EmployeeNavItem[]) {
  if (items.some((item) => item.key === 'customers' && (pathname.startsWith('/e/leads') || pathname.startsWith('/e/customers')))) {
    return 'customers';
  }
  if (items.some((item) => item.key === 'tasks' && pathname.startsWith('/e/tasks'))) return 'tasks';
  if (items.some((item) => item.key === 'notifications' && pathname.startsWith('/e/notifications'))) {
    return 'notifications';
  }
  if (
    items.some(
      (item) => item.key === 'profile' && (pathname.startsWith('/e/profile') || pathname.startsWith('/e/share')),
    )
  ) {
    return 'profile';
  }
  if (items.some((item) => item.key === 'store' && pathname.startsWith('/e/store'))) return 'store';
  if (items.some((item) => item.key === 'workbench' && pathname === '/e/workbench')) return 'workbench';
  const direct = items.find((item) => {
    const path = item.href.split('#')[0] ?? item.href;
    return pathname === path || pathname.startsWith(`${path}/`);
  });
  return direct?.key;
}

export function EmployeeBottomNav() {
  const pathname = usePathname();
  const [items, setItems] = useState<EmployeeNavItem[]>(fallbackNavigation);
  const [context, setContext] = useState('员工工作台');
  const [storeManagerMode, setStoreManagerMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) return;
        const response = await sessionApi.request(`${api}/api/v1/me/menu?product=employee`);
        if (!response.ok) return;
        const payload = (await response.json()).data as {
          items?: MenuItemDto[];
          context?: string;
          scopes?: { type: string }[];
        };
        if (cancelled) return;
        if (payload.items?.length) {
          setItems(payload.items.map(({ key, href, label, group }) => ({ key, href, label, group })));
        }
        if (payload.context) setContext(payload.context);
        setStoreManagerMode(
          Boolean(
            payload.items?.some((item) => item.key === 'store') ||
              payload.scopes?.some((scope) => scope.type === 'store'),
          ),
        );
      } catch {
        // Keep static five-tab fail-open.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (pathname === '/e/login') return null;

  return (
    <EmployeeWorkNav
      activeKey={activeKeyFor(pathname, items)}
      context={context}
      items={items}
      storeManagerMode={storeManagerMode}
    />
  );
}
