'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AppStatePanel,
  Button,
  Modal,
  StatusBadge,
  Table,
  businessLabel,
  type TableColumn,
} from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
const barWidth = (total: number, value: number) =>
  total ? `${Math.max(2, (value / total) * 100)}%` : '0%';
const countBy = <T,>(rows: T[], key: (row: T) => string) => {
  const acc: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return Object.entries(acc)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

export default function PermissionAuditPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
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

  const exportAudit = async () => {
    if (exporting) return;
    if (!(await sessionApi.context())) return setState('forbidden');
    setExporting(true);
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/permission-audit/export?filter=${filter}`,
        { headers: {} },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('EXPORT');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `permission-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExported(`${new Date().toLocaleString('zh-CN')} 已导出 ${filterLabels[filter]}。`);
    } catch {
      setExported(null);
    } finally {
      setExporting(false);
    }
  };

  const isRisk = (record: AuditRecord) =>
    record.kind.includes('privilege') || record.kind.includes('unattributed');

  const openRecord = data?.records.find((record) => record.id === open) ?? null;

  const kindDist = useMemo(
    () => (data ? countBy(data.records, (r) => labels[r.kind]) : []),
    [data],
  );
  const resourceDist = useMemo(
    () => (data ? countBy(data.records, (r) => businessLabel(r.resource.type)) : []),
    [data],
  );
  const actorDist = useMemo(() => (data ? countBy(data.records, (r) => r.actorName) : []), [data]);

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

  const renderBars = (items: { label: string; value: number }[], total: number) => {
    if (!items.length)
      return (
        <>
          <p className={styles.barEmpty}>当前筛选下暂无审计分布记录。</p>
          <p className={styles.barEmpty}>暂无记录</p>
        </>
      );
    return (
      <ul className={styles.bars}>
        {items.map((item) => (
          <li className={styles.barRow} key={item.label}>
            <span className={styles.barLabel}>{item.label}</span>
            <span className={styles.barTrack}>
              <span className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
            </span>
            <span className={styles.barValue}>{item.value}</span>
          </li>
        ))}
      </ul>
    );
  };

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
          description="请使用具备推广员工具权限的账号。"
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

  const recordsTotal = data.records.length;

  return (
    <main className={styles.page} data-testid="management-permission-audit">
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 操作审计</span>
        <div className={styles.topBarActions}>
          <button
            type="button"
            className={styles.topBarRefresh}
            onClick={() => void exportAudit()}
            disabled={exporting}
          >
            {exporting ? '导出中…' : '导出审计'}
          </button>
          <button type="button" className={styles.topBarRefresh} onClick={() => void load()}>
            刷新记录
          </button>
        </div>
      </div>
      {exported ? (
        <div className={styles.exportBar} role="status" data-testid="audit-export-message">
          {exported}
        </div>
      ) : null}
      <section className={styles.heroCard} aria-label="操作审计概况">
        <h1>将权限变更、风险信号与证据链放在同一审计视图</h1>
        <p>风险信号需要复核，不等同于已确认的越权；每条记录均可追溯到关联与 trace 标识。</p>
      </section>
      <section className={styles.panel}>
        <div className={styles.summaryStrip} aria-label="审计摘要">
          <div>
            <span>审计记录</span>
            <strong>{recordsTotal}</strong>
          </div>
          <div>
            <span>权限变更</span>
            <strong>{data.summary.changes}</strong>
          </div>
          <div>
            <span>数据导出</span>
            <strong>{data.summary.exports}</strong>
          </div>
          <div>
            <span>风险信号</span>
            <strong>{data.summary.risks}</strong>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>操作审计分布</h2>
          <span className={styles.panelMeta}>由当前租户保留的审计档案行现场推导</span>
        </div>
        <div className={styles.distribution} aria-label="操作审计分布">
          <div className={styles.panelBlock}>
            <h3>类型分布</h3>
            {renderBars(kindDist, recordsTotal)}
          </div>
          <div className={styles.panelBlock}>
            <h3>资源类型分布</h3>
            {renderBars(resourceDist, recordsTotal)}
          </div>
          <div className={styles.panelBlock}>
            <h3>操作人分布</h3>
            {renderBars(actorDist, recordsTotal)}
          </div>
        </div>
        <p className={styles.honest}>
          来源
          source=local：分布全部由已抓取的租户审计档案行现场推导，仅记录本地可追溯安全证据，不接美团/抖音实时，不包含本平台收款，非本平台下单。
        </p>
      </section>
      <section className={styles.panel}>
        <div className={styles.controls}>
          <div>
            <div className={styles.panelHead}>
              <h2>审计记录</h2>
              <span className={styles.panelMeta}>仅显示当前租户保留的可追溯记录</span>
            </div>
            <p>原始关联标识仅在展开证据时呈现。</p>
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
          <div className={styles.recordList}>
            <AppStatePanel
              kind="empty"
              title="当前筛选下没有审计记录"
              description="调整筛选条件后可继续查看租户安全证据。"
            />
          </div>
        )}
      </section>
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
