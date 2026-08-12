'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge, businessLabel } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
const barWidth = (total: number, value: number) =>
  total ? `${Math.max(2, (value / total) * 100)}%` : '0%';
const countBy = <T,>(rows: T[], key: (row: T) => string) => {
  const acc: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return Object.entries(acc)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};
const renderBars = (
  items: { label: string; value: number }[],
  total: number,
  empty = <p className={styles.barEmpty}>暂无记录</p>,
) =>
  items.length ? (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li className={styles.barRow} key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </span>
          <span className={styles.barValue}>{item.value}</span>
        </li>
      ))}
    </ul>
  ) : (
    empty
  );

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

  const platformDist = useMemo(
    () => countBy(connectors, (c) => labels[c.code] ?? c.code),
    [connectors],
  );
  const statusDist = useMemo(
    () => countBy(connectors, (c) => businessLabel(c.status)),
    [connectors],
  );
  const logStatusDist = useMemo(
    () =>
      countBy(
        connectors.flatMap((c) => c.logs),
        (l) => businessLabel(l.status),
      ),
    [connectors],
  );
  const activeCount = connectors.filter((c) => c.status === 'authorized').length;
  const pendingCount = connectors.filter((c) => c.status === 'pending_authorization').length;
  const logTotal = connectors.reduce((acc, c) => acc + c.logs.length, 0);

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
    <main className={styles.page} data-testid="management-connectors">
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 连接配置</span>
        <button type="button" className={styles.topBarRefresh} onClick={() => void load()}>
          刷新连接器
        </button>
      </div>
      <section className={styles.heroCard} aria-label="连接配置概况">
        <h1>连接器授权与运行状态保持可验证</h1>
        <p>仅登记授权意图与状态；密钥不落明文，未完成授权时不会伪造外部执行结果。</p>
      </section>
      <section className={styles.panel}>
        <div className={styles.summaryStrip} aria-label="连接器概况">
          <div>
            <span>连接器</span>
            <strong>{connectors.length}</strong>
          </div>
          <div>
            <span>已授权</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <span>待授权</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>运行日志</span>
            <strong>{logTotal}</strong>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>连接配置分布</h2>
          <span className={styles.panelMeta}>由当前租户连接器档案行现场推导</span>
        </div>
        <div className={styles.distribution} aria-label="连接配置分布">
          <div className={styles.panelBlock}>
            <h3>连接器平台分布</h3>
            {renderBars(platformDist, connectors.length)}
          </div>
          <div className={styles.panelBlock}>
            <h3>授权状态分布</h3>
            {renderBars(statusDist, connectors.length)}
          </div>
          <div className={styles.panelBlock}>
            <h3>运行日志状态分布</h3>
            {renderBars(logStatusDist, logTotal)}
          </div>
        </div>
        <p className={styles.honest}>
          来源
          source=local：分布全部由已抓取连接器档案行现场推导；连接器仅记录授权意图与本地运行记录，授权未完成时不会调用美团/抖音等外部平台，不包含本平台收款，非本平台下单。
        </p>
      </section>

      <article className={styles.panel + ' ' + styles.request}>
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
      </article>
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}

      <section className={styles.grid} aria-label="连接器列表">
        {connectors.length ? (
          connectors.map((connector) => (
            <article key={connector.id} className={styles.connectorCard}>
              <div className={styles.title}>
                <strong>{labels[connector.code] ?? connector.code}</strong>
                <StatusBadge tone={connector.status === 'authorized' ? 'success' : 'warning'}>
                  {businessLabel(connector.status)}
                </StatusBadge>
              </div>
              <small>
                版本 {connector.version} · 最近更新{' '}
                {new Date(connector.updated_at).toLocaleString('zh-CN', { hour12: false })}
              </small>
              <p>密钥摘要：{connector.secret_fingerprint ?? '尚未登记'}</p>
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
