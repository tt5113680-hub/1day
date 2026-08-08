'use client';
import { SessionApiClient } from '@oneday/session-client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type Customer = {
  id: string;
  displayName: string;
  version: number;
  owner: { id: string | null; name: string };
  segment: string;
  tags: string[];
  orders: number;
};
type Assignee = { id: string; displayName: string; title: string | null };
type Filters = { search: string; tag: string; segment: string; source: string };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const emptyFilters: Filters = { search: '', tag: '', segment: '', source: '' };

export default function ManagementCustomersPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<'export' | 'ownership' | null>(null);
  const headers = (idempotencyKey?: string) => ({
    'content-type': 'application/json',
    ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
  });
  const load = useCallback(
    async (nextFilters = applied) => {
      if (!(await sessionApi.context())) return setState('forbidden');
      setState('loading');
      try {
        const params = new URLSearchParams(
          Object.entries(nextFilters).filter(([, value]) => value.trim()),
        );
        const response = await sessionApi.request(`${api}/api/v1/management/customers?${params}`, {
          headers: headers(),
        });
        if ([401, 403].includes(response.status)) return setState('forbidden');
        if (!response.ok) throw Error('LOAD');
        setCustomers((await response.json()).data);
        setSelected([]);
        setState('ready');
      } catch {
        setState('error');
      }
    },
    [applied],
  );
  useEffect(() => void load(), [load]);
  useEffect(() => {
    void (async () => {
      if (!(await sessionApi.context())) return;
      const response = await sessionApi.request(`${api}/api/v1/management/customers/assignees`, {
        headers: headers(),
      });
      setAssignees(response.ok ? (await response.json()).data : []);
    })();
  }, []);

  const selectedCustomers = useMemo(
    () => customers.filter((customer) => selected.includes(customer.id)),
    [customers, selected],
  );
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  const apply = () => {
    setApplied(filters);
    void load(filters);
  };
  const requestExport = async () => {
    setBusy('export');
    setNotice('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/customers/exports`, {
        method: 'POST',
        headers: headers(crypto.randomUUID()),
        body: JSON.stringify({ filters: applied }),
      });
      if (!response.ok) throw Error('EXPORT');
      setNotice('导出申请已提交，待具备管理权限的审批人确认后才能下载。');
    } catch {
      setNotice('导出申请未提交成功，请稍后重试。');
    } finally {
      setBusy(null);
    }
  };
  const requestOwnership = async () => {
    if (!assigneeId || !selectedCustomers.length) return;
    setBusy('ownership');
    setNotice('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/customers/ownership/batch`,
        {
          method: 'POST',
          headers: headers(crypto.randomUUID()),
          body: JSON.stringify({
            items: selectedCustomers.map(({ id, version }) => ({ customerId: id, version })),
            toEmployeeId: assigneeId,
            reason: 'Management portfolio allocation',
          }),
        },
      );
      if (!response.ok) throw Error('OWNERSHIP');
      setNotice(`已发起 ${selectedCustomers.length} 位客户的归属转移审批。`);
      await load();
    } catch {
      setNotice('归属申请未提交成功；请刷新客户版本后重试。');
    } finally {
      setBusy(null);
    }
  };

  if (state === 'loading') return <main className={styles.centered}>正在加载客户资产…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看客户资产</h1>
          <p>请使用具备经营管理权限的账号登录后重试。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>客户资产暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / 客户资产</p>
          <h1>用客户分层驱动每一次经营动作</h1>
          <span>
            基于已沉淀的来源、标签、归属和订单数据筛选；导出与归属变更均保留审批和审计记录。
          </span>
        </div>
        <button
          className={styles.primary}
          disabled={busy === 'export'}
          onClick={() => void requestExport()}
        >
          {busy === 'export' ? '提交中…' : '申请导出'}
        </button>
      </header>
      <section className={styles.filters} aria-label="客户筛选">
        <label>
          搜索客户
          <input
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="客户名称"
          />
        </label>
        <label>
          标签
          <input
            value={filters.tag}
            onChange={(event) => setFilters({ ...filters, tag: event.target.value })}
            placeholder="如 VIP"
          />
        </label>
        <label>
          分层
          <select
            value={filters.segment}
            onChange={(event) => setFilters({ ...filters, segment: event.target.value })}
          >
            <option value="">全部分层</option>
            <option value="active">活跃</option>
            <option value="repurchase">复购</option>
            <option value="dormant">沉睡</option>
          </select>
        </label>
        <label>
          来源
          <input
            value={filters.source}
            onChange={(event) => setFilters({ ...filters, source: event.target.value })}
            placeholder="如 campaign"
          />
        </label>
        <button onClick={apply}>应用筛选</button>
      </section>
      <section className={styles.batch} aria-label="批量归属操作">
        <div>
          <strong>已选 {selected.length} 位客户</strong>
          <span>归属不会直接覆盖，系统将发起可追踪的转移审批。</span>
        </div>
        <select
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          aria-label="转入员工"
        >
          <option value="">选择转入员工</option>
          {assignees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
              {person.title ? ` · ${person.title}` : ''}
            </option>
          ))}
        </select>
        <button
          disabled={!selected.length || !assigneeId || busy === 'ownership'}
          onClick={() => void requestOwnership()}
        >
          {busy === 'ownership' ? '发起中…' : '批量发起归属审批'}
        </button>
      </section>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {customers.length === 0 ? (
        <section className={styles.empty}>
          <h2>没有匹配的客户</h2>
          <p>调整筛选条件，或在客户、来源和员工工作流中沉淀新的客户资产。</p>
        </section>
      ) : (
        <section className={styles.tableWrap} aria-label="客户资产列表">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="选择全部客户"
                    checked={selected.length === customers.length}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked ? customers.map((customer) => customer.id) : [],
                      )
                    }
                  />
                </th>
                <th>客户</th>
                <th>分层与标签</th>
                <th>当前归属</th>
                <th>有效订单</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`选择 ${customer.displayName}`}
                      checked={selected.includes(customer.id)}
                      onChange={() => toggle(customer.id)}
                    />
                  </td>
                  <td>
                    <Link href={`/m/customers/${customer.id}`}>{customer.displayName}</Link>
                    <small>{customer.id.slice(0, 8)}</small>
                  </td>
                  <td>
                    <span className={styles.segment}>{customer.segment}</span>
                    <div className={styles.tags}>
                      {customer.tags.length ? (
                        customer.tags.map((tag) => <span key={tag}>{tag}</span>)
                      ) : (
                        <em>无标签</em>
                      )}
                    </div>
                  </td>
                  <td>{customer.owner.name}</td>
                  <td>{customer.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
