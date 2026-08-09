import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@oneday/ui/foundation.css';
import './globals.css';

export const metadata: Metadata = { title: 'ONEDAY Consumer' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
