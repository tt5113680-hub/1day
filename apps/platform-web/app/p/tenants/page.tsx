'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
type Tenant = {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended';
  version: number;
  plan: string;
  quotas: { users: number; customers: number; stores: number };
  riskLevel: string;
  overdueTasks: number;
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const planLabel = (plan: string) =>
  ({ starter: '起步版', growth: '成长版', enterprise: '企业版' })[plan] ?? plan;
const riskLabel = (risk: string) => ({ low: '低', medium: '中', high: '高' })[risk] ?? risk;
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
export default function TenantsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [items, setItems] = useState<Tenant[]>([]),
    [selected, setSelected] = useState<Tenant | null>(null),
    [confirmation, setConfirmation] = useState(''),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false);
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/platform/tenants`, { headers: headers() });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      const rows = (await r.json()).data;
      setItems(rows);
      setSelected((current) => rows.find((x: Tenant) => x.id === current?.id) ?? rows[0] ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await sessionApi.request(`${api}/api/v1/platform/tenants/${selected.id}`, {
        method: 'PUT',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ ...selected, confirmation }),
      });
      if (r.status === 409) return setNote('租户已被其他平台管理员更新，请刷新后重试。');
      if (r.status === 400) return setNote('二次确认文本或设置输入不符合要求。');
      if (!r.ok) throw Error();
      setNote('租户生命周期与经营配额已保存，并已记录审计与事件。');
      setConfirmation('');
      await load();
    } catch {
      setNote('保存失败，请检查平台权限后重试。');
    } finally {
      setSaving(false);
    }
  };
  const counts = (fn: (x: Tenant) => string) => {
    const map = new Map<string, number>();
    for (const x of items) {
      const key = fn(x);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  };
  const statusCounts = useMemo(
    () =>
      counts((x) => (x.status === 'active' ? '开通中' : '已暂停')).sort(
        (a, b) => b.value - a.value,
      ),
    [items],
  );
  const planCounts = useMemo(
    () => counts((x) => planLabel(x.plan)).sort((a, b) => b.value - a.value),
    [items],
  );
  const riskCounts = useMemo(
    () => counts((x) => `${riskLabel(x.riskLevel)}风险`).sort((a, b) => b.value - a.value),
    [items],
  );
  const overdueCounts = useMemo(
    () =>
      counts((x) =>
        x.overdueTasks <= 0 ? '无逾期' : x.overdueTasks <= 5 ? '轻负担 1-5' : '重负担 6+',
      ).sort((a, b) => b.value - a.value),
    [items],
  );
  const quotaCounts = useMemo(
    () =>
      counts((x) =>
        x.quotas.users <= 10
          ? '用户配额 ≤10'
          : x.quotas.users <= 50
            ? '用户配额 11-50'
            : '用户配额 51+',
      ).sort((a, b) => b.value - a.value),
    [items],
  );
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载平台租户治理"
          description="正在同步租户生命周期、配额与风险信息。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看平台租户管理"
          description="请使用平台运营账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="租户治理暂不可用"
          description="请检查网络后重新加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page} data-testid="platform-tenants">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 平台租户管理</span>
        <span className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </span>
      </header>

      <section className={styles.heroCard} aria-label="平台租户管理说明">
        <h1>租户开通、暂停与工具边界</h1>
        <p>
          生命周期变更需精确二次确认；套餐、配额和风险等级均由平台侧持久化与审计。租户是工具开通经济体，不涉及本平台收款、非本平台下单。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="平台租户概况">
        <div>
          <span>租户</span>
          <strong>{items.length}</strong>
        </div>
        <div>
          <span>开通中</span>
          <strong>{items.filter((x) => x.status === 'active').length}</strong>
        </div>
        <div>
          <span>已暂停</span>
          <strong>{items.filter((x) => x.status === 'suspended').length}</strong>
        </div>
        <div>
          <span>高风险</span>
          <strong>{items.filter((x) => x.riskLevel === 'high').length}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="平台租户运营分布">
        <div className={styles.panelBlock}>
          <h2>租户状态分布</h2>
          <ul className={styles.bars}>
            {statusCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>套餐分布</h2>
          <ul className={styles.bars}>
            {planCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>风险等级分布</h2>
          <ul className={styles.bars}>
            {riskCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>逾期任务分布</h2>
          <ul className={styles.bars}>
            {overdueCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>用户配额分布</h2>
          <ul className={styles.bars}>
            {quotaCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取平台租户档案行现场推导（source=local）：租户状态、套餐、风险等级、逾期任务与用户配额；
        租户是工具开通与整合经济体，不包含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据。
      </p>

      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
      <section className={styles.layout}>
        <section className={styles.list}>
          {items.length ? (
            items.map((x) => (
              <button
                key={x.id}
                className={selected?.id === x.id ? styles.selected : ''}
                onClick={() => {
                  setSelected(x);
                  setConfirmation('');
                }}
              >
                <strong>{x.name}</strong>
                <span>
                  {x.slug} ·{' '}
                  <StatusBadge tone={x.status === 'active' ? 'success' : 'warning'}>
                    {x.status === 'active' ? '开通' : '暂停'}
                  </StatusBadge>
                </span>
                <small>
                  {planLabel(x.plan)} · 风险 {riskLabel(x.riskLevel)}· 逾期 {x.overdueTasks}
                </small>
              </button>
            ))
          ) : (
            <p>暂无租户。</p>
          )}
        </section>
        {selected && (
          <section className={styles.panel}>
            <h2>{selected.name}</h2>
            <label>
              状态
              <select
                aria-label="租户状态"
                value={selected.status}
                onChange={(e) =>
                  setSelected({ ...selected, status: e.target.value as Tenant['status'] })
                }
              >
                <option value="active">开通</option>
                <option value="suspended">暂停</option>
              </select>
            </label>
            <label>
              套餐
              <select
                aria-label="套餐"
                value={selected.plan}
                onChange={(e) => setSelected({ ...selected, plan: e.target.value })}
              >
                <option value="starter">starter</option>
                <option value="growth">growth</option>
                <option value="enterprise">enterprise</option>
              </select>
            </label>
            <label>
              风险等级
              <select
                aria-label="风险等级"
                value={selected.riskLevel}
                onChange={(e) => setSelected({ ...selected, riskLevel: e.target.value })}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label>
              用户配额
              <input
                aria-label="用户配额"
                type="number"
                value={selected.quotas.users}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    quotas: { ...selected.quotas, users: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              二次确认
              <input
                aria-label="二次确认"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={`${selected.status === 'suspended' ? 'SUSPEND' : 'ACTIVATE'}:${selected.slug}`}
              />
            </label>
            <small>
              请输入 {selected.status === 'suspended' ? 'SUSPEND' : 'ACTIVATE'}:{selected.slug}{' '}
              才能保存。
            </small>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? '正在保存…' : '保存租户设置'}
            </Button>
          </section>
        )}
      </section>
    </main>
  );
}
