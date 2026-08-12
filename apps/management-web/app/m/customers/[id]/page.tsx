'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AppStatePanel,
  Button,
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
const barWidth = (total: number, value: number) =>
  `${(total ? (value / total) * 100 : 0).toFixed(2)}%`;
const countBy = <T,>(rows: T[], keyOf: (row: T) => string) => {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, value]) => ({ key, value }));
};

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

  const sourceCount = data.sources.length;
  const ownershipCount = data.ownerships.length;
  const taskCount = data.tasks.length;
  const orderCount = data.orders.length;
  const anomalyCount = data.anomalies.length;
  const timelineCount = data.timeline.length;
  const contributionCount = data.contributions.length;
  const transferCount = data.transfers.length;

  const taskDist = countBy(data.tasks, (t) => businessLabel(t.status));
  const escalationDist = countBy(
    data.tasks.filter((t) => t.escalation_level > 0),
    (t) => (t.escalation_level >= 3 ? '已升级 ≥3 次' : '已升级'),
  );
  const sourceStatusDist = countBy(data.sources, (s) => businessLabel(s.status));
  const sourceRoleDist = countBy(data.sources, (s) => businessLabel(s.source_role));
  const ownershipRoleDist = countBy(data.ownerships, (o) => businessLabel(o.ownership_role));
  const transferStatusDist = countBy(data.transfers, (t) => businessLabel(t.status));
  const contributionRoleDist = countBy(data.contributions, (c) =>
    businessLabel(c.contribution_role),
  );
  const orderStatusDist = countBy(data.orders, (o) => businessLabel(o.status));
  const anomalyTypeDist = countBy(data.anomalies, (a) => businessLabel(a.type));
  const timelineKindDist = countBy(data.timeline, (t) => businessLabel(t.kind));

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/m/customers">
        ← 返回客户跟进
      </Link>
      <header className={styles.topBar}>
        <span
          className={styles.topBarTitle}
        >{`推广员工具 · 客户跟进 · ${businessLabel(data.customer.segment)}`}</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新客户
        </button>
      </header>

      <section className={styles.heroCard} aria-label="客户跟进概况">
        <h1>{customerNameCopy(data.customer.displayName) ?? '客户'}</h1>
        <p>
          {`${
            data.customer.identities
              .map((item) => `${businessLabel(item.type)}：${item.maskedValue}`)
              .join(' · ') || '未绑定身份'
          } · ${data.tags.map((item) => item.label).join(' / ') || '无标签'} · 版本 ${data.customer.version}`}
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="客户详情数据概况">
        <div>
          <span>来源记录</span>
          <strong>{sourceCount}</strong>
        </div>
        <div>
          <span>归属记录</span>
          <strong>{ownershipCount}</strong>
        </div>
        <div>
          <span>任务</span>
          <strong>{taskCount}</strong>
        </div>
        <div>
          <span>订单结果</span>
          <strong>{orderCount}</strong>
        </div>
        <div>
          <span>跟进异常</span>
          <strong>{anomalyCount}</strong>
        </div>
        <div>
          <span>链路事件</span>
          <strong>{timelineCount}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="客户详情分布">
        <div className={styles.panelBlock}>
          <h2>任务状态分布</h2>
          <ul className={styles.bars}>
            {taskDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(taskDist.length ? taskCount : 0, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!taskCount && <li className={styles.barEmpty}>暂无任务</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>来源状态分布</h2>
          <ul className={styles.bars}>
            {sourceStatusDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(sourceCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!sourceCount && <li className={styles.barEmpty}>暂无来源记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>归属角色分布</h2>
          <ul className={styles.bars}>
            {ownershipRoleDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(ownershipCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!ownershipCount && <li className={styles.barEmpty}>暂无归属记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>归属审批状态分布</h2>
          <ul className={styles.bars}>
            {transferStatusDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(transferCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!transferCount && <li className={styles.barEmpty}>暂无归属审批</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>订单结果状态分布</h2>
          <ul className={styles.bars}>
            {orderStatusDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(orderCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!orderCount && <li className={styles.barEmpty}>暂无订单结果</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>跟进异常类型分布</h2>
          <ul className={styles.bars}>
            {anomalyTypeDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(anomalyCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!anomalyCount && <li className={styles.barEmpty}>暂无跟进异常</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>来源角色与贡献</h2>
          <ul className={styles.bars}>
            {sourceRoleDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(sourceCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {contributionRoleDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(contributionCount || sourceCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!sourceCount && !contributionCount && (
              <li className={styles.barEmpty}>暂无来源或贡献记录</li>
            )}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>链路事件类型分布</h2>
          <ul className={styles.bars}>
            {timelineKindDist.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(timelineCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!timelineCount && <li className={styles.barEmpty}>暂无链路事件</li>}
          </ul>
        </div>
        {escalationDist.length > 0 && (
          <div className={styles.panelBlock}>
            <h2>任务升级信号分布</h2>
            <ul className={styles.bars}>
              {escalationDist.map((b) => (
                <li key={b.key} className={styles.barRow}>
                  <span className={styles.barLabel}>{b.key}</span>
                  <span className={styles.barTrack}>
                    <span
                      className={styles.barFill}
                      style={{ width: barWidth(taskCount, b.value) }}
                    />
                  </span>
                  <span className={styles.barValue}>{b.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <p className={styles.honest}>
        分布全部由已抓取客户详情档案行现场推导，仅记录来源、归属、任务与入口痕迹；来源与贡献反映已登记的推广跟进工作流，不代表第三方成交或本平台收款，非本平台下单。
      </p>

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
        <section className={styles.alerts} aria-label="跟进异常">
          {data.anomalies.map((item) => (
            <article key={`${item.type}-${item.title}`}>
              <StatusBadge tone="warning">{businessLabel(item.type)}</StatusBadge>
              <span>{businessLabel(item.title)}</span>
            </article>
          ))}
        </section>
      )}
      {writable && (
        <section className={styles.ops}>
          <div data-testid="customer-ops">
            <h2>客户合并与归属</h2>
            <p>
              写入走既有客户/归因
              API：归属变更先审批后生效；合并会把当前客户身份并入目标客户并留下审计。
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
        </section>
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
      <section className={styles.timeline}>
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
