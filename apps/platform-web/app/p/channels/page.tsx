'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Merchant = {
  tenantId: string;
  slug: string;
  name: string;
  status: string;
  onboardingStatus?: string;
  serviceStatus?: string;
};
type Channel = {
  id: string;
  code: string;
  name: string;
  status: string;
  onboardingStatus: string;
  serviceStatus: string;
  version: number;
  merchants: Merchant[];
};
type Data = { channels: Channel[]; merchantPool: Merchant[] };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export default function ChannelsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data>({ channels: [], merchantPool: [] });
  const [form, setForm] = useState({
    code: '',
    name: '',
    merchantTenantId: '',
    onboardingStatus: 'invited',
    serviceStatus: 'pending',
  });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const headers = () => ({
    authorization: `Bearer ${sessionStorage.getItem('oneday.accessToken')}`,
    'x-request-id': crypto.randomUUID(),
  });
  const load = useCallback(async () => {
    if (!sessionStorage.getItem('oneday.accessToken')) return setState('forbidden');
    setState('loading');
    try {
      const response = await fetch(`${api}/api/v1/platform/channels`, { headers: headers() });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const create = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await fetch(`${api}/api/v1/platform/channels`, {
        method: 'POST',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(form),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('渠道编码已存在，请使用新的一级渠道编码。');
      if (response.status === 400) return setNote('请填写有效的渠道信息并选择可开通商户。');
      if (!response.ok) throw Error();
      setNote('渠道与商户池条目已创建，并已记录审计与投递事件。');
      setForm({
        code: '',
        name: '',
        merchantTenantId: '',
        onboardingStatus: 'invited',
        serviceStatus: 'pending',
      });
      await load();
    } catch {
      setNote('渠道创建失败，未完成的事务不会保留，请检查输入后重试。');
    } finally {
      setSaving(false);
    }
  };
  if (state === 'loading') return <main className={styles.centered}>正在加载渠道经营数据…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看平台渠道管理</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>渠道管理暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / 平台渠道管理</p>
          <h1>一级渠道、商户池与服务状态</h1>
          <span>只管理一级渠道；商户开通进度和服务状态均以持久化记录为准。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <section className={styles.panel}>
          <h2>建立一级渠道</h2>
          <label>
            渠道编码
            <input
              aria-label="渠道编码"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="regional-partner"
            />
          </label>
          <label>
            渠道名称
            <input
              aria-label="渠道名称"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            商户池租户
            <select
              aria-label="商户池租户"
              value={form.merchantTenantId}
              onChange={(event) => setForm({ ...form, merchantTenantId: event.target.value })}
            >
              <option value="">选择已开通商户</option>
              {data.merchantPool.map((merchant) => (
                <option key={merchant.tenantId} value={merchant.tenantId}>
                  {merchant.name} ({merchant.slug})
                </option>
              ))}
            </select>
          </label>
          <label>
            开通状态
            <select
              aria-label="开通状态"
              value={form.onboardingStatus}
              onChange={(event) => setForm({ ...form, onboardingStatus: event.target.value })}
            >
              <option value="invited">invited</option>
              <option value="onboarding">onboarding</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </label>
          <label>
            服务状态
            <select
              aria-label="服务状态"
              value={form.serviceStatus}
              onChange={(event) => setForm({ ...form, serviceStatus: event.target.value })}
            >
              <option value="pending">pending</option>
              <option value="ready">ready</option>
              <option value="degraded">degraded</option>
              <option value="blocked">blocked</option>
            </select>
          </label>
          <button disabled={saving || !data.merchantPool.length} onClick={() => void create()}>
            {saving ? '正在创建…' : '创建渠道并纳入商户'}
          </button>
        </section>
        <section className={styles.panel}>
          <h2>可开通商户池</h2>
          {data.merchantPool.length ? (
            data.merchantPool.map((merchant) => (
              <article className={styles.pool} key={merchant.tenantId}>
                <strong>{merchant.name}</strong>
                <span>{merchant.slug}</span>
                <small>{merchant.status}</small>
              </article>
            ))
          ) : (
            <p>暂无可纳入渠道的已开通商户。</p>
          )}
        </section>
      </section>
      <section className={styles.channels}>
        <h2>已配置渠道</h2>
        {data.channels.length ? (
          data.channels.map((channel) => (
            <article key={channel.id}>
              <header>
                <div>
                  <strong>{channel.name}</strong>
                  <span>
                    {channel.code} · {channel.status}
                  </span>
                </div>
                <small>服务：{channel.serviceStatus}</small>
              </header>
              <div className={styles.merchants}>
                {channel.merchants.map((merchant) => (
                  <p key={merchant.tenantId}>
                    <b>{merchant.name}</b>
                    <span>{merchant.slug}</span>
                    <small>
                      开通 {merchant.onboardingStatus} · 服务 {merchant.serviceStatus}
                    </small>
                  </p>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p className={styles.empty}>尚未建立一级渠道。创建后，渠道端可基于真实商户池开展运营。</p>
        )}
      </section>
    </main>
  );
}
