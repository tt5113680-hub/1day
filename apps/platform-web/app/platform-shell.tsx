'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminShell } from '@oneday/ui';

const navigation = [
  { href: '/p/dashboard', label: '平台总览' },
  { href: '/p/tenants/new', label: '开通租户' },
  { href: '/p/tenants', label: '租户治理' },
  { href: '/p/templates', label: '模板目录' },
  { href: '/p/channels', label: '渠道运营' },
  { href: '/p/business-circles', label: '商圈运营' },
  { href: '/p/connectors', label: '连接器' },
  { href: '/p/security-audit', label: '安全审计' },
];

export function PlatformShell({
  children,
  controls,
}: {
  children: ReactNode;
  controls?: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === '/login') return children;
  return (
    <AdminShell
      activeHref={pathname}
      product="平台运营"
      context="系统租户 · 治理控制台"
      controls={controls}
      navigation={navigation}
    >
      {children}
    </AdminShell>
  );
}
