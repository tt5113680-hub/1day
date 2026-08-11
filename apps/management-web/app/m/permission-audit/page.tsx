'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  Button,
  Card,
  Modal,
  StatusBadge,
  Table,
  businessLabel,
  type TableColumn,
} from '@oneday/ui';
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
const filterLabels: Record<Filter, string> = {
  all: '全部审计记录',
  change: '权限变更',
  export: '数据导出',
  risk: '风险信号',
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
  const changeFilter = (next: Filter) => {
    setFilter(next);
    setOpen(null);
    void load(next);
  };

  const isRisk = (record: AuditRecord) =>
    record.kind.includes('privilege') || record.kind.includes('unattributed');

  const openRecord = data?.records.find((record) => record.id === open) ?? null;

  const auditColumns: TableColumn<AuditRecord>[] = [
    {
      key: 'kind',
      header: '类型',
      render: (record) => (
        <StatusBadge tone={isRisk(record) ? 'warning' : 'neutral'}>
          {labels[record.kind]}
        </StatusBadge>
      ),
    },
    {
      key: 'action',
      header: '操作',
      render: (record) => <strong>{record.action}</strong>,
    },
    {
      key: 'actor',
      header: '操作人 / 资源',
      render: (record) => (
        <span>
          {record.actorName} · {businessLabel(record.resource.type)} · 租户内记录
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '时间',
      render: (record) => new Date(record.createdAt).toLocaleString('zh-CN'),
    },
    {
      key: 'evidence',
      header: '',
      align: 'right',
      render: (record) => (
        <Button tone="secondary" onClick={() => setOpen(record.id)}>
          查看证据
        </Button>
      ),
    },
  ];

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载权限审计"
          description="正在核验当前租户的可追溯安全证据。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看权限审计"
          description="请使用具备经营管理权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="权限审计暂不可用"
          description="审计证据未能完成加载，请稍后重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;

  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 操作审计"
        title="将权限变更、风险信号与证据链放在同一审计视图"
        description="风险信号需要复核，不等同于已确认的越权；每条记录均可追溯到关联与 trace 标识。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新记录
          </Button>
        }
      />
      <section className={styles.metrics} aria-label="审计摘要">
        <Card className={styles.metric}>
          <span>权限变更</span>
          <strong>{data.summary.changes}</strong>
          <small>已写入变更证据</small>
        </Card>
        <Card className={styles.metric}>
          <span>数据导出</span>
          <strong>{data.summary.exports}</strong>
          <small>当前租户导出记录</small>
        </Card>
        <Card className={styles.metric}>
          <span>风险信号</span>
          <strong>{data.summary.risks}</strong>
          <small>需要人工复核</small>
        </Card>
      </section>
      <Card className={styles.panel}>
        <div className={styles.controls}>
          <div>
            <div className={styles.panelEyebrow}>SECURITY REVIEW</div>
            <h2>审计记录</h2>
            <p>仅显示当前租户保留的可追溯记录，原始关联标识仅在展开证据时呈现。</p>
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
        <div className={styles.filterSummary}>
          <StatusBadge tone={filter === 'risk' ? 'warning' : 'info'}>
            {filterLabels[filter]}
          </StatusBadge>
          <span>{data.records.length} 条记录</span>
        </div>
        {data.records.length ? (
          <Table
            columns={auditColumns}
            rows={data.records}
            rowKey={(record) => record.id}
            data-testid="permission-audit-table"
          />
        ) : (
          <AppStatePanel
            kind="empty"
            title="当前筛选下没有审计记录"
            description="调整筛选条件后可继续查看租户安全证据。"
          />
        )}
      </Card>
      <Modal
        open={openRecord !== null}
        title="审计证据"
        onClose={() => setOpen(null)}
        data-testid="permission-audit-modal"
        footer={
          <Button tone="secondary" onClick={() => setOpen(null)}>
            关闭
          </Button>
        }
      >
        {openRecord ? (
          <div className={styles.evidence}>
            <dl>
              <div>
                <dt>关联 ID</dt>
                <dd>{openRecord.correlationId}</dd>
              </div>
              <div>
                <dt>Trace ID</dt>
                <dd>{openRecord.traceId}</dd>
              </div>
              <div>
                <dt>资源 ID</dt>
                <dd>{openRecord.resource.id}</dd>
              </div>
            </dl>
            {openRecord.detail !== null && openRecord.detail !== undefined && (
              <pre>{JSON.stringify(openRecord.detail, null, 2)}</pre>
            )}
          </div>
        ) : null}
      </Modal>
    </main>
  );
}
