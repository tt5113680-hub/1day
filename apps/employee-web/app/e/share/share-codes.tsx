'use client';

import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './share.module.css';

type ShareCode = {
  id: string;
  code: string;
  scenario: 'employee' | 'campaign' | 'channel';
  targetPath: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  version: number;
  opens: number;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const labels = { employee: '员工码', campaign: '活动码', channel: '渠道码' };

export function ShareCodes() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [codes, setCodes] = useState<ShareCode[]>([]);
  const [scenario, setScenario] = useState<ShareCode['scenario']>('employee');
  const [expiresAt, setExpiresAt] = useState('');
  const [selected, setSelected] = useState<ShareCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState('');
  const token = () => sessionStorage.getItem('oneday.accessToken') ?? '';
  const link = useMemo(
    () => (selected ? `${window.location.origin}/c/share/${selected.code}` : ''),
    [selected],
  );

  const load = useCallback(async () => {
    if (!token()) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const response = await fetch(`${api}/api/v1/employee/share-codes`, {
        headers: { authorization: `Bearer ${token()}`, 'x-request-id': crypto.randomUUID() },
      });
      if ([401, 403].includes(response.status)) {
        setState('forbidden');
        return;
      }
      if (!response.ok) throw new Error('LOAD_FAILED');
      const data = (await response.json()).data as ShareCode[];
      setCodes(data);
      setSelected((current) => current ?? data[0] ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!link) {
      setQr('');
      return;
    }
    void QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: 'M' }).then(setQr);
  }, [link]);

  const create = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${api}/api/v1/employee/share-codes`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token()}`,
          'x-request-id': crypto.randomUUID(),
          'idempotency-key': crypto.randomUUID(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          scenario,
          targetPath: '/c/entry',
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });
      if (!response.ok) throw new Error('CREATE_FAILED');
      const data = (await response.json()).data as ShareCode;
      setSelected(data);
      setExpiresAt('');
      setMessage('分享码已生成，可扫码或复制链接发送。');
      await load();
    } catch {
      setMessage('生成失败，请检查失效时间后重试。');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (item: ShareCode) => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${api}/api/v1/employee/share-codes/${item.id}/revoke`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token()}`,
          'x-request-id': crypto.randomUUID(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ version: item.version }),
      });
      if (!response.ok) throw new Error('REVOKE_FAILED');
      setMessage('分享码已失效，后续扫码不会进入经营入口。');
      await load();
    } catch {
      setMessage('失效操作未完成，请刷新后重试。');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setMessage('分享链接已复制。');
    } catch {
      setMessage('无法自动复制，请长按链接手动复制。');
    }
  };

  if (state === 'loading') return <main className={styles.centered}>正在准备分享工具…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无法管理分享码</h1>
          <p>请登录拥有任务管理权限的员工账号。</p>
          <a href="/e/workbench">返回工作台</a>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>分享工具暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / 获客分享</p>
          <h1>把每次触达变成可追踪的入口</h1>
        </div>
        <a href="/e/workbench">工作台</a>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <section className={styles.hero}>
        <div>
          <span>可追踪分享</span>
          <h2>员工、活动和渠道，分别归因</h2>
          <p>二维码打开消费者分享页后，系统会记录来源码、场景和打开次数；失效码将被服务端拒绝。</p>
        </div>
        {qr ? (
          <img className={styles.qr} src={qr} alt="当前分享链接二维码" />
        ) : (
          <div className={styles.qrPlaceholder}>生成二维码</div>
        )}
      </section>
      <section className={styles.create}>
        <div>
          <h2>新建分享码</h2>
          <p>默认进入消费者经营入口，可选设置自动失效时间。</p>
        </div>
        <div className={styles.controls}>
          <label>
            场景
            <select
              aria-label="分享场景"
              value={scenario}
              onChange={(event) => setScenario(event.target.value as ShareCode['scenario'])}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            失效时间（可选）
            <input
              aria-label="分享码失效时间"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </label>
          <button className={styles.primary} disabled={busy} onClick={() => void create()}>
            {busy ? '生成中…' : '生成分享码'}
          </button>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2>我的分享码</h2>
          <span>{codes.length} 个</span>
        </div>
        {codes.length ? (
          <div className={styles.list}>
            {codes.map((item) => (
              <article
                className={selected?.id === item.id ? styles.selected : styles.card}
                key={item.id}
              >
                <button className={styles.cardBody} onClick={() => setSelected(item)}>
                  <span className={styles.code}>{item.code}</span>
                  <strong>{labels[item.scenario]}</strong>
                  <small>
                    {item.status === 'active'
                      ? `已打开 ${item.opens} 次`
                      : item.status === 'expired'
                        ? '已过期'
                        : '已失效'}
                  </small>
                </button>
                <div className={styles.cardActions}>
                  <button onClick={() => setSelected(item)}>查看二维码</button>
                  {item.status === 'active' && (
                    <button
                      className={styles.danger}
                      disabled={busy}
                      onClick={() => void revoke(item)}
                    >
                      立即失效
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>还没有分享码。创建一个用于本次客户触达。</p>
        )}
      </section>
      {selected && (
        <section className={styles.linkPanel}>
          <div>
            <h2>{labels[selected.scenario]}链接</h2>
            <p>{link}</p>
          </div>
          <button onClick={() => void copy()}>复制链接</button>
        </section>
      )}
    </main>
  );
}
