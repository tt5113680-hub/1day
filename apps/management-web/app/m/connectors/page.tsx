'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  businessLabel,
  Button,
  Card,
  StatusBadge,
} from '@oneday/ui';

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
const logCopy = (value: string) =>
  value === 'Authorization requested; no external call has been made.'
    ? '授权请求已登记，尚未执行外部调用。'
    : value;

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

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载连接器状态"
          description="正在校验租户授权意图、能力边界与运行记录。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看连接器管理"
          description="请使用具备租户连接器管理权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="连接器管理暂不可用"
          description="授权与运行状态未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 商户连接器授权"
        title="连接器授权与运行状态保持可验证"
        description="仅登记授权意图与状态；密钥不落明文，未完成授权时不会伪造外部执行结果。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新连接器
          </Button>
        }
      />

      <Card className={styles.request}>
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
        <Button loading={submitting} onClick={() => void requestAuthorization()}>
          登记授权请求
        </Button>
      </Card>
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}

      <section className={styles.grid} aria-label="连接器列表">
        {connectors.length ? (
          connectors.map((connector) => (
            <article key={connector.id}>
              <Card className={styles.connectorCard}>
                <div className={styles.title}>
                  <strong>{labels[connector.code] ?? connector.code}</strong>
                  <StatusBadge tone={connector.status === 'authorized' ? 'success' : 'warning'}>
                    {businessLabel(connector.status)}
                  </StatusBadge>
                </div>
                <p>密钥摘要：{connector.secret_fingerprint ?? '尚未登记'}</p>
                <small>
                  版本 {connector.version} · 最近更新{' '}
                  {new Date(connector.updated_at).toLocaleString('zh-CN', { hour12: false })}
                </small>
                <p data-testid="connector-delivery-boundary">
                  外部投递：{businessLabel(connector.capability.externalDelivery)}；所需证据：
                  {businessLabel(connector.capability.requiredEvidence)}
                </p>
                <div className={styles.logs}>
                  <h2>最近运行日志</h2>
                  {connector.logs.length ? (
                    connector.logs.map((log, index) => (
                      <p key={`${log.createdAt}-${index}`}>
                        <b>{businessLabel(log.status)}</b> · {logCopy(log.message)}
                      </p>
                    ))
                  ) : (
                    <p>暂无日志</p>
                  )}
                </div>
              </Card>
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            <AppStatePanel
              kind="empty"
              title="暂无授权请求"
              description="登记后可查看真实授权与运行状态。"
            />
          </div>
        )}
      </section>
    </main>
  );
}
