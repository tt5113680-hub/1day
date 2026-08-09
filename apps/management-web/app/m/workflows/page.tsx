'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  businessLabel,
  Button,
  Card,
  MetricCard,
  StatusBadge,
} from '@oneday/ui';
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
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总流程运行状态"
          description="正在关联流程模板、责任人、审批与截止时间。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看流程中心"
          description="请使用具备经营管理权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="流程中心暂不可用"
          description="流程运行数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 商户运营流程"
        title="让每个流程实例都可定位、可推进"
        description="模板、运行实例、责任人、超时与待审批均从已发布流程和实例步骤中实时聚合。"
        actions={
          <label className={styles.filter}>
            实例状态
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
          </label>
        }
      />
      <section className={styles.metrics}>
        <MetricCard label="流程模板" value={data.templates.length} hint="已配置流程" />
        <MetricCard
          label="进行中实例"
          value={data.instances.filter((x) => x.status === 'active').length}
          hint="需要持续推进"
        />
        <MetricCard
          label="已超时实例"
          value={data.instances.filter((x) => x.status === 'timed_out').length}
          hint="需要优先介入"
        />
        <MetricCard label="待审批步骤" value={data.approvals.length} hint="等待责任人确认" />
      </section>
      <section className={styles.grid}>
        <Panel title="待处理审批">
          {data.approvals.length ? (
            data.approvals.map((x) => (
              <p key={x.id}>
                <strong>{x.definition_name}</strong> · {x.name}
                <br />
                <small>
                  {x.assignee_name} · 截止{' '}
                  {new Date(x.due_at).toLocaleString('zh-CN', { hour12: false })}
                </small>
              </p>
            ))
          ) : (
            <AppStatePanel kind="empty" title="当前没有待审批步骤" />
          )}
        </Panel>
        <Panel title="流程模板">
          {data.templates.map((x) => (
            <p key={x.id}>
              <strong>{x.name}</strong> · {x.code}
              <br />
              <small>
                <StatusBadge tone={x.published_version_id ? 'success' : 'warning'}>
                  {businessLabel(x.published_version_id ? 'published' : 'unpublished')}
                </StatusBadge>{' '}
                · 运行 {x.active_instances} · 超时 {x.timed_out_instances}
              </small>
            </p>
          ))}
        </Panel>
      </section>
      <Card className={styles.table}>
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
                    <StatusBadge
                      tone={
                        x.status === 'completed'
                          ? 'success'
                          : x.status === 'timed_out'
                            ? 'warning'
                            : x.status === 'rejected'
                              ? 'danger'
                              : 'info'
                      }
                    >
                      {businessLabel(x.status)}
                    </StatusBadge>
                  </td>
                  <td>
                    {x.step_name ?? '—'}
                    {x.step_type ? ` · ${businessLabel(x.step_type)}` : ''}
                  </td>
                  <td>{x.assignee_name}</td>
                  <td>
                    {x.due_at ? new Date(x.due_at).toLocaleString('zh-CN', { hour12: false }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <AppStatePanel
            kind="empty"
            title="当前筛选范围内没有流程实例"
            description="切换实例状态查看其他运行记录。"
          />
        )}
      </Card>
    </main>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className={styles.panel}>
      <h2>{title}</h2>
      {children}
    </Card>
  );
}
