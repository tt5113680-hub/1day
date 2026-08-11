'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  Button,
  Card,
  StatusBadge,
  businessLabel,
  customerNameCopy,
  taskTitleCopy,
  timelineLabelCopy,
} from '@oneday/ui';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Detail = {
  customer: {
    id: string;
    displayName: string;
    status: string;
    version: number;
    mergedIntoId: string | null;
    segment: string;
    nextTouchAt: string | null;
    identities: { type: string; maskedValue: string }[];
  };
  tags: { label: string }[];
  sources: { source_role: string; source_type: string; status: string }[];
  ownerships: { employee_name: string; ownership_role: string; status: string }[];
  transfers: {
    id: string;
    from_name: string;
    to_name: string;
    reason: string;
    status: string;
    version: number;
  }[];
  contributions: { employee_name: string; contribution_role: string; confirmed: boolean }[];
  orders: {
    order_number: string;
    status: string;
    evidence_count: number;
    connector_count: number;
  }[];
  tasks: { title: string; status: string; assignee_name: string; escalation_level: number }[];
  anomalies: { type: string; title: string }[];
  timeline: { kind: string; label: string; at: string }[];
};
type Assignee = { id: string; displayName: string; title: string | null };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const jsonHeaders = (idempotencyKey?: string) => ({
  'content-type': 'application/json',
  ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
});

