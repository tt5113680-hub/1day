'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
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
  if (state === 'loading') return <main className={styles.centered}><AppStatePanel kind="loading" title="正在加载租户治理" description="正在同步租户生命周期、配额与风险信息。" /></main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看平台租户管理" description="请使用平台运营账号登录。" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="error" title="租户治理暂不可用" description="请检查网络后重新加载。" action={<Button onClick={() => void load()}>重新加载</Button>} />
      </main>
    );
  return (
    <main className={styles.page}>
      <AdminPageHeader eyebrow="平台租户治理" title="租户开通、暂停与经营边界" description="生命周期变更需精确二次确认；套餐、配额和风险等级均由平台侧持久化与审计。" actions={<Button tone="secondary" onClick={() => void load()}>刷新</Button>} />
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
                <span>{x.slug} · <StatusBadge tone={x.status === 'active' ? 'success' : 'warning'}>{x.status === 'active' ? '开通' : '暂停'}</StatusBadge></span>
                <small>
                  {x.plan} · 风险 {x.riskLevel} · 逾期 {x.overdueTasks}
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
