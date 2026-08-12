'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button } from '@oneday/ui';

import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './share.module.css';
import { EmployeeWorkbenchKpi } from '../employee-workbench-kpi';

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
const statusLabels = {
  active: '进行中',
  expired: '已过期',
  revoked: '已失效',
};

const barWidth = (total: number, value: number) =>
  total > 0 ? `${Math.max(3, Math.round((value / total) * 100))}%` : '0%';

const countBy = (items: ShareCode[], keyOf: (item: ShareCode) => string) => {
  const buckets = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

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
      setMessage('分享码已失效，后续扫码不会进入工具入口。');
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

  const scenarioRows = countBy(codes, (item) => labels[item.scenario]);
  const statusRows = countBy(codes, (item) => statusLabels[item.status] ?? '未分类');
  const total = codes.length;

  return (
    <main className={styles.page} data-testid="employee-share">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 获客分享</span>
        <div className={styles.topBarActions}>
          <a className={styles.topBarRefresh} href="/e/workbench">
            工作台
          </a>
        </div>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <section className={styles.heroCard} aria-label="分享工具概述">
        <h1>把每次触达变成可追踪的入口</h1>
        <p>
          生成员工、活动、渠道分享码；消费者打开后的观看/访问/跳转痕迹会进入入口漏斗。记录来源码、场景与打开次数，并与看板「分享配对」对齐；失效码将被服务端拒绝。不含第三方成交结果。
        </p>
      </section>

      <EmployeeWorkbenchKpi page="share" />

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>分享数据概况</h2>
          <span className={styles.panelMeta}>source=local</span>
        </div>
        <div className={styles.summaryStrip} aria-label="分享数据概况">
          <div>
            <span>分享码</span>
            <strong>{total}</strong>
          </div>
          <div>
            <span>员工码</span>
            <strong>{codes.filter((item) => item.scenario === 'employee').length}</strong>
          </div>
          <div>
            <span>活动码</span>
            <strong>{codes.filter((item) => item.scenario === 'campaign').length}</strong>
          </div>
          <div>
            <span>渠道码</span>
            <strong>{codes.filter((item) => item.scenario === 'channel').length}</strong>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>分享分布</h2>
          <span className={styles.panelMeta}>分享码按真实档案行现场归类</span>
        </div>
        <div className={styles.distribution} aria-label="分享分布">
          <div className={styles.panelBlock}>
            <h3>分享场景分布</h3>
            {scenarioRows.length ? (
              <div className={styles.bars}>
                {scenarioRows.map((row) => (
                  <div className={styles.barRow} key={row.label}>
                    <span className={styles.barLabel}>{row.label}</span>
                    <span className={styles.barTrack}>
                      <span
                        className={styles.barFill}
                        data-testid="share-scenario-bar"
                        style={{ width: barWidth(total, row.value) }}
                      />
                    </span>
                    <span className={styles.barValue}>{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.barEmpty}>暂无记录</p>
            )}
          </div>
          <div className={styles.panelBlock}>
            <h3>分享状态分布</h3>
            {statusRows.length ? (
              <div className={styles.bars}>
                {statusRows.map((row) => (
                  <div className={styles.barRow} key={row.label}>
                    <span className={styles.barLabel}>{row.label}</span>
                    <span className={styles.barTrack}>
                      <span
                        className={styles.barFill}
                        data-testid="share-status-bar"
                        style={{ width: barWidth(total, row.value) }}
                      />
                    </span>
                    <span className={styles.barValue}>{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.barEmpty}>暂无记录</p>
            )}
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>新建分享码</h2>
        </div>
        <p className={styles.createHint}>默认进入消费者入口，可选设置自动失效时间。</p>
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
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>我的分享码</h2>
          <span className={styles.panelMeta}>{codes.length} 个</span>
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
      </section>
      {selected && (
        <section className={styles.panel} data-testid="share-link-panel">
          <div className={styles.panelHead}>
            <h2>{labels[selected.scenario]}链接</h2>
          </div>
          {qr ? (
            <div className={styles.qrRow}>
              <img className={styles.qr} src={qr} alt="当前分享链接二维码" />
              <span className={styles.qrHint}>扫码进入消费者分享页，打开痕迹计入入口漏斗。</span>
            </div>
          ) : null}
          <p className={styles.linkText}>{link}</p>
          <div className={styles.linkActions}>
            <Button onClick={() => void copy()}>复制链接</Button>
          </div>
        </section>
      )}
      <p className={styles.honest}>
        分享码打开痕迹保存于推广员工具（source=local）。分布按已抓取分享码档案行现场归类，仅统计观看/访问/跳转入口痕迹与打开次数，不含支付金额、不含第三方订单履约、不代履约美团/抖音订单、不代表第三方成交、非本平台下单。
      </p>
    </main>
  );
}
