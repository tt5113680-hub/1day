'use client';
import { SessionApiClient } from '@oneday/session-client';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type AuditRecord = {
  id: string;
  action: string;
  resource: { type: string; id: string };
  actorName: string;
  kind:
    | 'permission_change'
    | 'export'
    | 'privilege_expansion'
    | 'unattributed_privileged'
    | 'trace';
  createdAt: string;
  correlationId: string;
  traceId: string;
  detail: unknown;
};
type Data = {
  records: AuditRecord[];
  summary: { changes: number; exports: number; risks: number };
};
type Filter = 'all' | 'change' | 'export' | 'risk';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const labels: Record<AuditRecord['kind'], string> = {
  permission_change: '权限变更',
  export: '导出',
  privilege_expansion: '高权限扩展信号',
  unattributed_privileged: '未归属特权操作',
  trace: '追溯记录',
};

export default function PermissionAuditPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(
    async (next = filter) => {
      if (!(await sessionApi.context())) return setState('forbidden');
      setState('loading');
      try {
        const response = await sessionApi.request(
          `${api}/api/v1/management/permission-audit?filter=${next}`,
          {
            headers: {},
          },
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
  const changeFilter = (next: Filter) => {
    setFilter(next);
    setOpen(null);
    void load(next);
  };
  if (state === 'loading') return <main className={styles.centered}>正在核验权限审计证据…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看权限审计</h1>
          <p>请使用具备经营管理权限的账号。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>权限审计暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 权限审计</p>
          <h1>将权限变更、风险信号与证据链放在同一审计视图</h1>
          <span>风险信号需要复核，不等同于已确认的越权；每条记录均可追溯到关联与 trace 标识。</span>
        </div>
        <button onClick={() => void load()}>刷新记录</button>
      </header>
      <section className={styles.metrics} aria-label="审计摘要">
        <article>
          <span>权限变更</span>
          <strong>{data.summary.changes}</strong>
        </article>
        <article>
          <span>数据导出</span>
          <strong>{data.summary.exports}</strong>
        </article>
        <article>
          <span>风险信号</span>
          <strong>{data.summary.risks}</strong>
        </article>
      </section>
      <section className={styles.panel}>
        <div className={styles.controls}>
          <div>
            <h2>审计记录</h2>
            <p>仅显示当前租户保留的可追溯记录。</p>
          </div>
          <label>
            筛选类型
            <select
              aria-label="审计类型"
              value={filter}
              onChange={(event) => changeFilter(event.target.value as Filter)}
            >
              <option value="all">全部</option>
              <option value="change">权限变更</option>
              <option value="export">导出</option>
              <option value="risk">风险信号</option>
            </select>
          </label>
        </div>
        {data.records.length ? (
          <div className={styles.records}>
            {data.records.map((record) => (
              <article className={styles.record} key={record.id}>
                <div className={styles.recordMain}>
                  <span
                    className={
                      record.kind.includes('privilege') || record.kind.includes('unattributed')
                        ? styles.risk
                        : styles.kind
                    }
                  >
                    {labels[record.kind]}
                  </span>
                  <strong>{record.action}</strong>
                  <p>
                    {record.actorName} · {record.resource.type} ·{' '}
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <button onClick={() => setOpen(open === record.id ? null : record.id)}>
                  {open === record.id ? '收起证据' : '查看证据'}
                </button>
                {open === record.id && (
                  <div className={styles.evidence}>
                    <dl>
                      <div>
                        <dt>关联 ID</dt>
                        <dd>{record.correlationId}</dd>
                      </div>
                      <div>
                        <dt>Trace ID</dt>
                        <dd>{record.traceId}</dd>
                      </div>
                      <div>
                        <dt>资源 ID</dt>
                        <dd>{record.resource.id}</dd>
                      </div>
                    </dl>
                    {record.detail !== null && record.detail !== undefined && (
                      <pre>{JSON.stringify(record.detail, null, 2)}</pre>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>当前筛选下没有审计记录。</div>
        )}
      </section>
    </main>
  );
}
