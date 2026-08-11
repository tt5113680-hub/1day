'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { trackFunnelEvent } from '../../entry-funnel-client';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export function ShareLanding() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState(false);
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  useEffect(() => {
    if (!code) return;
    void fetch(`${api}/api/v1/public/share-codes/${encodeURIComponent(code)}/open`, {
      method: 'POST',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('UNAVAILABLE');
        const share = (await response.json()).data as {
          targetPath: string;
          tenant: string;
          code: string;
        };
        void trackFunnelEvent(share.tenant, {
          eventCode: 'share_open',
          surface: 'share',
          moduleKey: 'employee_share_landing',
          shareCode: share.code,
          scene: 'share_open',
          shareState: 'opened',
        });
        const target = new URL(share.targetPath, window.location.origin);
        target.searchParams.set('tenant', share.tenant);
        target.searchParams.set('shareCode', share.code);
        router.replace(`${target.pathname}${target.search}`);
      })
      .catch(() => setError(true));
  }, [code, router]);
  if (error)
    return (
      <main>
        <h1>此分享码已失效</h1>
        <p>请联系分享人获取新的活动入口。</p>
      </main>
    );
  return (
    <main>
      <h1>正在进入专属活动…</h1>
      <p>系统正在确认来源并准备服务内容。</p>
    </main>
  );
}
