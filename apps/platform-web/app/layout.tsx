import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SessionControls, SessionGuard } from '@oneday/session-client';
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export const metadata: Metadata = { title: 'ONEDAY Platform' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SessionControls apiBase={api} loginPath="/login" />
        <SessionGuard apiBase={api} loginPath="/login">
          {children}
        </SessionGuard>
      </body>
    </html>
  );
}
