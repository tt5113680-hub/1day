'use client';

import { usePathname } from 'next/navigation';
import styles from './employee-bottom-nav.module.css';

export function EmployeeBottomNav() {
  const pathname = usePathname();
  if (pathname === '/e/login') return null;
  const items = [
    { href: '/e/workbench', label: '工作台', matches: (path: string) => path === '/e/workbench' },
    {
      href: '/e/leads',
      label: '客户',
      matches: (path: string) => path.startsWith('/e/leads') || path.startsWith('/e/customers'),
    },
    {
      href: '/e/workbench#today-title',
      label: '任务',
      matches: (path: string) => path.startsWith('/e/tasks'),
    },
    {
      href: '/e/notifications',
      label: '提醒',
      matches: (path: string) => path.startsWith('/e/notifications'),
    },
    {
      href: '/e/profile',
      label: '我的',
      matches: (path: string) => path.startsWith('/e/profile') || path.startsWith('/e/share'),
    },
  ];
  return (
    <nav className={styles.nav} aria-label="员工工作导航">
      {items.map((item) => (
        <a
          className={item.matches(pathname) ? styles.active : undefined}
          href={item.href}
          key={item.label}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
