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
  tier: string;
  expires_at: string | null;
  last_active_at: string | null;
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
type BenefitRule = {
  id: string;
  title: string;
  tier: string;
  benefits_config: Array<{ benefitId: string; benefitTitle: string; maxQuantity: number }>;
  validity_days: number;
  enforce_quantity: boolean;
  enabled: boolean;
  updated_at: string;
};
type Renewal = {
  id: string;
  member_code: string;
  tier: string;
  display_name: string;
  store_name: string | null;
  joined_at: string | null;
  expires_at: string | null;
  last_active_at: string | null;
};
type AlertRow = {
  id: string;
  member_code: string;
  tier: string;
  display_name: string;
  store_name: string | null;
  alert_type: string;
};
type AlertData = { suspended: AlertRow[]; expired: AlertRow[]; noRecentActivity: AlertRow[] };
type CohortRow = {
  cohortMonth: string;
  enrolled: number;
  stillValid: number;
  expired: number;
  active30d: number;
};
type CohortData = { months: number; cohorts: CohortRow[]; disclaimer: string };
type TierRow = {
  tier: string | null;
  enrolled: number;
  stillValid: number;
  expiringSoon: number;
  expired: number;
  validityDays: number | null;
  ruleEnabled: boolean | null;
  ruleTitle: string | null;
};
type TierData = { tiers: TierRow[]; disclaimer: string };
type Data = {
  enrollments: Enrollment[];
  benefits: Benefit[];
  rules: BenefitRule[];
  renewals: Renewal[];
  alerts: AlertData;
  cohort: CohortData | null;
  tiers: TierData | null;
};

const entryLabel = (type: string) =>
  type === 'grant' ? '发放' : type === 'revoke' ? '吊销' : type === 'redeem' ? '核销' : type;

