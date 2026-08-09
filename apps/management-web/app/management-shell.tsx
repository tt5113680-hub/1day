'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminShell } from '@oneday/ui';

const navigation = [
  { href: '/', label: '经营总览' },
  { href: '/m/customers', label: '客户资产' },
  { href: '/m/workflows', label: '运营流程' },
  { href: '/m/stores', label: '门店与外链' },
  { href: '/m/offers', label: '套餐与 Offer' },
  { href: '/m/memberships', label: '会员与权益' },
  { href: '/m/content', label: '内容中心' },
  { href: '/m/page-builder', label: '模板与发布' },
  { href: '/m/organization-employees', label: '组织与员工' },
  { href: '/m/roles-permissions', label: '角色与权限' },
  { href: '/m/settings', label: '经营设置' },
];

export function ManagementShell({
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
      product="商户经营"
      context="租户经营工作台"
      controls={controls}
      navigation={navigation}
    >
      {children}
    </AdminShell>
  );
}
