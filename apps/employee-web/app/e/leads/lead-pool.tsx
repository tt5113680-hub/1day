'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge, businessLabel } from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './lead-pool.module.css';
import { EmployeeWorkbenchKpi } from '../employee-workbench-kpi';

type Lead = {
  id: string;
  customerName: string;
  sourceType: string;
  priority: string;
  status: string;
  isCurrentEmployee: boolean;
  version: number;
  openTasks: number;
};
type Assignee = { id: string; displayName: string; title: string };
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

const statusLabel = (status: string) =>
  ({
    available: '待领取',
    claimed: '已领取',
    follow_up: '跟进中',
    nurture: '养客中',
  })[status] ?? (status || '未标注');

const priorityLabel = (priority: string) =>
  ({
    high: '高优先级',
    low: '低优先级',
    normal: '常规',
  })[priority] ?? (priority || '未标注');

const taskLoadBucket = (openTasks: number) => {
  if (!openTasks) return '尚未创建任务';
  if (openTasks <= 2) return '轻负载 1-2';
  return '重负载 3+';
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

export function LeadPool() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const headers = () => ({ 'content-type': 'application/json' });
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const response = await sessionApi.request(`${api}/api/v1/employee/leads${query}`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      const [leadPayload, assigneeResponse] = await Promise.all([
        response.json(),
        sessionApi.request(`${api}/api/v1/employee/leads/assignees`, { headers: headers() }),
      ]);
      setLeads(leadPayload.data);
      if (assigneeResponse.ok) setAssignees((await assigneeResponse.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [status]);
  useEffect(() => {
    void load();
  }, [load]);

  const statusDist = useMemo(
    () => countBy(leads.map((lead) => statusLabel(lead.status))),
    [leads],
  );
  const priorityDist = useMemo(
    () => countBy(leads.map((lead) => priorityLabel(lead.priority))),
    [leads],
  );
  const sourceDist = useMemo(
    () => countBy(leads.map((lead) => businessLabel(lead.sourceType))),
    [leads],
  );
  const taskLoadDist = useMemo(
    () => countBy(leads.map((lead) => taskLoadBucket(lead.openTasks))),
    [leads],
  );
  const ownershipDist = useMemo(
    () =>
      countBy(leads.map((lead) => (lead.isCurrentEmployee ? '我的线索' : '团队线索'))),
    [leads],
  );
  const highPriorityCount = leads.filter((lead) => lead.priority === 'high').length;
  const availableCount = leads.filter((lead) => lead.status === 'available').length;

  const action = async (
    lead: Lead,
    actionName: 'claim' | 'assign' | 'convert',
    body: Record<string, unknown> = {},
  ) => {
    setBusy(lead.id);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/leads/${lead.id}/${actionName}`,
        {
          method: 'POST',
          headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ version: lead.version, ...body }),
        },
      );
      if (!response.ok) throw Error('ACTION');
      setMessage(
        actionName === 'claim'
          ? '线索已领取，归属与审计记录已同步。'
          : actionName === 'assign'
            ? '已分配给目标员工，归属与审计记录已同步。'
            : body.destination === 'follow_up'
              ? '已转入跟进并创建执行任务。'
              : '已转入养客队列。',
      );
      await load();
    } catch {
      setMessage('操作未完成，可能已被其他员工更新，请刷新重试。');
    } finally {
      setBusy(null);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载获客池"
          description="正在同步可领取客户与员工分配范围。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法访问获客池"
          description="请使用具备客户权限的员工账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="获客池暂不可用"
          description="客户分配数据未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page} data-testid="employee-lead-pool">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 获客池</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="获客池概览">
        <h1>找到最值得立即跟进的线索</h1>
        <p>
          领取后可转入跟进任务或养客队列；审计留痕不含支付金额与第三方订单结果，非本平台下单。
        </p>
      </section>

      <EmployeeWorkbenchKpi page="leads" />

      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.panel} aria-label="获客池概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>全部线索</span>
            <strong>{leads.length}</strong>
          </div>
          <div>
            <span>待领取</span>
            <strong>{availableCount}</strong>
          </div>
          <div>
            <span>高优先级</span>
            <strong>{highPriorityCount}</strong>
          </div>
          <div>
            <span>可分配员工</span>
            <strong>{assignees.length}</strong>
          </div>
        </div>
        <label className={styles.filter}>
          筛选状态
          <select aria-label="线索状态" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部线索</option>
            <option value="available">待领取</option>
            <option value="claimed">已领取</option>
            <option value="follow_up">跟进中</option>
            <option value="nurture">养客中</option>
          </select>
        </label>
      </section>

      <section className={styles.panel} aria-label="获客池分布">
        <div className={styles.panelHead}>
          <h2>获客池分布</h2>
          <span className={styles.panelMeta}>由线索真实行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>状态分布</h3>
            <Bars items={statusDist} total={leads.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>优先级分布</h3>
            <Bars items={priorityDist} total={leads.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>来源分布</h3>
            <Bars items={sourceDist} total={leads.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>待办负载分布</h3>
            <Bars items={taskLoadDist} total={leads.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>归属分布</h3>
            <Bars items={ownershipDist} total={leads.length} />
          </div>
        </div>
      </section>

      <section className={styles.list} aria-label="线索列表">
        {leads.length ? (
          leads.map((lead) => (
            <article className={styles.card} key={lead.id}>
              <div>
                <StatusBadge
                  tone={
                    lead.priority === 'high'
                      ? 'warning'
                      : lead.priority === 'low'
                        ? 'neutral'
                        : 'info'
                  }
                >
                  {priorityLabel(lead.priority)}
                </StatusBadge>
                <h2>{lead.customerName}</h2>
                <p>
                  来源：{businessLabel(lead.sourceType)} ·{' '}
                  {lead.openTasks ? `${lead.openTasks} 个待办` : '尚未创建任务'}
                </p>
              </div>
              <div className={styles.actions}>
                {lead.status === 'available' ? (
                  <Button loading={busy === lead.id} onClick={() => void action(lead, 'claim')}>
                    领取
                  </Button>
                ) : lead.isCurrentEmployee && lead.status === 'claimed' ? (
                  <>
                    <Button
                      tone="secondary"
                      onClick={() => void action(lead, 'convert', { destination: 'nurture' })}
                    >
                      转养客
                    </Button>
                    <Button
                      onClick={() =>
                        void action(lead, 'convert', {
                          destination: 'follow_up',
                          taskTitle: `跟进 ${lead.customerName}`,
                          dueAt: new Date(Date.now() + 86400000).toISOString(),
                        })
                      }
                    >
                      转跟进
                    </Button>
                  </>
                ) : lead.status === 'claimed' ? (
                  <label className={styles.assign}>
                    <span>分配给</span>
                    <select
                      aria-label={`分配 ${lead.customerName}`}
                      defaultValue=""
                      disabled={busy === lead.id}
                      onChange={(event) => {
                        const employeeId = event.target.value;
                        if (employeeId) void action(lead, 'assign', { employeeId });
                      }}
                    >
                      <option value="">选择员工</option>
                      {assignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.displayName}
                          {assignee.title ? ` · ${assignee.title}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <StatusBadge tone="neutral">{statusLabel(lead.status)}</StatusBadge>
                )}
              </div>
            </article>
          ))
        ) : (
          <AppStatePanel
            kind="empty"
            title="暂无符合条件的线索"
            description="调整筛选条件，或等待新的客户来源进入获客池。"
          />
        )}
      </section>

      <p className={styles.honest} role="note">
        以上分布全部由已抓取获客池档案行现场推导(source=local)：状态/优先级/来源/待办负载/归属均由真实
        leads 行统计。推广员工具获客池跟进门店服务痕迹，不含支付金额与第三方订单结果，非本平台下单。
      </p>
    </main>
  );
}
