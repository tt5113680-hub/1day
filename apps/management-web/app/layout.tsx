import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SessionControls, SessionGuard } from '@oneday/session-client';
import '@oneday/ui/foundation.css';
import { ManagementShell } from './management-shell';
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export const metadata: Metadata = { title: 'ONEDAY Management' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SessionGuard apiBase={api} loginPath="/login">
          <ManagementShell controls={<SessionControls apiBase={api} loginPath="/login" />}>
            {children}
          </ManagementShell>
        </SessionGuard>
      </body>
    </html>
  );
}
