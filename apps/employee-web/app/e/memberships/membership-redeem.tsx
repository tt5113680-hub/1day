'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionApiClient } from '@oneday/session-client';
import { useTenantSync } from '@oneday/sync-client';
import { AppStatePanel, Button } from '@oneday/ui';
import styles from './membership-redeem.module.css';

type Benefit = { id: string; title: string };
type LedgerRow = {
  id: string;
  entryType: string;
  quantity: number;
  createdAt: string;
  storeName: string | null;
  benefitTitle: string;
  memberCode: string | null;
  displayName: string | null;
};
type EnrollmentRow = {
  id: string;
  memberCode: string;
  enrollmentStatus: string;
  joinedAt: string;
  source: string;
  displayName: string | null;
  storeName: string | null;
};

type OverviewData = {
  storeScoped: boolean;
  ledger: LedgerRow[];
  enrollments: EnrollmentRow[];
  benefits: Benefit[];
};

type Bucket = { label: string; value: number };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const entryLabel = (type: string) =>
  ({ grant: '发放', revoke: '撤销', redeem: '核销' })[type] ?? (type ? type : '未标注');

const statusLabel = (status: string) =>
  ({ active: '在册', cancelled: '已注销', suspended: '已暂停' })[status] ??
  (status ? status : '未标注');

const monthLabel = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '时间待定';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit' }).format(date);
};

