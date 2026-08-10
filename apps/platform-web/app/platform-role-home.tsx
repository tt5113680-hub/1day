'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel } from '@oneday/ui';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export function PlatformRoleHome() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) {
          router.replace('/login');
          return;
        }
        const response = await sessionApi.request(`${api}/api/v1/me/menu?product=platform`);
        if (!response.ok) throw new Error('MENU');
        const payload = (await response.json()).data as { homeHref?: string };
        if (cancelled) return;
        router.replace(payload.homeHref || '/p/dashboard');
      } catch {
        if (!cancelled) {
          setState('error');
          router.replace('/p/dashboard');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === 'error') {
    return (
      <AppStatePanel
        kind="error"
        title="无法解析角色首页"
        description="已回退到平台总览。"
        action={<a href="/p/dashboard">进入平台总览</a>}
      />
    );
  }
  return <AppStatePanel kind="loading" title="正在进入角色首页" />;
}