export default function MembershipsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [ruleTier, setRuleTier] = useState('');
  const [ruleValidity, setRuleValidity] = useState('365');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchBenefitId, setBatchBenefitId] = useState('');
  const [cohortMonths, setCohortMonths] = useState<3 | 6 | 12 | 24>(6);
  const [expiryDays, setExpiryDays] = useState('90');

  const load = useCallback(async () => {
    if (!(await client.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const [membership, rules, renewals, alerts, cohort, tiers] = await Promise.all([
        client.request(`${api}/api/v1/management/memberships`),
        client.request(`${api}/api/v1/management/memberships/rules`),
        client.request(`${api}/api/v1/management/memberships/renewals`),
        client.request(`${api}/api/v1/management/memberships/alerts`),
        client.request(`${api}/api/v1/management/memberships/cohort?months=${cohortMonths}`),
        client.request(`${api}/api/v1/management/memberships/tiers`),
      ]);
      if ([401, 403].includes(membership.status)) {
        setState('forbidden');
        return;
      }
      if (!membership.ok) throw new Error('LOAD');
      const baseData = (await membership.json()).data as Data;
      setData({
        ...baseData,
        rules: rules.ok ? ((await rules.json()).data as BenefitRule[]) : [],
        renewals: renewals.ok ? ((await renewals.json()).data as Renewal[]) : [],
        alerts: alerts.ok
          ? ((await alerts.json()).data as AlertData)
          : { suspended: [], expired: [], noRecentActivity: [] },
        cohort: cohort.ok ? ((await cohort.json()).data as CohortData) : null,
        tiers: tiers.ok ? ((await tiers.json()).data as TierData) : null,
      });
      setState('ready');
    } catch {
      setState('error');
    }
  }, [cohortMonths]);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const batchGrant = async () => {
    if (!batchBenefitId || selectedIds.length < 1) return;
    setBusy(true);
    setNote('');
    try {
      const response = await client.request(`${api}/api/v1/management/memberships/batch-grants`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({
          enrollmentIds: selectedIds,
          benefitId: batchBenefitId,
          quantity: 1,
        }),
      });
      if (!response.ok) {
        setNote('批量发放未完成，请刷新后重试。');
        return;
      }
      const result = (await response.json()).data as {
        grantedCount: number;
        skippedCount: number;
      };
      setNote(`批量发放完成：成功 ${result.grantedCount}，跳过 ${result.skippedCount}。`);
      setSelectedIds([]);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const batchExpiry = async () => {
    if (selectedIds.length < 1) return;
    const addDays = Number(expiryDays);
    if (!Number.isInteger(addDays) || addDays < 1) {
      setNote('请输入 1–3650 的正整数天数。');
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const response = await client.request(`${api}/api/v1/management/memberships/batch-expiry`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ enrollmentIds: selectedIds, addDays }),
      });
      if (!response.ok) {
        setNote('批量到期策略未应用，请刷新后重试。');
        return;
      }
      const result = (await response.json()).data as {
        updatedCount: number;
        skippedCount: number;
      };
      setNote(`批量到期策略已应用：成功 ${result.updatedCount}，跳过 ${result.skippedCount}。`);
      setSelectedIds([]);
      await load();
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

  const saveRule = async () => {
    const tier = ruleTier.trim();
    if (!tier || !data) {
      setNote('请填写等级标识再保存权益规则。');
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const response = await client.request(`${api}/api/v1/management/memberships/rules`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({
          title: tier,
          tier,
          validityDays: Number(ruleValidity),
          enforceQuantity: true,
          enabled: true,
          benefitsConfig: data.benefits.map((benefit) => ({
            benefitId: benefit.id,
            benefitTitle: benefit.title,
            maxQuantity: 1,
          })),
        }),
      });
      setNote(
        response.ok
          ? '等级权益规则已保存（规则不含储值与支付）。'
          : '规则保存未完成，请刷新后重试。',
      );
      if (response.ok) await load();
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
  const renewals = data.renewals ?? [];
  const alertData = data.alerts ?? { suspended: [], expired: [], noRecentActivity: [] };
  const rules = data.rules ?? [];

  const alertLabel = (type: string) =>
    type === 'suspended'
      ? '已暂停/已取消'
      : type === 'expired'
        ? '有效期已过'
        : type === 'no_recent_activity'
          ? '长期未核销'
          : type;
  const alertRows: AlertRow[] = [
    ...(alertData.suspended ?? []),
    ...(alertData.expired ?? []),
    ...(alertData.noRecentActivity ?? []),
  ];

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
          发放、批量发放、吊销与时间线共用 member_benefit_ledger；入会月 cohort
          为本地档案聚合。员工按会员码核销。不含储值/支付，不伪造第三方投放或本平台成交。
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
        <div>
          <span>已选批量</span>
          <strong>{selectedIds.length}</strong>
        </div>
      </section>

      <section className={styles.panelBlock} aria-label="入会月 cohort">
        <h2>入会月 cohort</h2>
        <p className={styles.muted}>
          {data.cohort?.disclaimer ??
            'cohort 由本地 membership_enrollments 入会月聚合；不含储值/支付/GMV。'}
        </p>
        <div className={styles.actions}>
          {([3, 6, 12, 24] as const).map((m) => (
            <Button
              key={m}
              tone={cohortMonths === m ? 'primary' : 'secondary'}
              disabled={busy}
              onClick={() => setCohortMonths(m)}
            >
              {m} 个月
            </Button>
          ))}
        </div>
        <ul className={styles.bars}>
          {(data.cohort?.cohorts ?? []).map((row) => (
            <li key={row.cohortMonth} className={styles.barRow}>
              <span className={styles.barLabel}>{row.cohortMonth}</span>
              <span className={styles.barTrack}>
                <span
                  className={styles.barFill}
                  style={{
                    width: `${
                      row.enrolled ? (row.stillValid / Math.max(1, row.enrolled)) * 100 : 0
                    }%`,
                  }}
                />
              </span>
              <span className={styles.barValue}>
                {row.enrolled}/{row.stillValid}/{row.active30d}
              </span>
            </li>
          ))}
          {!data.cohort?.cohorts.length && (
            <li className={styles.muted}>窗口内暂无入会 cohort。</li>
          )}
        </ul>
        <p className={styles.sub}>条数/仍有效/近30天活跃</p>
      </section>

      <section className={styles.panelBlock} aria-label="会员等级分布">
        <h2>会员等级分布</h2>
        <p className={styles.muted}>
          {data.tiers?.disclaimer ??
            '等级分布由本地 membership_enrollments 与规则档聚合；不含储值/支付/GMV。'}
        </p>
        <ul className={styles.bars}>
          {(data.tiers?.tiers ?? []).map((row) => {
            const tier = row.tier ?? '未分配等级';
            const total = Math.max(1, row.enrolled);
            return (
              <li
                key={tier}
                className={styles.barRow}
                data-testid={`tier-${row.tier ?? 'unassigned'}`}
              >
                <span className={styles.barLabel}>
                  {tier}
                  {row.ruleEnabled === false ? '（规则停用）' : ''}
                  {row.validityDays != null ? ` · ${row.validityDays}天` : ''}
                </span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${Math.round((row.stillValid / total) * 100)}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>
                  在册 {row.enrolled} · 有效 {row.stillValid} · 临期 {row.expiringSoon} · 过期{' '}
                  {row.expired}
                </span>
              </li>
            );
          })}
          {!data.tiers?.tiers.length && <li className={styles.barEmpty}>暂无等级记录</li>}
        </ul>
        <p className={styles.sub}>等级 · 在册 / 仍有效 / 14天内临期 / 已过期</p>
      </section>

      <section className={styles.panelBlock} aria-label="批量到期策略">
        <h2>批量到期策略</h2>
        <p className={styles.muted}>
          对勾选的在册会员一次性能延后有效期（无到期设置则自今天起算）。仅调整本地会员档案
          expires_at，可审计，不含储值/支付。
        </p>
        <div className={styles.actions}>
          <label className={styles.ruleField}>
            延后天数
            <input
              className={styles.ruleInput}
              value={expiryDays}
              onChange={(event) => setExpiryDays(event.target.value)}
              aria-label="批量延后天数"
              type="number"
              min={1}
              max={3650}
            />
          </label>
          <Button disabled={busy || selectedIds.length < 1} onClick={() => void batchExpiry()}>
            应用到期策略（{selectedIds.length}）
          </Button>
          <Button
            tone="secondary"
            disabled={busy || selectedIds.length < 1}
            onClick={() => setSelectedIds([])}
          >
            清空选择
          </Button>
        </div>
      </section>

      <section className={styles.panelBlock} aria-label="批量发放">
        <h2>批量发放</h2>
        <p className={styles.muted}>勾选下方会员后选择权益，一次写入多条 ledger（最多 50）。</p>
        <div className={styles.actions}>
          <select
            className={styles.select}
            value={batchBenefitId}
            onChange={(event) => setBatchBenefitId(event.target.value)}
            aria-label="批量发放权益"
          >
            <option value="">选择权益</option>
            {data.benefits.map((benefit) => (
              <option key={benefit.id} value={benefit.id}>
                {benefit.title}
              </option>
            ))}
          </select>
          <Button
            disabled={busy || !batchBenefitId || selectedIds.length < 1}
            onClick={() => void batchGrant()}
          >
            批量发放（{selectedIds.length}）
          </Button>
          <Button
            tone="secondary"
            disabled={busy || selectedIds.length < 1}
            onClick={() => setSelectedIds([])}
          >
            清空选择
          </Button>
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

      <section className={styles.panelBlock} aria-label="等级权益规则">
        <h2>等级/权益规则</h2>
        <p className={styles.muted}>
          规则为等级→权益的配置（有效天数、是否限量、启用），不含储值、不含支付、不代第三方成交。
        </p>
        <div className={styles.rules}>
          {rules.length ? (
            rules.map((rule) => (
              <div key={rule.id} className={styles.ruleRow} data-testid={`rule-${rule.tier}`}>
                <StatusBadge tone={rule.enabled ? 'success' : 'info'}>
                  {rule.enabled ? '启用' : '停用'}
                </StatusBadge>
                <span className={styles.ruleTier}>等级 {rule.tier}</span>
                <span className={styles.ruleTitle}>{rule.title}</span>
                <span className={styles.sub}>
                  {rule.benefits_config.length} 项权益 · 有效期 {rule.validity_days} 天
                </span>
              </div>
            ))
          ) : (
            <p className={styles.muted}>尚无等级权益规则，可在下方按已建档权益快速建立。</p>
          )}
        </div>
        <div className={styles.rules}>
          <label className={styles.ruleField}>
            等级
            <input
              className={styles.ruleInput}
              value={ruleTier}
              onChange={(event) => setRuleTier(event.target.value)}
              placeholder="如 gold / silver"
            />
          </label>
          <label className={styles.ruleField}>
            有效天数
            <input
              className={styles.ruleInput}
              value={ruleValidity}
              onChange={(event) => setRuleValidity(event.target.value)}
              placeholder="365"
            />
          </label>
          <Button
            tone="secondary"
            disabled={busy || !data.benefits.length}
            onClick={() => void saveRule()}
          >
            保存等级权益规则
          </Button>
        </div>
      </section>

      <section className={styles.panelBlock} aria-label="到期提醒">
        <h2>到期提醒</h2>
        <p className={styles.muted}>
          真实档案信号：有效期临近 3
          天、已过期仍在册、或长期无核销活跃，均来自会员档案，不含成交金额。
        </p>
        <ul className={styles.alertList}>
          {renewals.length ? (
            renewals.map((item) => (
              <li key={item.id} className={styles.alertRow}>
                <StatusBadge tone="info">{item.tier}</StatusBadge>
                <span>
                  {item.display_name} · {item.member_code}
                </span>
                <span className={styles.sub}>
                  {item.store_name ?? '未绑定门店'} ·{' '}
                  {item.expires_at
                    ? `有效期至 ${new Date(item.expires_at).toLocaleDateString('zh-CN')}`
                    : item.last_active_at
                      ? `最近核销 ${new Date(item.last_active_at).toLocaleDateString('zh-CN')}`
                      : '长期无活跃'}
                </span>
              </li>
            ))
          ) : (
            <li className={styles.muted}>暂无到期提醒。</li>
          )}
        </ul>
      </section>

      <section className={styles.panelBlock} aria-label="异常告警">
        <h2>异常告警</h2>
        <p className={styles.muted}>
          真实档案信号：已暂停/已取消、有效期已过仍在册、长期未核销，均来自会员档案。
        </p>
        <ul className={styles.alertList}>
          {alertRows.length ? (
            alertRows.map((item) => (
              <li key={`${item.alert_type}-${item.id}`} className={styles.alertRow}>
                <StatusBadge tone="danger">{alertLabel(item.alert_type)}</StatusBadge>
                <span>
                  {item.display_name} · {item.member_code} · {item.tier}
                </span>
                <span className={styles.sub}>{item.store_name ?? '未绑定门店'}</span>
              </li>
            ))
          ) : (
            <li className={styles.muted}>暂无异常告警。</li>
          )}
        </ul>
      </section>

      <section className={styles.list} aria-label="会员列表">
        {data.enrollments.length ? (
          data.enrollments.map((item) => (
            <div key={item.id} className={styles.panel} data-testid={`membership-card-${item.id}`}>
              <div className={styles.title}>
                <label className={styles.selectRow}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    aria-label={`选择 ${item.member_code}`}
                  />
                  <h2>
                    {item.display_name} · {item.member_code}
                  </h2>
                </label>
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
                {item.store_name ?? '未绑定门店'} · 等级 {item.tier} · 入会于{' '}
                {new Date(item.joined_at).toLocaleString('zh-CN')}
                {item.expires_at
                  ? ` · 有效期至 ${new Date(item.expires_at).toLocaleDateString('zh-CN')}`
                  : ''}
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
