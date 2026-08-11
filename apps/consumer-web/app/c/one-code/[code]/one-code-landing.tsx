'use client';

import { AppStatePanel, Button } from '@oneday/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { trackFunnelEvent } from '../../entry-funnel-client';
import styles from './one-code-landing.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

type ResolvePayload = {
  code: string;
  tenant: { slug: string; name: string };
  scene: string;
  source: string;
  role: string;
  targetPath: string;
};

export function OneCodeLanding() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState<'invalid' | 'missing' | 'error' | null>(null);
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  useEffect(() => {
    if (!code) {
      setError('invalid');
      return;
    }
    if (!/^[A-Z0-9]{12,48}$/.test(code)) {
      setError('invalid');
      return;
    }
    void fetch(`${api}/api/v1/one-code/${encodeURIComponent(code)}?role=consumer`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (response.status === 404) {
          setError('missing');
          return;
        }
        if (!response.ok) {
          setError('error');
          return;
        }
        const payload = (await response.json()).data as ResolvePayload;
        if (!payload.targetPath?.startsWith('/')) {
          setError('error');
          return;
        }
        if (payload.tenant?.slug) {
          void trackFunnelEvent(payload.tenant.slug, {
            eventCode: 'visit',
            surface: 'one_code',
            moduleKey: 'one_code_landing',
            source: payload.source,
            scene: payload.scene || 'one_code',
            payload: { code: payload.code },
          });
        }
        const target = new URL(payload.targetPath, window.location.origin);
        if (!target.searchParams.get('tenant') && payload.tenant?.slug) {
          target.searchParams.set('tenant', payload.tenant.slug);
        }
        if (!target.searchParams.get('source') && payload.source) {
          target.searchParams.set('source', payload.source);
        }
        router.replace(`${target.pathname}${target.search}${target.hash}`);
      })
      .catch(() => setError('error'));
  }, [code, router]);

  if (error === 'invalid') {
    return (
      <main className={styles.message} data-testid="one-code-landing-invalid">
        <AppStatePanel
          kind="forbidden"
          title="ONE-CODE 格式无效"
          description="请确认交付码完整，或联系开通方重新获取入口。"
        />
      </main>
    );
  }
  if (error === 'missing') {
    return (
      <main className={styles.message} data-testid="one-code-landing-missing">
        <AppStatePanel
          kind="empty"
          title="ONE-CODE 不可用"
          description="该码可能已过期、停用或尚未生成。这是本地交付入口，不是第三方直播平台跳转。"
        />
      </main>
    );
  }
  if (error === 'error') {
    return (
      <main className={styles.message} data-testid="one-code-landing-error">
        <AppStatePanel
          kind="error"
          title="无法解析 ONE-CODE"
          description="网络或服务暂不可用，请稍后重试。"
          action={<Button onClick={() => window.location.reload()}>重新加载</Button>}
        />
      </main>
    );
  }

  return (
    <main className={styles.message} data-testid="one-code-landing">
      <AppStatePanel
        kind="loading"
        title="正在进入商家入口…"
        description="系统正在解析 ONE-CODE 并带入来源标记。本地测试入口，不宣称第三方平台已对接。"
      />
    </main>
  );
}
