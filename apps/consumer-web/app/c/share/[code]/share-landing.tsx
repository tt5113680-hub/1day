'use client';

import { AppStatePanel, Button, MobileShell } from '@oneday/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { trackFunnelEvent } from '../../entry-funnel-client';
import styles from './share-landing.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export function ShareLanding() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState(false);
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  useEffect(() => {
    if (!code) {
      setError(true);
      return;
    }
    void fetch(`${api}/api/v1/public/share-codes/${encodeURIComponent(code)}/open`, {
      method: 'POST',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('UNAVAILABLE');
        const share = (await response.json()).data as {
          targetPath: string;
          tenant: string;
          code: string;
          scenario?: string;
        };
        void trackFunnelEvent(share.tenant, {
          eventCode: 'share_open',
          surface: 'share',
          moduleKey: 'employee_share_landing',
          shareCode: share.code,
          scene: share.scenario ? `share_open_${share.scenario}` : 'share_open',
          shareState: 'opened',
          payload: { scenario: share.scenario ?? null },
        });
        const target = new URL(share.targetPath, window.location.origin);
        if (!target.searchParams.get('tenant')) target.searchParams.set('tenant', share.tenant);
        target.searchParams.set('shareCode', share.code);
        if (!target.searchParams.get('source')) target.searchParams.set('source', 'employee:share');
        if (!target.searchParams.get('scene')) target.searchParams.set('scene', 'share_landing');
        router.replace(`${target.pathname}${target.search}${target.hash}`);
      })
      .catch(() => setError(true));
  }, [code, router]);

  if (error)
    return (
      <MobileShell>
        <main className={styles.message}>
          <AppStatePanel
            kind="error"
            title="此分享入口已失效"
            description="分享码可能过期或已撤销。请联系分享人获取新的活动入口；不会记录成交结果。"
            action={
              <Button
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                返回首页
              </Button>
            }
          />
        </main>
      </MobileShell>
    );

  return (
    <MobileShell>
      <main className={styles.message}>
        <AppStatePanel
          kind="loading"
          title="正在进入专属入口…"
          description="系统正在确认分享来源并准备服务内容。本页只统计打开痕迹，不表示第三方已成交。"
        />
        <p className={styles.hint} role="status">
          分享码 {code ? `${code.slice(0, 4)}…` : ''} · 推广员入口
        </p>
      </main>
    </MobileShell>
  );
}
