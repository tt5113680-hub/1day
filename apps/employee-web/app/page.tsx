'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel } from '@oneday/ui';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function EmployeeHome() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) {
          router.replace('/e/login');
          return;
        }
        const response = await sessionApi.request(`${api}/api/v1/me/menu?product=employee`);
        if (!response.ok) throw new Error('MENU');
        const payload = (await response.json()).data as { homeHref?: string };
        if (!cancelled) router.replace(payload.homeHref || '/e/workbench');
      } catch {
        if (!cancelled) router.replace('/e/workbench');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <AppStatePanel kind="loading" title="正在进入员工工作台" />;
}
