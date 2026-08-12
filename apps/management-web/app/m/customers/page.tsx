'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge, businessLabel, customerNameCopy } from '@oneday/ui';

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
  rfm?: {
    layer: string | null;
    recencyDays: number | null;
    frequencyCount: number | null;
    reachCount: number | null;
  } | null;
};
type Assignee = { id: string; displayName: string; title: string | null };
type Filters = { search: string; tag: string; segment: string; source: string; layer: string };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const emptyFilters: Filters = { search: '', tag: '', segment: '', source: '', layer: '' };
const ownerNameCopy = (value: string) =>
  value === 'Store Manager' ? '门店负责人' : value === 'Follow-up Employee' ? '跟进员工' : value;
const segmentCopy: Record<string, string> = {
  active: '活跃',
  repurchase: '复购',
  dormant: '沉睡',
};
const rfmLayerCopy: Record<string, string> = {
  高价值: '高价值',
  活跃: '活跃',
  温和互动: '温和互动',
  需唤醒: '需唤醒',
  沉睡: '沉睡',
};

export default function ManagementCustomersPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<'export' | 'ownership' | 'rfm' | 'tags' | null>(null);
  const [rfmSummary, setRfmSummary] = useState<{
    total: number;
    layers: Record<string, number>;
    dormant: number;
  } | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tagMode, setTagMode] = useState<'add' | 'remove'>('add');
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

  const segmentCounts = new Map<string, number>();
  for (const c of customers) segmentCounts.set(c.segment, (segmentCounts.get(c.segment) ?? 0) + 1);
  const bySegment = [...segmentCounts.entries()].map(([key, value]) => ({
    key: segmentCopy[key] ?? key,
    value,
  }));
  const ownerCounts = new Map<string, number>();
  for (const c of customers)
    ownerCounts.set(
      ownerNameCopy(c.owner.name),
      (ownerCounts.get(ownerNameCopy(c.owner.name)) ?? 0) + 1,
    );
  const byOwner = [...ownerCounts.entries()].map(([key, value]) => ({ key, value }));
  const tagCounts = new Map<string, number>();
  for (const c of customers) for (const t of c.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const byTag = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, value }));

  const activeCount = customers.filter((c) => c.segment === 'active').length;
  const repurchaseCount = customers.filter((c) => c.segment === 'repurchase').length;
  const dormantCount = customers.filter((c) => c.segment === 'dormant').length;
  const orderedCount = customers.filter((c) => c.orders > 0).length;
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
  const computeRfm = async () => {
    setBusy('rfm');
    setNotice('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/customers/rfm/compute`, {
        method: 'POST',
        headers: headers(crypto.randomUUID()),
      });
      if (!response.ok) throw Error('RFM');
      setRfmSummary((await response.json()).data);
      setNotice('已按真实互动档案重算客户 RFM 分层。');
      await load();
    } catch {
      setNotice('RFM 分层计算未完成，请稍后重试。');
    } finally {
      setBusy(null);
    }
  };
  const requestBatchTag = async () => {
    const label = tagInput.trim();
    if (!label || !selectedCustomers.length) return;
    setBusy('tags');
    setNotice('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/customers/tags/batch`, {
        method: 'POST',
        headers: headers(crypto.randomUUID()),
        body: JSON.stringify({
          action: tagMode,
          label,
          customerIds: selectedCustomers.map((item) => item.id),
        }),
      });
      if (!response.ok) throw Error('TAGS');
      setNotice(
        `${tagMode === 'add' ? '已添加' : '已移除'}"${label}"到 ${selectedCustomers.length} 位客户。`,
      );
      setTagInput('');
      await load();
    } catch {
      setNotice('批量打标未完成，请稍后重试。');
    } finally {
      setBusy(null);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载客户跟进"
          description="正在连接客户、归属与来源数据。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权访问客户跟进"
          description="请使用具备客户跟进范围的账号登录后重试。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="客户跟进暂不可用"
          description="请检查网络后重新加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page} data-testid="management-customers">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 客户跟进</span>
        <div className={styles.topBarActions}>
          <button
            className={styles.topBarRefresh}
            type="button"
            disabled={busy === 'rfm'}
            onClick={() => void computeRfm()}
          >
            {busy === 'rfm' ? '计算中' : '重算 RFM 分层'}
          </button>
          <button
            className={styles.topBarRefresh}
            type="button"
            disabled={busy === 'export'}
            onClick={() => void requestExport()}
          >
            申请导出
          </button>
        </div>
      </header>

      <section className={styles.heroCard} aria-label="客户跟进概览">
        <h1>按来源与分层组织推广跟进作业</h1>
        <p>
          基于已沉淀的来源、标签与归属筛选客户，组织实名授权跟进；导出与归属变更均保留审批和审计记录。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="客户数据概况">
        <div>
          <span>客户</span>
          <strong>{customers.length}</strong>
        </div>
        <div>
          <span>活跃</span>
          <strong>{activeCount}</strong>
        </div>
        <div>
          <span>复购</span>
          <strong>{repurchaseCount}</strong>
        </div>
        <div>
          <span>沉睡</span>
          <strong>{dormantCount}</strong>
        </div>
        <div>
          <span>标签</span>
          <strong>{byTag.length}</strong>
        </div>
        <div>
          <span>有有效订单</span>
          <strong>{orderedCount}</strong>
        </div>
      </section>

      <section className={styles.rfmRow} aria-label="RFM 互动分层">
        <div className={styles.rfmSummary}>
          <div>
            <span>客户数</span>
            <em>{rfmSummary?.total ?? customers.length}</em>
          </div>
          <div>
            <span>高价值-活跃</span>
            <em>{rfmSummary?.layers['高价值-活跃'] ?? 0}</em>
          </div>
          <div>
            <span>温和互动</span>
            <em>{rfmSummary?.layers['温和互动'] ?? 0}</em>
          </div>
          <div>
            <span>需唤醒</span>
            <em>{rfmSummary?.layers['需唤醒'] ?? 0}</em>
          </div>
          <div>
            <span>沉睡</span>
            <em>{rfmSummary?.layers['沉睡'] ?? 0}</em>
          </div>
        </div>
        <p>
          RFM
          分层由真实互动档案（跟进、触点、订单痕迹、来源）现场计算，仅统计观看/访问/跳转/跟进等入口与痕迹，不含支付金额，非本平台下单、不代表第三方成交。
        </p>
      </section>

      <section className={styles.panel} aria-label="客户跟进分布">
        <div className={styles.panelBlock}>
          <h2>分层分布</h2>
          <ul className={styles.bars}>
            {bySegment.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${customers.length ? (b.value / customers.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!customers.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>归属分布</h2>
          <ul className={styles.bars}>
            {byOwner.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${customers.length ? (b.value / customers.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!customers.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>标签分布</h2>
          <ul className={styles.bars}>
            {byTag.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${customers.length ? (b.value / customers.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!customers.length && <li className={styles.barEmpty}>暂无标签</li>}
          </ul>
        </div>
      </section>

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
          RFM 分层
          <select
            value={filters.layer}
            onChange={(event) => setFilters({ ...filters, layer: event.target.value })}
          >
            <option value="">全部 RFM</option>
            <option value="高价值-活跃">高价值-活跃</option>
            <option value="温和互动">温和互动</option>
            <option value="需唤醒">需唤醒</option>
            <option value="沉睡">沉睡</option>
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
        <Button tone="secondary" onClick={apply}>
          应用筛选
        </Button>
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
        <Button
          disabled={!selected.length || !assigneeId || busy === 'ownership'}
          loading={busy === 'ownership'}
          onClick={() => void requestOwnership()}
        >
          批量发起归属审批
        </Button>
      </section>
      <section className={styles.batch} aria-label="批量打标操作">
        <div>
          <strong>批量打标</strong>
          <span>对已选客户批量新增或移除标签，写入可审计记录。</span>
        </div>
        <select
          value={tagMode}
          onChange={(event) => setTagMode(event.target.value as 'add' | 'remove')}
          aria-label="打标方式"
        >
          <option value="add">添加标签</option>
          <option value="remove">移除标签</option>
        </select>
        <input
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          aria-label="标签内容"
          placeholder="如 VIP / 需跟进"
        />
        <Button
          disabled={!selected.length || !tagInput.trim() || busy === 'tags'}
          loading={busy === 'tags'}
          onClick={() => void requestBatchTag()}
        >
          批量{tagMode === 'add' ? '添加' : '移除'}标签
        </Button>
      </section>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {customers.length === 0 ? (
        <section className={styles.empty}>
          <h2>没有匹配的客户</h2>
          <p>调整筛选条件，或在客户、来源和员工工作流中沉淀新的客户跟进与归属。</p>
        </section>
      ) : (
        <section className={styles.tableWrap} aria-label="客户跟进列表">
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
                <th>RFM 互动分层</th>
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
                    <Link href={`/m/customers/${customer.id}`}>
                      {customerNameCopy(customer.displayName)}
                    </Link>
                    <small>{customer.id.slice(0, 8)}</small>
                  </td>
                  <td>
                    <StatusBadge tone="info">{businessLabel(customer.segment)}</StatusBadge>
                    <div className={styles.tags}>
                      {customer.tags.length ? (
                        customer.tags.map((tag) => <span key={tag}>{tag}</span>)
                      ) : (
                        <em>无标签</em>
                      )}
                    </div>
                  </td>
                  <td>
                    {customer.rfm?.layer ? (
                      <>
                        <StatusBadge
                          tone={customer.rfm.layer === '高价值-活跃' ? 'success' : 'info'}
                        >
                          {rfmLayerCopy[customer.rfm.layer] ?? customer.rfm.layer}
                        </StatusBadge>
                        <small>
                          R{customer.rfm.recencyDays ?? '-'}天 · F
                          {customer.rfm.frequencyCount ?? '-'} · M{customer.rfm.reachCount ?? '-'}
                        </small>
                      </>
                    ) : (
                      <em>待重算</em>
                    )}
                  </td>
                  <td>{ownerNameCopy(customer.owner.name)}</td>
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
