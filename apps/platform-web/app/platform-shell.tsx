'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminShell } from '@oneday/ui';

const platformNavigation = [
  { href: '/p/dashboard', label: '平台总览' },
  { href: '/p/tenants/new', label: '开通租户' },
  { href: '/p/tenants', label: '租户治理' },
  { href: '/p/templates', label: '模板目录' },
  { href: '/p/channels', label: '渠道运营' },
  { href: '/p/business-circles', label: '商圈运营' },
  { href: '/p/connectors', label: '连接器' },
  { href: '/p/security-audit', label: '安全审计' },
];

const channelNavigation = [
  { href: '/ch/dashboard', label: '渠道经营总览' },
  { href: '/ch/merchants/new', label: '商户开通交付' },
];

const circleNavigation = [
  { href: '/bc/dashboard', label: '商圈经营总览' },
  { href: '/bc/merchants', label: '商户准入治理' },
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
  const mode = pathname.startsWith('/ch/')
    ? {
        product: '渠道经营',
        context: '渠道负责人 · 授权渠道范围',
        navigation: channelNavigation,
      }
    : pathname.startsWith('/bc/')
      ? {
          product: '商圈经营',
          context: '商圈负责人 · 授权商圈范围',
          navigation: circleNavigation,
        }
      : {
          product: '平台运营',
          context: '系统租户 · 治理控制台',
          navigation: platformNavigation,
        };
  return (
    <AdminShell
      activeHref={pathname}
      product={mode.product}
      context={mode.context}
      controls={controls}
      navigation={mode.navigation}
    >
      {children}
    </AdminShell>
  );
}
