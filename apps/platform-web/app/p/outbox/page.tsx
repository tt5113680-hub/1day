'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlatformOperationalKpi } from '../../platform-workbench-kpi';
import styles from './page.module.css';

type DeadLetter = {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  attempts: number;
  lastError: string | null;
  updatedAt: string;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

export default function PlatformOutboxPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [items, setItems] = useState<DeadLetter[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async (mode: 'full' | 'quiet' = 'full') => {
    if (!(await sessionApi.context())) return setState('forbidden');
    if (mode === 'full') setState('loading');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/platform/outbox/dead-letters?limit=100`,
        { headers: {} },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setItems((await response.json()).data as DeadLetter[]);
      setState('ready');
    } catch {
      if (mode === 'full') setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replay = async (item: DeadLetter) => {
    setBusyId(item.id);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/platform/outbox/${item.tenantId}/${item.id}/replay`,
        { method: 'POST', headers: {} },
      );
      if (response.status === 404) {
        setNote('该死信已不存在或已被处理，请刷新列表。');
        await load('quiet');
        return;
      }
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      const data = (await response.json()).data as { status: string };
      setNote(`事件 ${item.id.slice(0, 8)}… 已重置为 ${data.status}，等待 Worker 重新投递。`);
      await load('quiet');
    } catch {
      setNote('重放失败，请确认具备 platform.manage 权限后重试。');
    } finally {
      setBusyId(null);
    }
  };

  const eventCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = item.eventType || '未分类';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [items]);

  const aggregateCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = item.aggregateType || '未分类';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [items]);

  const attemptsCounts = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const item of items) {
      const n = item.attempts ?? 0;
      const key = n <= 1 ? '首次失败 1' : n <= 5 ? '多次重试 2-5' : '已达上限 6+';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([key, value]) => ({ key, value }));
  }, [items]);

  const tenantCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = `${item.tenantId.slice(0, 8)}…`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [items]);

  const uniqueTenants = new Set(items.map((item) => item.tenantId)).size;
  const uniqueAggregates = new Set(items.map((item) => item.aggregateType)).size;
  const maxedOut = items.filter((item) => (item.attempts ?? 0) > 5).length;

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载 Outbox 死信"
          description="读取 needs_attention 事件，便于平台运维重放。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看 Outbox 死信"
          description="请使用具备平台读取权限的系统租户账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="死信列表暂不可用"
          description="未能读取平台 Outbox 死信，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page} data-testid="platform-outbox">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 平台投递队列</span>
        <span className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </span>
      </header>

      <section className={styles.heroCard} aria-label="平台投递队列说明">
        <h1>Outbox 死信与平台重放</h1>
        <p>
          列表仅展示 status=needs_attention 的真实 Outbox 事件；重放会重置为
          pending，不伪造第三方投递结果。 Outbox
          是平台投递与同步队列，不涉及本平台收款、非本平台下单。
        </p>
      </section>

      <PlatformOperationalKpi page="outbox" />

      <section className={styles.summaryStrip} aria-label="平台投递概况">
        <div>
          <span>死信记录</span>
          <strong>{items.length}</strong>
        </div>
        <div>
          <span>涉及租户</span>
          <strong>{uniqueTenants}</strong>
        </div>
        <div>
          <span>聚合对象</span>
          <strong>{uniqueAggregates}</strong>
        </div>
        <div>
          <span>已达上限</span>
          <strong>{maxedOut}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="平台投递分布">
        <div className={styles.panelBlock}>
          <h2>事件类型分布</h2>
          <ul className={styles.bars}>
            {eventCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>聚合对象分布</h2>
          <ul className={styles.bars}>
            {aggregateCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>重试次数分布</h2>
          <ul className={styles.bars}>
            {attemptsCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>租户分布</h2>
          <ul className={styles.bars}>
            {tenantCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取平台投递死信档案行现场推导（source=local）：事件类型、聚合对象、重试次数与涉及租户；
        重放不会调用美团/抖音等外部平台，仅恢复本地投递状态；Outbox
        是平台投递与同步队列，不包含本平台收款、 非本平台下单；本地试点记录。
      </p>

      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}

      <section className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.head}>
            <h2>死信队列</h2>
            <StatusBadge tone={items.length ? 'warning' : 'success'}>
              {items.length ? `${items.length} 条待处理` : '当前无死信'}
            </StatusBadge>
          </div>
          {items.length ? (
            <div className={styles.list}>
              {items.map((item) => (
                <article key={item.id} className={styles.item}>
                  <div>
                    <strong>{item.eventType}</strong>
                    <span>
                      租户 {item.tenantId.slice(0, 8)}… · 聚合 {item.aggregateType} · 尝试{' '}
                      {item.attempts} 次
                    </span>
                    <small>
                      相关 ID {item.correlationId || '—'} · 更新于{' '}
                      {new Date(item.updatedAt).toLocaleString('zh-CN')}
                    </small>
                    <p>{item.lastError || '无错误详情'}</p>
                  </div>
                  <Button
                    loading={busyId === item.id}
                    onClick={() => void replay(item)}
                    tone="secondary"
                  >
                    重放
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <AppStatePanel
              kind="empty"
              title="没有需要关注的死信"
              description="当 Worker 达到最大重试次数后，失败事件会出现在这里。"
            />
          )}
        </section>
        <section className={styles.panel}>
          <h2>运维边界</h2>
          <ul className={styles.boundaries}>
            <li>只操作已有 Outbox API，不另造第二套重放通道。</li>
            <li>重放不会调用美团/抖音等外部平台，仅恢复本地投递状态。</li>
            <li>连接器能力与 Outbound HTTPS 手递仍是不同产品面，不可混称。</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
