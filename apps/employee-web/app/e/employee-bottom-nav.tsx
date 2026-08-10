'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { EMPLOYEE_MENU_CATALOG, type MenuItemDto } from '@oneday/contracts';
import { SessionApiClient } from '@oneday/session-client';
import styles from './employee-bottom-nav.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const fallbackNavigation: MenuItemDto[] = EMPLOYEE_MENU_CATALOG.map(
  ({ key, href, label, group }) => ({ key, href, label, group }),
);

function matchesItem(pathname: string, item: MenuItemDto) {
  const path = item.href.split('#')[0] ?? item.href;
  if (item.key === 'customers') {
    return pathname.startsWith('/e/leads') || pathname.startsWith('/e/customers');
  }
  if (item.key === 'tasks') return pathname.startsWith('/e/tasks');
  if (item.key === 'notifications') return pathname.startsWith('/e/notifications');
  if (item.key === 'profile') {
    return pathname.startsWith('/e/profile') || pathname.startsWith('/e/share');
  }
  if (item.key === 'store') return pathname.startsWith('/e/store');
  if (item.key === 'workbench') return pathname === '/e/workbench';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function EmployeeBottomNav() {
  const pathname = usePathname();
  const [items, setItems] = useState(fallbackNavigation);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) return;
        const response = await sessionApi.request(`${api}/api/v1/me/menu?product=employee`);
        if (!response.ok) return;
        const payload = (await response.json()).data as { items?: MenuItemDto[] };
        if (!cancelled && payload.items?.length) setItems(payload.items);
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
    <nav className={styles.nav} aria-label="员工工作导航">
      {items.map((item) => (
        <a
          className={matchesItem(pathname, item) ? styles.active : undefined}
          href={item.href}
          key={item.key}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
