'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './lead-pool.module.css';

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
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export function LeadPool() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const token = () => sessionStorage.getItem('oneday.accessToken') ?? '';
  const headers = () => ({
    authorization: `Bearer ${token()}`,
    'x-request-id': crypto.randomUUID(),
    'content-type': 'application/json',
  });
  const load = useCallback(async () => {
    if (!token()) return setState('forbidden');
    setState('loading');
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const response = await fetch(`${api}/api/v1/employee/leads${query}`, { headers: headers() });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      const [leadPayload, assigneeResponse] = await Promise.all([
        response.json(),
        fetch(`${api}/api/v1/employee/leads/assignees`, { headers: headers() }),
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
  const action = async (
    lead: Lead,
    actionName: 'claim' | 'assign' | 'convert',
    body: Record<string, unknown> = {},
  ) => {
    setBusy(lead.id);
    setMessage('');
    try {
      const response = await fetch(`${api}/api/v1/employee/leads/${lead.id}/${actionName}`, {
        method: 'POST',
        headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ version: lead.version, ...body }),
      });
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
  if (state === 'loading') return <main className={styles.centered}>正在加载获客池…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无法访问获客池</h1>
          <p>请使用具备客户权限的员工账号登录。</p>
          <a href="/e/workbench">返回工作台</a>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>获客池暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <p>ONEDAY / 获客池</p>
        <h1>找到最值得立即跟进的客户</h1>
        <span>领取后可转入跟进任务或养客队列，所有批量动作留存审计。</span>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      <section className={styles.toolbar}>
        <label>
          筛选状态
          <select aria-label="线索状态" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部线索</option>
            <option value="available">待领取</option>
            <option value="claimed">已领取</option>
            <option value="follow_up">跟进中</option>
            <option value="nurture">养客中</option>
          </select>
        </label>
        <strong>{leads.length} 条</strong>
      </section>
      <section className={styles.list}>
        {leads.length ? (
          leads.map((lead) => (
            <article className={styles.card} key={lead.id}>
              <div>
                <span className={styles[lead.priority]}>
                  {lead.priority === 'high'
                    ? '高优先级'
                    : lead.priority === 'low'
                      ? '低优先级'
                      : '常规'}
                </span>
                <h2>{lead.customerName}</h2>
                <p>
                  来源：{lead.sourceType} ·{' '}
                  {lead.openTasks ? `${lead.openTasks} 个待办` : '尚未创建任务'}
                </p>
              </div>
              <div className={styles.actions}>
                {lead.status === 'available' ? (
                  <button disabled={busy === lead.id} onClick={() => void action(lead, 'claim')}>
                    {busy === lead.id ? '处理中…' : '领取'}
                  </button>
                ) : lead.isCurrentEmployee && lead.status === 'claimed' ? (
                  <>
                    <button
                      onClick={() => void action(lead, 'convert', { destination: 'nurture' })}
                    >
                      转养客
                    </button>
                    <button
                      className={styles.primary}
                      onClick={() =>
                        void action(lead, 'convert', {
                          destination: 'follow_up',
                          taskTitle: `跟进 ${lead.customerName}`,
                          dueAt: new Date(Date.now() + 86400000).toISOString(),
                        })
                      }
                    >
                      转跟进
                    </button>
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
                  <span className={styles.state}>
                    {lead.status === 'follow_up'
                      ? '跟进中'
                      : lead.status === 'nurture'
                        ? '养客中'
                        : '已被领取'}
                  </span>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            <strong>暂无符合条件的线索</strong>
            <p>调整筛选条件，或等待新的客户来源进入获客池。</p>
          </div>
        )}
      </section>
    </main>
  );
}
