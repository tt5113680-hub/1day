'use client';

import { usePathname } from 'next/navigation';
import styles from './employee-bottom-nav.module.css';

export function EmployeeBottomNav() {
  const pathname = usePathname();
  if (pathname === '/e/login') return null;
  return (
    <nav className={styles.nav} aria-label="员工工作导航">
      <a href="/e/workbench">工作台</a>
      <a href="/e/leads">客户</a>
      <a href="/e/workbench#today-title">任务</a>
      <a href="/e/notifications">提醒</a>
      <a href="/e/profile">我的</a>
    </nav>
  );
}
