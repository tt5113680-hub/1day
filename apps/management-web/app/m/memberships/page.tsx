'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const client = new SessionApiClient(api);

type Enrollment = {
  id: string;
  member_code: string;
  display_name: string;
  store_name: string;
  joined_at: string;
};
type Benefit = { id: string; title: string };
type LedgerEntry = {
  id: string;
  benefit_id: string;
  benefit_title: string;
  entry_type: string;
  quantity: number;
  balance_after: number;
  business_reference: string;
  created_at: string;
};
type Balance = { benefit_id: string; title: string; balance: number };
type LedgerData = {
  enrollment: { id: string; memberCode: string; displayName: string };
  balances: Balance[];
  entries: LedgerEntry[];
};
type Data = { enrollments: Enrollment[]; benefits: Benefit[] };

const entryLabel = (type: string) =>
  type === 'grant' ? '发放' : type === 'revoke' ? '吊销' : type === 'redeem' ? '核销' : type;

export default function MembershipsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerData | null>(null);

  const load = useCallback(async () => {
    if (!(await client.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const response = await client.request(`${api}/api/v1/management/memberships`);
      if ([401, 403].includes(response.status)) {
        setState('forbidden');
        return;
      }
      if (!response.ok) throw new Error('LOAD');
      setData((await response.json()).data as Data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadLedger = async (enrollmentId: string) => {
    const response = await client.request(
      `${api}/api/v1/management/memberships/${enrollmentId}/ledger`,
    );
    if (!response.ok) throw new Error('LEDGER');
    setLedger((await response.json()).data as LedgerData);
  };

  const toggleLedger = async (enrollmentId: string) => {
    setNote('');
    if (openId === enrollmentId) {
      setOpenId(null);
      setLedger(null);
      return;
    }
    setBusy(true);
    try {
      await loadLedger(enrollmentId);
      setOpenId(enrollmentId);
    } catch {
      setNote('无法加载权益时间线，请刷新后重试。');
    } finally {
      setBusy(false);
    }
  };

  const grant = async (id: string, benefitId: string) => {
    setBusy(true);
    setNote('');
    try {
      const response = await client.request(`${api}/api/v1/management/memberships/${id}/grants`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ benefitId, quantity: 1 }),
      });
      setNote(response.ok ? '权益已发放，员工可按会员码核销。' : '权益发放未完成，请刷新后重试。');
      if (response.ok && openId === id) await loadLedger(id);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string, benefitId: string) => {
    setBusy(true);
    setNote('');
    try {
      const response = await client.request(`${api}/api/v1/management/memberships/${id}/revokes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ benefitId, quantity: 1 }),
      });
      setNote(
        response.ok
          ? '权益已吊销并写入时间线；余额已扣减。'
          : '吊销未完成；可能余额不足或权限不足。',
      );
      if (response.ok && openId === id) await loadLedger(id);
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载会员与权益" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看会员"
          description="需要推广员工具授权或门店范围的 tenant.read。"
        />
      </main>
    );
  if (state === 'error' || !data)
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="会员目录暂不可用"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  const enrollments = data.enrollments;
  const storeCounts = new Map<string, number>();
  for (const item of enrollments) {
    const store = item.store_name ?? '未绑定门店';
    storeCounts.set(store, (storeCounts.get(store) ?? 0) + 1);
  }
  const byStore = [...storeCounts.entries()].map(([key, value]) => ({ key, value }));
  const joinCounts = new Map<string, number>();
  for (const item of enrollments) {
    const month = new Date(item.joined_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
    });
    joinCounts.set(month, (joinCounts.get(month) ?? 0) + 1);
  }
  const byJoin = [...joinCounts.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, value]) => ({
      key,
      value,
    }));

  const coveredStores = new Set(enrollments.map((item) => item.store_name ?? '未绑定门店'));
  const benefitCount = data.benefits.length;
  const enrolledCount = enrollments.length;

  return (
    <main className={styles.page} data-testid="management-memberships">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 会员中心</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="会员与权益概况">
        <h1>会员与权益</h1>
        <p>
          发放、吊销与时间线共用
          member_benefit_ledger；员工按会员码核销。权益与核销均在推广员工具授权范围内，不伪造第三方投放或本平台成交。
        </p>
      </section>

      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}

      <section className={styles.summaryStrip} aria-label="会员数据概况">
        <div>
          <span>在册会员</span>
          <strong>{enrolledCount}</strong>
        </div>
        <div>
          <span>权益项</span>
          <strong>{benefitCount}</strong>
        </div>
        <div>
          <span>覆盖门店</span>
          <strong>{coveredStores.size}</strong>
        </div>
      </section>

      <section className={styles.panel} aria-label="会员分布">
        <div className={styles.panelBlock}>
          <h2>门店分布</h2>
          <ul className={styles.bars}>
            {byStore.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${enrollments.length ? (b.value / enrollments.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!enrollments.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>入会时间分布</h2>
          <ul className={styles.bars}>
            {byJoin.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${enrollments.length ? (b.value / enrollments.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!enrollments.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <section className={styles.list} aria-label="会员列表">
        {data.enrollments.length ? (
          data.enrollments.map((item) => (
            <div key={item.id} className={styles.panel} data-testid={`membership-card-${item.id}`}>
              <div className={styles.title}>
                <h2>
                  {item.display_name} · {item.member_code}
                </h2>
                <Button
                  tone="secondary"
                  disabled={busy}
                  data-testid={`membership-timeline-${item.id}`}
                  onClick={() => void toggleLedger(item.id)}
                >
                  {openId === item.id ? '收起时间线' : '发放/吊销时间线'}
                </Button>
              </div>
              <p className={styles.sub}>
                {item.store_name ?? '未绑定门店'} · 入会于{' '}
                {new Date(item.joined_at).toLocaleString('zh-CN')}
              </p>
              <div className={styles.actions}>
                {data.benefits.map((benefit) => (
                  <Button
                    key={benefit.id}
                    tone="secondary"
                    disabled={busy}
                    onClick={() => void grant(item.id, benefit.id)}
                  >
                    发放：{benefit.title}
                  </Button>
                ))}
              </div>
              {openId === item.id && ledger ? (
                <div className={styles.timeline} data-testid="membership-ledger">
                  <h3>当前余额</h3>
                  <ul className={styles.balances} data-testid="membership-balances">
                    {ledger.balances.map((balance) => (
                      <li key={balance.benefit_id}>
                        <span>
                          {balance.title} · 余额 {balance.balance}
                        </span>
                        <Button
                          tone="secondary"
                          disabled={busy || balance.balance < 1}
                          onClick={() => void revoke(item.id, balance.benefit_id)}
                        >
                          吊销 1 次
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <h3>时间线</h3>
                  {ledger.entries.length === 0 ? (
                    <p className={styles.muted}>尚无发放 / 核销 / 吊销记录。</p>
                  ) : (
                    <ol className={styles.entries} data-testid="membership-entries">
                      {ledger.entries.map((entry) => (
                        <li key={entry.id}>
                          <StatusBadge
                            tone={
                              entry.entry_type === 'grant'
                                ? 'success'
                                : entry.entry_type === 'revoke'
                                  ? 'danger'
                                  : 'info'
                            }
                          >
                            {entryLabel(entry.entry_type)}
                          </StatusBadge>
                          <span>
                            {entry.benefit_title} · {entry.quantity > 0 ? '+' : ''}
                            {entry.quantity} → 余额 {entry.balance_after}
                          </span>
                          <small>{new Date(entry.created_at).toLocaleString('zh-CN')}</small>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <AppStatePanel
            kind="empty"
            title="暂无会员"
            description="Consumer 完成授权入会后会出现在这里。"
          />
        )}
      </section>
    </main>
  );
}
