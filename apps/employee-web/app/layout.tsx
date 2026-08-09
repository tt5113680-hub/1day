import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SessionControls, SessionGuard } from '@oneday/session-client';
import { MobileShell } from '@oneday/ui';
import '@oneday/ui/foundation.css';
import { EmployeeBottomNav } from './e/employee-bottom-nav';
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export const metadata: Metadata = { title: 'ONEDAY Employee' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SessionControls apiBase={api} loginPath="/e/login" />
        <SessionGuard apiBase={api} loginPath="/e/login">
          <MobileShell mode="employee">
            {children}
            <EmployeeBottomNav />
          </MobileShell>
        </SessionGuard>
      </body>
    </html>
  );
}