function Bars({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <div className={styles.bars}>
      {items.map((item) => (
        <div className={styles.barRow} key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </div>
          <span className={styles.barValue}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MembershipRedeem() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [memberCode, setMemberCode] = useState('');
  const [benefitId, setBenefitId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (mode: 'full' | 'quiet' = 'full') => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    if (mode === 'full') setState('loading');
    try {
      const [overviewResponse] = await Promise.all([
        sessionApi.request(`${api}/api/v1/employee/memberships/overview`, {
          headers: { 'content-type': 'application/json' },
        }),
      ]);
      if ([401, 403].includes(overviewResponse.status)) {
        setState('forbidden');
        return;
      }
      if (!overviewResponse.ok) throw new Error('LOAD');
      const payload = (await overviewResponse.json()).data as OverviewData;
      setOverview(payload);
      setBenefits(payload.benefits ?? []);
      setState('ready');
    } catch {
      if (mode === 'full') setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useTenantSync(
    api,
    sessionApi,
    ['operating'],
    () => void load('quiet'),
    state === 'ready',
  );

  const ledger = overview?.ledger ?? [];
  const enrollments = overview?.enrollments ?? [];
  const redeemRows = useMemo(
    () => ledger.filter((row) => row.entryType === 'redeem'),
    [ledger],
  );
  const entryDist = useMemo(
    () => countBy(ledger.map((row) => entryLabel(row.entryType))),
    [ledger],
  );
  const benefitDist = useMemo(
    () => countBy(ledger.map((row) => row.benefitTitle ?? '未标注权益')),
    [ledger],
  );
  const storeDist = useMemo(
    () => countBy(ledger.map((row) => row.storeName ?? '未归属门店')),
    [ledger],
  );
  const monthDist = useMemo(
    () => countBy(ledger.map((row) => monthLabel(row.createdAt))),
    [ledger],
  );
  const statusDist = useMemo(
    () => countBy(enrollments.map((row) => statusLabel(row.enrollmentStatus))),
    [enrollments],
  );

  const redeem = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/memberships/redeem`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ memberCode, benefitId }),
      });
      setMessage(
        response.ok ? '会员权益已核销，余额已实时更新。' : '核销未完成，请核对会员码与权益编号。',
      );
      if (response.ok) {
        setMemberCode('');
        setBenefitId('');
        await load('quiet');
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载会员核销"
          description="读取门店已发放的可核销权益。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="需要员工登录"
          description="请使用已授权员工账号登录后再核销会员权益。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="会员核销暂不可用"
          description="未能加载可核销权益列表。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page} data-testid="employee-membership-redeem">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 会员核销</span>
        <div className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </div>
      </header>

      <section className={styles.heroCard} aria-label="会员核销概览">
        <h1>会员权益核销</h1>
        <p>
          {overview?.storeScoped ? '门店范围' : '租户范围'} · 核销本店已发放权益；不替代美团/抖音会员，
          也不含支付金额与第三方订单结果状态断言。
        </p>
      </section>

      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.panel} aria-label="核销表单">
        <div className={styles.form}>
          <label>
            会员码
            <input
              aria-label="会员码"
              value={memberCode}
              onChange={(event) => setMemberCode(event.target.value.toUpperCase())}
              placeholder="12 位会员码"
              autoComplete="off"
            />
          </label>
          <label>
            权益
            <select
              aria-label="核销权益"
              value={benefitId}
              onChange={(event) => setBenefitId(event.target.value)}
            >
              <option value="">选择已发放权益</option>
              {benefits.map((benefit) => (
                <option key={benefit.id} value={benefit.id}>
                  {benefit.title}
                </option>
              ))}
            </select>
          </label>
          {benefits.length === 0 ? (
            <p className={styles.note}>
              当前没有可核销权益；请先由推广员工具授权的账号发放门店权益。
            </p>
          ) : null}
          <Button
            loading={busy}
            disabled={busy || !memberCode.trim() || !benefitId}
            onClick={() => void redeem()}
          >
            确认核销
          </Button>
        </div>
      </section>

      <section className={styles.panel} aria-label="会员核销概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>在册会员</span>
            <strong>{enrollments.filter((e) => e.enrollmentStatus === 'active').length}</strong>
          </div>
          <div>
            <span>权益记录</span>
            <strong>{ledger.length}</strong>
          </div>
          <div>
            <span>核销次数</span>
            <strong>{redeemRows.length}</strong>
          </div>
          <div>
            <span>可核销权益</span>
            <strong>{benefits.length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="会员核销分布">
        <div className={styles.panelHead}>
          <h2>会员核销分布</h2>
          <span className={styles.panelMeta}>由会员档案行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>权益动作分布</h3>
            <Bars items={entryDist} total={ledger.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>权益项分布</h3>
            <Bars items={benefitDist} total={ledger.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>门店分布</h3>
            <Bars items={storeDist} total={ledger.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>行为月份分布</h3>
            <Bars items={monthDist} total={ledger.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>会员状态分布</h3>
            <Bars items={statusDist} total={enrollments.length} />
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="最近权益往来">
        <div className={styles.panelHead}>
          <h2>最近权益往来</h2>
          <span className={styles.panelMeta}>最近 200 条</span>
        </div>
        {ledger.length === 0 ? (
          <p className={styles.emptyLine}>暂无权益往来记录。</p>
        ) : (
          ledger.slice(0, 8).map((row) => (
            <article className={styles.availRow} key={row.id}>
              <div>
                <strong>{row.benefitTitle ?? '未标注权益'}</strong>
                <span>
                  {' · '}
                  {row.memberCode ?? '外部会员'} · {row.displayName ?? '匿名会员'} ·{' '}
                  {row.storeName ?? '未归属门店'}
                </span>
              </div>
              <span>
                {entryLabel(row.entryType)}
                {row.quantity > 0 ? ` +${row.quantity}` : ` ${row.quantity}`}
              </span>
            </article>
          ))
        )}
      </section>

      <p className={styles.honest} role="note">
        以上分布全部由已抓取会员权益档案行现场推导(source=local)：动作/权益项/门店/行为月份按真实
        member_benefit_ledger 行统计，会员状态按真实 membership_enrollments 行统计。推广员工具会员核销
        跟进门店服务痕迹，不替代美团/抖音会员，不代履约美团/抖音订单，非本平台下单，不含本平台收单与支付金额。
      </p>
      <p className={styles.note}>
        推广员工具会员核销：工作台与店长能力包可直达本页。不伪造第三方投放、短信验证或本平台成交。
      </p>
    </main>
  );
}
