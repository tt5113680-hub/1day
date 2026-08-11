'use client';
import { AppStatePanel, Button } from '@oneday/ui';
import { useState } from 'react';
import styles from './profile.module.css';
export type ProfileData = {
  profile: {
    displayName: string;
    identities: { type: string; maskedValue: string }[];
    consent: { status: string; version: string; consentedAt: string; versionNumber: number };
  };
  benefits: { title: string; description: string | null }[];
  history: { orderNumber: string; occurredAt: string; status: string }[];
};
const date = (x: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(x));
export function ProfileState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy: readonly [string, string] =
    kind === 'forbidden'
      ? ['资料暂不可访问', '请使用商家发送的专属资料链接。']
      : ['资料加载失败', '网络连接不稳定，请稍后重试。'];
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
export function ProfilePage({
  profileId,
  tenant,
  access,
  data,
}: {
  profileId: string;
  tenant: string;
  access: string;
  data: ProfileData;
}) {
  const [state, setState] = useState<'ready' | 'confirm' | 'done' | 'error'>('ready');
  const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
  const revoke = async () => {
    setState('confirm');
    try {
      const r = await fetch(
        `${api}/api/v1/consumer/profile/${encodeURIComponent(profileId)}/consent/revoke?tenant=${encodeURIComponent(tenant)}&access=${encodeURIComponent(access)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ version: data.profile.consent.versionNumber }),
        },
      );
      if (!r.ok) throw Error();
      setState('done');
    } catch {
      setState('error');
    }
  };
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>推广员工具 · 我的会员资料</p>
      <h1>{data.profile.displayName}</h1>
      <p className={styles.disclaimer} role="note">
        本页仅展示本店会员证明、权益与门店服务痕迹；不代表美团/抖音等第三方订单，非本平台下单。
      </p>
      <section className={styles.card}>
        <h2>已绑定身份</h2>
        {data.profile.identities.map((x) => (
          <p key={`${x.type}-${x.maskedValue}`}>
            <strong>{x.type}</strong>
            <span>{x.maskedValue}</span>
          </p>
        ))}
      </section>
      <section className={styles.card}>
        <h2>可用权益</h2>
        {data.benefits.length ? (
          data.benefits.map((x) => (
            <p key={x.title}>
              <strong>{x.title}</strong>
              <span>{x.description ?? '到店后咨询顾问使用条件'}</span>
            </p>
          ))
        ) : (
          <p>暂无已发布权益</p>
        )}
      </section>
      <section className={styles.card}>
        <h2>服务历史</h2>
        {data.history.length ? (
          data.history.map((x) => (
            <p key={x.orderNumber}>
              <strong>{x.orderNumber}</strong>
              <span>
                {date(x.occurredAt)} · {x.status}
              </span>
            </p>
          ))
        ) : (
          <p>暂无服务记录</p>
        )}
      </section>
      <section className={styles.privacy}>
        <h2>隐私与授权</h2>
        <p>你已同意 {data.profile.consent.version} 隐私授权。撤回后，此链接将立即失效。</p>
        {state === 'done' ? (
          <strong>授权已撤回</strong>
        ) : (
          <button onClick={revoke}>{state === 'confirm' ? '正在撤回…' : '撤回授权'}</button>
        )}
        {state === 'error' && <em>撤回失败，请稍后重试。</em>}
      </section>
    </main>
  );
}
