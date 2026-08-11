'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Stage = {
  id: string;
  label: string;
  value: number | null;
  resultType: 'confirmed' | 'inferred';
  note?: string;
};
type Funnel = {
  id: string;
  stages: Stage[];
  definitions: Record<string, string>;
  generatedAt: string;
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function ManagementFunnel({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [data, setData] = useState<Funnel | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  useEffect(() => {
    void params.then(({ id: value }) => setId(value));
  }, [params]);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    if (!id) return;
    setState('loading');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/funnels/${encodeURIComponent(id)}`,
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
  }, [id]);
  useEffect(() => void load(), [load]);

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总来源归因漏斗"
          description="正在区分可确认结果与推断信号。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看来源归因漏斗"
          description="请使用具备管理权限的账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="来源归因漏斗暂不可用"
          description="漏斗口径与结果数据未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const confirmed = data.stages.filter((stage) => stage.resultType === 'confirmed');
  const baseline = confirmed[0]?.value || 0;
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 来源归因漏斗"
        title="从来源到进店承接，跟踪每一步的入口分流"
        description={`漏斗：${data.id}。确认数据与推断数据分开呈现。`}
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新数据
          </Button>
        }
      />
      <section className={styles.funnel} aria-label="来源归因漏斗">
        {data.stages.map((stage) => (
          <Card
            className={stage.resultType === 'confirmed' ? styles.confirmed : styles.inferred}
            key={stage.id}
          >
            <div>
              <span>{stage.label}</span>
              <strong>{stage.value === null ? '暂不可确认' : stage.value}</strong>
            </div>
            <StatusBadge tone={stage.resultType === 'confirmed' ? 'success' : 'warning'}>
              {stage.resultType === 'confirmed' ? '确认结果' : '推断结果'}
            </StatusBadge>
            <small>
              {stage.resultType === 'confirmed'
                ? `确认结果 · ${baseline ? Math.round(((stage.value ?? 0) / baseline) * 100) : 0}% 来源转化`
                : '推断结果 · 不计入转化率'}
            </small>
            <p>{stage.note ?? data.definitions[stage.id]}</p>
          </Card>
        ))}
      </section>
      <Card className={styles.notice}>
        <h2>口径说明</h2>
        <p>
          “访问”未和来源客户建立持久化关联，因此明确标为推断，避免把不可确认行为当作入口分流结果。其余阶段均可回溯至来源、客户、任务或订单明细。
        </p>
      </Card>
    </main>
  );
}
