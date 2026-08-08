'use client';
import { SessionApiClient } from '@oneday/session-client';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Connector = {
  id: string;
  code: string;
  status: string;
  secret_fingerprint: string | null;
  version: number;
  updated_at: string;
  logs: { status: string; message: string; createdAt: string }[];
  capability: {
    authorization: string;
    externalDelivery: string;
    requiredEvidence: string;
  };
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const labels: Record<string, string> = {
  wechat: '微信',
  douyin: '抖音',
  meituan: '美团',
  'manual-import': '人工导入',
};

export default function ConnectorPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [code, setCode] = useState('douyin');
  const [secret, setSecret] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/connectors`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setConnectors((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);

  const requestAuthorization = async () => {
    if (!secret.trim()) return setNote('请输入授权密钥。');
    setSubmitting(true);
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/connectors/authorization-requests`,
        {
          method: 'POST',
          headers: {
            ...headers(),
            'content-type': 'application/json',
            'idempotency-key': crypto.randomUUID(),
          },
          body: JSON.stringify({ code, secret }),
        },
      );
      if (!response.ok) throw Error();
      setSecret('');
      setNote('授权请求已登记，等待第三方授权；系统尚未调用外部平台。');
      await load();
    } catch {
      setNote('授权请求未登记，请检查权限和输入后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') return <main className={styles.centered}>正在加载连接器状态…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看连接器管理</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>连接器管理暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );

  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 插件连接器</p>
          <h1>连接器授权与运行状态保持可验证</h1>
          <span>仅登记授权意图与状态；密钥不落明文，未完成授权时不会伪造外部执行结果。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>

      <section className={styles.request} aria-label="授权请求">
        <label>
          连接器
          <select
            aria-label="连接器"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          >
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          授权密钥
          <input
            aria-label="授权密钥"
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            maxLength={500}
            autoComplete="off"
          />
        </label>
        <button disabled={submitting} onClick={() => void requestAuthorization()}>
          {submitting ? '正在登记…' : '登记授权请求'}
        </button>
      </section>
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}

      <section className={styles.grid} aria-label="连接器列表">
        {connectors.length ? (
          connectors.map((connector) => (
            <article key={connector.id}>
              <div className={styles.title}>
                <strong>{labels[connector.code] ?? connector.code}</strong>
                <span>{connector.status}</span>
              </div>
              <p>密钥摘要：{connector.secret_fingerprint ?? '尚未登记'}</p>
              <small>
                版本 {connector.version} · 最近更新{' '}
                {new Date(connector.updated_at).toLocaleString()}
              </small>
              <p data-testid="connector-delivery-boundary">
                External delivery: {connector.capability.externalDelivery}; evidence:{' '}
                {connector.capability.requiredEvidence}
              </p>
              <div className={styles.logs}>
                <h2>最近运行日志</h2>
                {connector.logs.length ? (
                  connector.logs.map((log, index) => (
                    <p key={`${log.createdAt}-${index}`}>
                      <b>{log.status}</b> · {log.message}
                    </p>
                  ))
                ) : (
                  <p>暂无日志</p>
                )}
              </div>
            </article>
          ))
        ) : (
          <section className={styles.empty}>暂无授权请求。登记后可查看真实授权与运行状态。</section>
        )}
      </section>
    </main>
  );
}
