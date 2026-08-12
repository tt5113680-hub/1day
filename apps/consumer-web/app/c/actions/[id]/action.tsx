'use client';

import { useMemo, useState } from 'react';
import { AppStatePanel, Button } from '@oneday/ui';
import { mapPlatform, trackFunnelEvent, type FunnelSurface } from '../../entry-funnel-client';
import { ConsumerShell } from '../../consumer-shell';
import styles from './action.module.css';

export type ConsumerAction = {
  id: string;
  name: string;
  actionType: 'link' | 'mini_program' | 'platform_entry';
  targetUrl: string | null;
  miniProgramAppId: string | null;
  miniProgramPath: string | null;
  platform: string | null;
  copyCode: string;
};

const PLATFORM_LABEL: Record<string, string> = {
  meituan: '美团',
  douyin: '抖音',
  eleme: '饿了么',
  saabei: '扫呗',
  external: '外部平台',
};

function surfaceFromScene(scene?: string): FunnelSurface {
  const s = (scene ?? '').toLowerCase();
  if (s.includes('entry')) return 'entry';
  if (s.includes('share')) return 'share';
  if (s.includes('search')) return 'search';
  if (s.includes('circle')) return 'circle';
  if (s.includes('one_code') || s.includes('onecode')) return 'one_code';
  if (s.includes('nearby') || s.includes('discovery')) return 'nearby';
  return 'store';
}

function destinationHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function ActionState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy: readonly [string, string] =
    kind === 'forbidden'
      ? ['动作暂不可访问', '链接可能已失效，请返回商家页面选择其他服务。']
      : ['动作加载失败', '网络连接不稳定，请稍后重试或返回上一页。'];
  return (
    <main className={styles.message}>
      <AppStatePanel
        kind={kind}
        title={copy[0]}
        description={copy[1]}
        action={
          kind === 'error' ? (
            <Button onClick={() => window.location.reload()}>重新加载</Button>
          ) : undefined
        }
      />
    </main>
  );
}

export function ActionPage({
  tenant,
  tenantName,
  action,
  source,
  returnTo,
  shareCode,
  storeId,
  scene,
}: {
  tenant: string;
  tenantName: string;
  action: ConsumerAction;
  source?: string;
  returnTo?: string;
  shareCode?: string;
  storeId?: string;
  scene?: string;
}) {
  const [status, setStatus] = useState<'ready' | 'submitting' | 'failed' | 'copied'>('ready');
  const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
  const back = returnTo?.startsWith('/c/')
    ? returnTo
    : `/c/entry?tenant=${encodeURIComponent(tenant)}`;
  const surface = surfaceFromScene(scene);
  const platformKey = mapPlatform(action.platform) ?? 'external';
  const platformLabel = PLATFORM_LABEL[platformKey] ?? PLATFORM_LABEL.external;
  const host = useMemo(() => destinationHost(action.targetUrl), [action.targetUrl]);
  const requiresCopy = action.actionType !== 'link';

  const confirm = async () => {
    setStatus('submitting');
    try {
      void trackFunnelEvent(tenant, {
        eventCode: 'jump_confirm',
        surface,
        moduleKey: 'external_action_confirm',
        targetStoreId: storeId,
        targetPlatform: platformKey,
        targetUrl: action.targetUrl ?? undefined,
        source,
        scene: scene ?? 'action_confirm',
        shareCode,
        payload: { actionId: action.id, actionType: action.actionType },
      });
      const response = await fetch(
        `${api}/api/v1/consumer/actions/${encodeURIComponent(action.id)}/confirm?tenant=${encodeURIComponent(tenant)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ source, returnTo: back, shareCode, storeId, scene }),
        },
      );
      const payload = (await response.json()) as { data?: { destination?: string | null } };
      if (!response.ok) throw new Error('confirm failed');
      if (payload.data?.destination) {
        void trackFunnelEvent(tenant, {
          eventCode: 'jump',
          surface,
          moduleKey: action.name || 'external_jump',
          targetStoreId: storeId,
          targetPlatform: platformKey,
          targetUrl: payload.data.destination,
          source,
          scene: scene ?? 'action_jump',
          shareCode,
        });
        window.location.assign(payload.data.destination);
        return;
      }
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(action.copyCode);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };
  const platformCopy =
    action.actionType === 'mini_program' ? action.miniProgramPath : action.copyCode;

  const page = (
    <div className="od-sf-theme">
      <header className={styles.topBar}>
        <span className={styles.topTitle}>外链确认</span>
        <span className={styles.topMark}>推广员工具</span>
      </header>
      <main className={styles.page}>
        <a className={styles.back} href={back}>
          返回上一页
        </a>
        <p className={styles.eyebrow}>{tenantName} · 外链确认（推广员入口）</p>
        <h1>{action.name}</h1>

        <section className={styles.meta} aria-label="跳转目标">
          <span className={styles.platformBadge} data-platform={platformKey}>
            {platformLabel}
          </span>
          <div>
            <strong>即将离开 ONEDAY</strong>
            <p>
              {host
                ? `目标站点：${host}`
                : requiresCopy
                  ? '目标为第三方小程序/口令入口'
                  : '目标为外部服务链接'}
            </p>
          </div>
        </section>

        <section className={styles.card}>
          <strong>
            {action.actionType === 'link'
              ? '确认后记录跳转并打开外部服务'
              : '先记录本次咨询，再前往目标平台'}
          </strong>
          <p>
            {requiresCopy
              ? '确认后会记录入口痕迹，并显示专属口令。请复制口令后在目标平台完成服务；也可随时返回商家页面。'
              : '确认后会记录入口痕迹并跳转到外部服务。价格、库存与是否成交以第三方页面为准。'}
          </p>
          <p className={styles.disclaimer} role="note">
            ONEDAY 只统计至「确认/跳转」，不表示第三方已下单或已支付。
          </p>
        </section>

        {status === 'failed' && <p className={styles.error}>操作未完成，请检查网络后重试。</p>}
        {status === 'copied' && (
          <p className={styles.success}>
            本次咨询已记录。请复制下方口令，并在目标平台完成服务；返回商家页面可继续咨询。
          </p>
        )}
        <section className={styles.actions}>
          <button disabled={status === 'submitting'} onClick={() => void confirm()}>
            {status === 'submitting'
              ? '正在确认…'
              : action.actionType === 'link'
                ? `确认前往${platformLabel}`
                : requiresCopy
                  ? '记录咨询并获取口令'
                  : `确认前往${platformLabel}`}
          </button>
          {action.actionType !== 'link' && (
            <button className={styles.secondary} onClick={() => void copyCode()}>
              复制专属口令
            </button>
          )}
          {status === 'copied' && <code>{platformCopy}</code>}
          <a className={styles.returnLink} href={back}>
            暂不前往，返回商家页
          </a>
        </section>
        <p className={styles.honest} role="note">
          本确认页由已抓取动作档案现场推导，源 source=local；
          只统计至「确认/跳转」，价格、库存与是否成交均为美团/抖音/扫呗等第三方实际结果；
          仅记录观看/访问/跳转/停留/分享入口痕迹，不含支付金额。不在此下单，非本平台下单。
        </p>
      </main>
    </div>
  );
  return storeId ? (
    <ConsumerShell
      context={{ tenant, storeId, source, scene: scene ?? 'external_action', shareCode }}
      active="group-buy"
    >
      {page}
    </ConsumerShell>
  ) : (
    page
  );
}
