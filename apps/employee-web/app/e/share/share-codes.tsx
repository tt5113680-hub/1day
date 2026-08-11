'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';

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
const sessionApi = new SessionApiClient(api);
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
  const link = useMemo(
    () => (selected ? `${window.location.origin}/c/share/${selected.code}` : ''),
    [selected],
  );

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/share-codes`, {
        headers: {},
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
      const response = await sessionApi.request(`${api}/api/v1/employee/share-codes`, {
        method: 'POST',
        headers: {
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
      const response = await sessionApi.request(
        `${api}/api/v1/employee/share-codes/${item.id}/revoke`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ version: item.version }),
        },
      );
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

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在准备分享工具"
          description="正在同步当前员工的可追踪分享入口。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法管理分享码"
          description="请登录拥有任务管理权限的员工账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="分享工具暂不可用"
          description="分享入口未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / 推广员工具 · 获客分享</p>
          <h1>把每次触达变成可追踪的入口</h1>
          <p className={styles.subhead}>
            生成员工/活动/渠道分享码；打开痕迹会进入入口漏斗。不含第三方成交结果。
          </p>
        </div>
        <Button
          tone="quiet"
          onClick={() => {
            window.location.href = '/e/workbench';
          }}
        >
          工作台
        </Button>
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
          <p>
            二维码打开消费者分享页后，系统记录来源码、场景与打开次数，并与看板「分享配对」对齐；失效码将被服务端拒绝。不含支付或第三方订单结果。
          </p>
        </div>
        {qr ? (
          <img className={styles.qr} src={qr} alt="当前分享链接二维码" />
        ) : (
          <div className={styles.qrPlaceholder}>生成二维码</div>
        )}
      </section>
      <Card className={styles.create}>
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
          <Button loading={busy} onClick={() => void create()}>
            生成分享码
          </Button>
        </div>
      </Card>
      <Card className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2>我的分享码</h2>
          <StatusBadge tone="info">{codes.length} 个</StatusBadge>
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
                  <Button tone="secondary" onClick={() => setSelected(item)}>
                    查看二维码
                  </Button>
                  {item.status === 'active' && (
                    <Button tone="danger" loading={busy} onClick={() => void revoke(item)}>
                      立即失效
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <AppStatePanel
            kind="empty"
            title="还没有分享码"
            description="创建一个用于本次客户触达。"
          />
        )}
      </Card>
      {selected && (
        <Card className={styles.linkPanel}>
          <div>
            <h2>{labels[selected.scenario]}链接</h2>
            <p>{link}</p>
          </div>
          <Button onClick={() => void copy()}>复制链接</Button>
        </Card>
      )}
    </main>
  );
}
