'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge, businessLabel } from '@oneday/ui';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import styles from '../../tasks/[id]/task-detail.module.css';

type Data = {
  customer: {
    displayName: string;
    identities: { type: string; maskedValue: string }[];
    createdAt: string;
  };
  sources: { source_role: string; source_type: string }[];
  ownerships: { ownershipRole: string; isCurrentEmployee: boolean }[];
  tags: { id: string; label: string }[];
  tasks: { id: string; title: string; dueAt: string; status: string }[];
  rfm: {
    recencyDays: number | null;
    frequencyCount: number | null;
    reachCount: number | null;
    layer: string | null;
    windowDays: number | null;
    computedAt: string | null;
  } | null;
  followUps: { followedAt: string; summary: string | null; hasNote: boolean }[];
  timeline: { kind: string; action: string; at: string; taskId?: string; title?: string }[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const when = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

type Bucket = { label: string; value: number };
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
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

export function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async () => {
    if (!(await sessionApi.context()) || !id) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/employee/customers/${id}`, {
        headers: {},
      });
      if ([401, 403, 404].includes(r.status)) {
        setState('forbidden');
        return;
      }
      if (!r.ok) throw Error();
      setData((await r.json()).data as Data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载客户详情"
          description="正在核验你的客户关系与任务范围。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看此客户"
          description="仅可查看与自己归属、任务或贡献有关的客户。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="客户详情暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const currentOwner = data.ownerships.some((item) => item.isCurrentEmployee);
  const sourceDist = countBy(data.sources.map((item) => businessLabel(item.source_role)));
  const ownershipDist = countBy(
    data.ownerships.map((item) =>
      item.isCurrentEmployee
        ? `我 · ${businessLabel(item.ownershipRole)}`
        : businessLabel(item.ownershipRole),
    ),
  );
  const taskStatusDist = countBy(data.tasks.map((item) => businessLabel(item.status)));
  const timelineKindDist = countBy(
    data.timeline.map((item) => (item.kind === 'task' ? '任务动态' : '客户动态')),
  );
  const layerLabel = data.rfm?.layer ?? null;
  const recencyBucket = data.rfm
    ? data.rfm.recencyDays == null
      ? null
      : data.rfm.recencyDays <= 7
        ? '近 7 天内互动'
        : data.rfm.recencyDays <= 30
          ? '近 30 天内互动'
          : data.rfm.recencyDays <= 90
            ? '90 天内互动'
            : '90 天内无互动'
    : null;
  const frequencyBucket = data.rfm
    ? data.rfm.frequencyCount == null
      ? null
      : data.rfm.frequencyCount === 0
        ? '暂无互动频次'
        : data.rfm.frequencyCount <= 2
          ? '低频互动 1-2 次'
          : data.rfm.frequencyCount <= 5
            ? '中度互动 3-5 次'
            : '高频互动 6 次+'
    : null;
  const reachBucket = data.rfm
    ? data.rfm.reachCount == null
      ? null
      : data.rfm.reachCount === 0
        ? '暂无触达覆盖'
        : data.rfm.reachCount <= 2
          ? '基础触达 1-2 通道'
          : data.rfm.reachCount <= 5
            ? '常规触达 3-5 通道'
            : '丰富触达 6 通道+'
    : null;
  const rfm360Dist = [
    recencyBucket ? { label: recencyBucket, value: 1 } : null,
    frequencyBucket ? { label: frequencyBucket, value: 1 } : null,
    reachBucket ? { label: reachBucket, value: 1 } : null,
    layerLabel ? { label: `分层 · ${layerLabel}`, value: 1 } : null,
  ].filter((item): item is Bucket => item !== null);
  return (
    <main className={styles.page} data-testid="employee-customer-detail">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 客户详情</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="客户详情概览">
        <h1>{data.customer.displayName}</h1>
        <p>仅可查看与自己有归属、任务或贡献关系的客户；仅记录客户跟进入口痕迹。</p>
      </section>

      <section className={styles.panel} aria-label="客户详情概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>来源记录</span>
            <strong>{data.sources.length}</strong>
          </div>
          <div>
            <span>归属记录</span>
            <strong>{data.ownerships.length}</strong>
          </div>
          <div>
            <span>客户标签</span>
            <strong>{data.tags.length}</strong>
          </div>
          <div>
            <span>相关任务</span>
            <strong>{data.tasks.length}</strong>
          </div>
          <div>
            <span>RFM 分层</span>
            <strong>{layerLabel ?? '未计算'}</strong>
          </div>
          <div>
            <span>跟进/复购互动</span>
            <strong>{data.followUps.length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="客户详情分布">
        <div className={styles.panelHead}>
          <h2>客户详情分布</h2>
          <span className={styles.panelMeta}>由客户详情真实档案行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>来源类型分布</h3>
            <Bars items={sourceDist} total={data.sources.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>归属角色分布</h3>
            <Bars items={ownershipDist} total={data.ownerships.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>相关任务状态分布</h3>
            <Bars items={taskStatusDist} total={data.tasks.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>时间线动态分布</h3>
            <Bars items={timelineKindDist} total={data.timeline.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>客户 360 互动轴</h3>
            <Bars items={rfm360Dist} total={rfm360Dist.length} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>客户摘要</h2>
          <StatusBadge tone="info">客户摘要</StatusBadge>
        </div>
        <div className={styles.customer}>
          <strong>
            {data.customer.identities.length
              ? data.customer.identities
                  .map((item) => `${businessLabel(item.type)} · ${item.maskedValue}`)
                  .join(' / ')
              : '暂无已验证身份'}
          </strong>
          <p>建档于 {when(data.customer.createdAt)}</p>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>客户关系</h2>
          <span>{currentOwner ? '当前归属客户' : '协作客户'}</span>
        </div>
        <p className={styles.card}>
          仅展示与你有归属、任务或贡献关系的客户记录。
          <br />
          {data.ownerships.length
            ? data.ownerships
                .map((item) =>
                  item.isCurrentEmployee
                    ? `我 · ${businessLabel(item.ownershipRole)}`
                    : businessLabel(item.ownershipRole),
                )
                .join(' / ')
            : '暂未分配归属'}
        </p>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>来源与归属</h2>
          <span>{data.sources.length} 条来源</span>
        </div>
        <p className={styles.card}>
          {data.sources.length
            ? data.sources
                .map(
                  (item) =>
                    `${businessLabel(item.source_role)} · ${businessLabel(item.source_type)}`,
                )
                .join(' / ')
            : '暂未记录来源'}
        </p>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>客户标签</h2>
          <span>{data.tags.length} 项</span>
        </div>
        <p className={styles.card}>
          {data.tags.length ? data.tags.map((item) => `# ${item.label}`).join('  ') : '暂无标签'}
        </p>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>我的相关任务</h2>
          <span>{data.tasks.length} 项</span>
        </div>
        {data.tasks.length ? (
          data.tasks.map((item) => (
            <div className={styles.evidence} key={item.id}>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {businessLabel(item.status)} · {when(item.dueAt)}
                </small>
              </span>
              <a href={`/e/tasks/${item.id}`}>查看</a>
            </div>
          ))
        ) : (
          <p className={styles.empty}>暂无与你相关的任务。</p>
        )}
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>客户跟进互动</h2>
          <span>{data.followUps.length} 次跟进</span>
        </div>
        {data.followUps.length ? (
          data.followUps.map((item, index) => (
            <div className={styles.evidence} key={`${item.followedAt}-${index}`}>
              <span>
                <strong>{item.summary ?? (item.hasNote ? '已记录跟进' : '跟进记录')}</strong>
                <small>跟进互动 · {when(item.followedAt)}</small>
              </span>
              <time>{when(item.followedAt)}</time>
            </div>
          ))
        ) : (
          <p className={styles.empty}>暂无你的跟进互动记录。</p>
        )}
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>时间线</h2>
          <span>{data.timeline.length} 条动态</span>
        </div>
        {data.timeline.length ? (
          data.timeline.map((item, index) => (
            <div className={styles.evidence} key={`${item.action}-${index}`}>
              <span>
                <strong>{item.title ?? item.action}</strong>
                <small>{item.kind === 'task' ? '任务动态' : '客户动态'}</small>
              </span>
              <time>{when(item.at)}</time>
            </div>
          ))
        ) : (
          <p className={styles.empty}>暂无可展示的客户动态。</p>
        )}
      </section>
      <p className={styles.honest}>
        源
        source=local：本页概况与分布全部由已抓取的客户详情真实档案行现场推导，仅记录来源、归属、任务、跟进与入口痕迹及互动 RFM 分层，不作复购成交、不含第三方订单履约与支付金额，非本平台下单，不代表第三方成交。
      </p>
      <footer className={styles.footer}>
        <a href="/e/customers">客户目录</a>
        <a href="/e/workbench">返回工作台</a>
      </footer>
    </main>
  );
}