export default function ManagementCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Detail | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [transferReason, setTransferReason] = useState('客户详情页归属调整');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [mergeReason, setMergeReason] = useState('核实为同一客户');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<'transfer' | 'approve' | 'merge' | null>(null);

  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    if (!id) return;
    setState('loading');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/customers/${encodeURIComponent(id)}`,
        { headers: {} },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('DETAIL');
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => void load(), [load]);
  useEffect(() => {
    void (async () => {
      if (!(await sessionApi.context())) return;
      const response = await sessionApi.request(`${api}/api/v1/management/customers/assignees`, {
        headers: {},
      });
      setAssignees(response.ok ? (await response.json()).data : []);
    })();
  }, []);

  const requestTransfer = async () => {
    if (!data || !assigneeId || data.customer.status !== 'active') return;
    setBusy('transfer');
    setNotice('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/customers/${encodeURIComponent(data.customer.id)}/ownership-transfers`,
        {
          method: 'POST',
          headers: jsonHeaders(crypto.randomUUID()),
          body: JSON.stringify({
            customerVersion: data.customer.version,
            toEmployeeId: assigneeId,
            reason: transferReason.trim() || '客户详情页归属调整',
          }),
        },
      );
      if (!response.ok) throw Error('TRANSFER');
      setNotice('已发起归属转移审批；批准后才会改写当前归属。');
      await load();
    } catch {
      setNotice('归属申请未提交成功；请刷新客户版本后重试。');
    } finally {
      setBusy(null);
    }
  };

  const approveTransfer = async (transferId: string, version: number) => {
    setBusy('approve');
    setNotice('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/ownership-transfers/${encodeURIComponent(transferId)}/approve`,
        {
          method: 'POST',
          headers: jsonHeaders(),
          body: JSON.stringify({ version, decision: 'approve' }),
        },
      );
      if (!response.ok) throw Error('APPROVE');
      setNotice('归属转移已批准，当前归属已更新。');
      await load();
    } catch {
      setNotice('批准失败；可能已被处理或客户版本冲突，请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };

  const mergeIntoTarget = async () => {
    if (!data || data.customer.status !== 'active') return;
    const targetId = mergeTargetId.trim();
    if (!/^[0-9a-f-]{36}$/i.test(targetId) || targetId === data.customer.id) {
      setNotice('请填写有效的目标客户 ID，且不能与当前客户相同。');
      return;
    }
    setBusy('merge');
    setNotice('');
    try {
      const targetResponse = await sessionApi.request(
        `${api}/api/v1/management/customers/${encodeURIComponent(targetId)}`,
        { headers: {} },
      );
      if (!targetResponse.ok) throw Error('TARGET');
      const target = (await targetResponse.json()).data as Detail;
      if (target.customer.status !== 'active') {
        setNotice('目标客户不是活跃状态，无法合并。');
        return;
      }
      const response = await sessionApi.request(
        `${api}/api/v1/customers/${encodeURIComponent(data.customer.id)}/merge`,
        {
          method: 'POST',
          headers: jsonHeaders(),
          body: JSON.stringify({
            targetCustomerId: targetId,
            sourceVersion: data.customer.version,
            targetVersion: target.customer.version,
            reason: mergeReason.trim() || '核实为同一客户',
          }),
        },
      );
      if (!response.ok) throw Error('MERGE');
      setNotice('客户已合并到目标档案；正在打开目标客户。');
      router.push(`/m/customers/${encodeURIComponent(targetId)}`);
    } catch {
      setNotice('合并失败；请确认目标客户存在且双方版本仍为最新。');
    } finally {
      setBusy(null);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载客户跟进全链路"
          description="正在汇总当前租户的来源、归属、任务与结果证据。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看客户详情"
          description="请使用具备客户跟进范围的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="客户详情暂不可用"
          description="客户跟进记录未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;

  const writable = data.customer.status === 'active';

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/m/customers">
        ← 返回客户跟进
      </Link>
      <AdminPageHeader
        eyebrow={`ONEDAY / 客户跟进全链路 · ${businessLabel(data.customer.segment)}`}
        title={customerNameCopy(data.customer.displayName) ?? '客户'}
        description={`${
          data.customer.identities
            .map((item) => `${businessLabel(item.type)}：${item.maskedValue}`)
            .join(' · ') || '未绑定身份'
        } · ${data.tags.map((item) => item.label).join(' / ') || '无标签'} · 版本 ${data.customer.version}`}
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新客户
          </Button>
        }
      />
      {!writable && (
        <section className={styles.merged} role="status">
          <StatusBadge tone="warning">{businessLabel(data.customer.status)}</StatusBadge>
          <span>
            当前档案已不可再写入归属或合并。
            {data.customer.mergedIntoId ? (
              <>
                {' '}
                请查看目标客户{' '}
                <Link href={`/m/customers/${encodeURIComponent(data.customer.mergedIntoId)}`}>
                  {data.customer.mergedIntoId}
                </Link>
                。
              </>
            ) : null}
          </span>
        </section>
      )}
      {data.anomalies.length > 0 && (
        <section className={styles.alerts} aria-label="经营异常">
          {data.anomalies.map((item) => (
            <article key={`${item.type}-${item.title}`}>
              <StatusBadge tone="warning">{businessLabel(item.type)}</StatusBadge>
              <span>{businessLabel(item.title)}</span>
            </article>
          ))}
        </section>
      )}
      {writable && (
        <Card className={styles.ops}>
          <div data-testid="customer-ops">
          <h2>客户合并与归属</h2>
          <p>
            写入走既有客户/归因 API：归属变更先审批后生效；合并会把当前客户身份并入目标客户并留下审计。
          </p>
          <div className={styles.opsGrid}>
            <section aria-label="发起归属转移">
              <h3>发起归属转移</h3>
              <label>
                转入员工
                <select
                  aria-label="转入员工"
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                >
                  <option value="">选择转入员工</option>
                  {assignees.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                      {person.title ? ` · ${person.title}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                转移原因
                <input
                  aria-label="转移原因"
                  value={transferReason}
                  onChange={(event) => setTransferReason(event.target.value)}
                />
              </label>
              <Button
                disabled={!assigneeId || busy !== null}
                loading={busy === 'transfer'}
                onClick={() => void requestTransfer()}
              >
                发起归属审批
              </Button>
            </section>
            <section aria-label="合并到目标客户">
              <h3>合并到目标客户</h3>
              <label>
                目标客户 ID
                <input
                  aria-label="目标客户 ID"
                  value={mergeTargetId}
                  onChange={(event) => setMergeTargetId(event.target.value)}
                  placeholder="目标客户 UUID"
                />
              </label>
              <label>
                合并原因
                <input
                  aria-label="合并原因"
                  value={mergeReason}
                  onChange={(event) => setMergeReason(event.target.value)}
                />
              </label>
              <Button
                tone="secondary"
                disabled={!mergeTargetId.trim() || busy !== null}
                loading={busy === 'merge'}
                onClick={() => void mergeIntoTarget()}
              >
                合并到目标客户
              </Button>
            </section>
          </div>
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
          </div>
        </Card>
      )}
      {!writable && notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <section className={styles.grid}>
        <Panel title="来源与贡献">
          <List
            items={data.sources.map((item) => ({
              title: `${businessLabel(item.source_role)} · ${businessLabel(item.source_type)}`,
              detail: businessLabel(item.status),
            }))}
            empty="暂无来源记录"
          />
          <List
            items={data.contributions.map((item) => ({
              title: `${item.employee_name} · ${businessLabel(item.contribution_role)}`,
              detail: item.confirmed ? '已确认贡献' : '待确认贡献',
            }))}
            empty="暂无贡献记录"
          />
        </Panel>
        <Panel title="归属与审批">
          <List
            items={data.ownerships.map((item) => ({
              title: `${item.employee_name} · ${businessLabel(item.ownership_role)}`,
              detail: businessLabel(item.status),
            }))}
            empty="暂无归属记录"
          />
          <ul>
            {data.transfers.length ? (
              data.transfers.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.from_name} → {item.to_name}
                  </strong>
                  <span>
                    {businessLabel(item.status)} · {item.reason}
                  </span>
                  {writable && item.status === 'pending' ? (
                    <Button
                      tone="secondary"
                      disabled={busy !== null}
                      loading={busy === 'approve'}
                      onClick={() => void approveTransfer(item.id, item.version)}
                    >
                      批准转移
                    </Button>
                  ) : null}
                </li>
              ))
            ) : (
              <li className={styles.empty}>暂无归属审批</li>
            )}
          </ul>
        </Panel>
        <Panel title="订单与证据">
          <List
            items={data.orders.map((item) => ({
              title: item.order_number,
              detail: `${businessLabel(item.status)} · ${item.evidence_count} 份证据 · ${item.connector_count} 条回执`,
            }))}
            empty="暂无订单结果"
          />
        </Panel>
        <Panel title="任务与异常">
          <List
            items={data.tasks.map((item) => ({
              title: taskTitleCopy(item.title),
              detail: `${businessLabel(item.status)} · ${item.assignee_name}${item.escalation_level ? ` · 已升级 ${item.escalation_level} 次` : ''}`,
            }))}
            empty="暂无任务"
          />
        </Panel>
      </section>
      <Card className={styles.timeline}>
        <h2>可审计时间线</h2>
        {data.timeline.length ? (
          data.timeline.map((item, index) => (
            <article key={`${item.kind}-${index}`}>
              <time>
                {new Intl.DateTimeFormat('zh-CN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(item.at))}
              </time>
              <span>{businessLabel(item.kind)}</span>
              <p>{timelineLabelCopy(item.label)}</p>
            </article>
          ))
        ) : (
          <p>尚无可展示的链路事件。</p>
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
function List({ items, empty }: { items: { title: string; detail: string }[]; empty: string }) {
  return (
    <ul>
      {items.length ? (
        items.map((item) => (
          <li key={`${item.title}-${item.detail}`}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </li>
        ))
      ) : (
        <li className={styles.empty}>{empty}</li>
      )}
    </ul>
  );
}
