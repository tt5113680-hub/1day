'use client';
import { SessionApiClient } from '@oneday/session-client';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Data = {
  templates: {
    id: string;
    name: string;
    code: string;
    published_version_id: string | null;
    active_instances: number;
    timed_out_instances: number;
  }[];
  instances: {
    id: string;
    status: string;
    definition_name: string;
    step_name: string | null;
    step_type: string | null;
    assignee_name: string;
    due_at: string | null;
  }[];
  approvals: {
    id: string;
    name: string;
    definition_name: string;
    assignee_name: string;
    due_at: string;
  }[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
export default function WorkflowsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState('');
  const load = useCallback(
    async (status = filter) => {
      if (!(await sessionApi.context())) return setState('forbidden');
      setState('loading');
      try {
        const response = await sessionApi.request(
          `${api}/api/v1/management/workflows${status ? `?status=${status}` : ''}`,
          { headers: {} },
        );
        if ([401, 403].includes(response.status)) return setState('forbidden');
        if (!response.ok) throw Error('LOAD');
        setData((await response.json()).data);
        setState('ready');
      } catch {
        setState('error');
      }
    },
    [filter],
  );
  useEffect(() => void load(), [load]);
  if (state === 'loading') return <main className={styles.centered}>正在汇总流程运行状态…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看流程中心</h1>
          <p>请使用具备经营管理权限的账号。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>流程中心暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 流程中心</p>
          <h1>让每个流程实例都可定位、可推进</h1>
          <span>模板、运行实例、责任人、超时与待审批均从已发布流程和实例步骤中实时聚合。</span>
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            void load(e.target.value);
          }}
          aria-label="实例状态"
        >
          <option value="">全部实例</option>
          <option value="active">进行中</option>
          <option value="timed_out">已超时</option>
          <option value="completed">已完成</option>
          <option value="rejected">已拒绝</option>
        </select>
      </header>
      <section className={styles.metrics}>
        <article>
          <strong>{data.templates.length}</strong>
          <span>流程模板</span>
        </article>
        <article>
          <strong>{data.instances.filter((x) => x.status === 'active').length}</strong>
          <span>进行中实例</span>
        </article>
        <article>
          <strong>{data.instances.filter((x) => x.status === 'timed_out').length}</strong>
          <span>已超时实例</span>
        </article>
        <article>
          <strong>{data.approvals.length}</strong>
          <span>待审批步骤</span>
        </article>
      </section>
      <section className={styles.grid}>
        <Panel title="待处理审批">
          {data.approvals.length ? (
            data.approvals.map((x) => (
              <p key={x.id}>
                <strong>{x.definition_name}</strong> · {x.name}
                <br />
                <small>
                  {x.assignee_name} · 截止 {new Date(x.due_at).toLocaleString()}
                </small>
              </p>
            ))
          ) : (
            <p className={styles.empty}>当前没有待审批步骤。</p>
          )}
        </Panel>
        <Panel title="流程模板">
          {data.templates.map((x) => (
            <p key={x.id}>
              <strong>{x.name}</strong> · {x.code}
              <br />
              <small>
                {x.published_version_id ? '已发布' : '未发布'} · 运行 {x.active_instances} · 超时{' '}
                {x.timed_out_instances}
              </small>
            </p>
          ))}
        </Panel>
      </section>
      <section className={styles.table}>
        <h2>实例与责任人</h2>
        {data.instances.length ? (
          <table>
            <thead>
              <tr>
                <th>流程</th>
                <th>状态</th>
                <th>当前步骤</th>
                <th>责任人</th>
                <th>截止时间</th>
              </tr>
            </thead>
            <tbody>
              {data.instances.map((x) => (
                <tr key={x.id}>
                  <td>{x.definition_name}</td>
                  <td>
                    <span className={styles[x.status]}>{x.status}</span>
                  </td>
                  <td>
                    {x.step_name ?? '—'}
                    {x.step_type ? ` · ${x.step_type}` : ''}
                  </td>
                  <td>{x.assignee_name}</td>
                  <td>{x.due_at ? new Date(x.due_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>当前筛选范围内没有流程实例。</p>
        )}
      </section>
    </main>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
