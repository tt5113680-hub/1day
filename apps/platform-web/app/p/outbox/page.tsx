'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
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
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 平台 Outbox 死信"
        title="查看并重放需要关注的投递失败事件"
        description="列表仅展示 status=needs_attention 的真实 Outbox 事件；重放会重置为 pending，不伪造第三方投递结果。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新列表
          </Button>
        }
      />
      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}
      <section className={styles.layout}>
        <Card className={styles.panel}>
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
        </Card>
        <Card className={styles.panel}>
          <h2>运维边界</h2>
          <ul className={styles.boundaries}>
            <li>只操作已有 Outbox API，不另造第二套重放通道。</li>
            <li>重放不会调用美团/抖音等外部平台，仅恢复本地投递状态。</li>
            <li>连接器能力与 Outbound HTTPS 手递仍是不同产品面，不可混称。</li>
          </ul>
        </Card>
      </section>
    </main>
  );
}
