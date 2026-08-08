'use client';

import { useState } from 'react';
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

export function ActionState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy =
    kind === 'forbidden'
      ? ['动作暂不可访问', '链接可能已失效，请返回商家页面选择其他服务。']
      : ['动作加载失败', '网络连接不稳定，请稍后重试或返回上一页。'];
  return (
    <main className={styles.message}>
      <section className={styles.messageCard}>
        <h1>{copy[0]}</h1>
        <p>{copy[1]}</p>
        {kind === 'error' && <button onClick={() => window.location.reload()}>重新加载</button>}
      </section>
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
}: {
  tenant: string;
  tenantName: string;
  action: ConsumerAction;
  source?: string;
  returnTo?: string;
  shareCode?: string;
}) {
  const [status, setStatus] = useState<'ready' | 'submitting' | 'failed' | 'copied'>('ready');
  const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
  const back = returnTo?.startsWith('/c/')
    ? returnTo
    : `/c/entry?tenant=${encodeURIComponent(tenant)}`;
  const confirm = async () => {
    setStatus('submitting');
    try {
      const response = await fetch(
        `${api}/api/v1/consumer/actions/${encodeURIComponent(action.id)}/confirm?tenant=${encodeURIComponent(tenant)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ source, returnTo: back, shareCode }),
        },
      );
      const payload = (await response.json()) as { data?: { destination?: string | null } };
      if (!response.ok) throw new Error('confirm failed');
      if (payload.data?.destination) {
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
  const requiresCopy = action.actionType !== 'link';
  return (
    <main className={styles.page}>
      <a className={styles.back} href={back}>
        返回上一页
      </a>
      <p className={styles.eyebrow}>{tenantName} · 外部动作确认</p>
      <h1>{action.name}</h1>
      <section className={styles.card}>
        <strong>
          {action.actionType === 'link' ? '即将跳转到外部服务' : '先记录本次咨询，再前往目标平台'}
        </strong>
        <p>
          {requiresCopy
            ? '确认后会记录本次咨询，并显示专属口令。请复制口令后在目标平台完成服务；也可随时返回商家页面继续咨询。'
            : '确认后会记录本次咨询并跳转到外部服务。如未成功打开，可返回商家页面继续咨询。'}
        </p>
      </section>
      {status === 'failed' && <p className={styles.error}>操作未完成，请检查网络后重试。</p>}
      {status === 'copied' && (
        <p className={styles.success}>
          本次咨询已记录。请复制下方口令，并在目标平台完成服务；返回商家页面可继续咨询。
        </p>
      )}
      <section className={styles.actions}>
        <button disabled={status === 'submitting'} onClick={confirm}>
          {status === 'submitting'
            ? '正在确认…'
            : action.actionType === 'link'
              ? '确认并打开'
              : requiresCopy
                ? '记录咨询并获取口令'
                : '确认并打开'}
        </button>
        {action.actionType !== 'link' && (
          <button className={styles.secondary} onClick={copyCode}>
            复制专属口令
          </button>
        )}
        {status === 'copied' && <code>{platformCopy}</code>}
        <a className={styles.returnLink} href={back}>
          暂不前往，返回商家页
        </a>
      </section>
    </main>
  );
}
