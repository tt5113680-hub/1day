'use client';

import { useCallback, useEffect, useState } from 'react';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import styles from './customer-directory.module.css';

type CustomerRow = {
  id: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  owned: boolean;
  openTasks: number;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export function CustomerDirectory() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error' | 'empty'>(
    'loading',
  );
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/customers`, {
        headers: { 'content-type': 'application/json' },
      });
      if ([401, 403].includes(response.status)) {
        setState('forbidden');
        return;
      }
      if (!response.ok) throw new Error('LOAD');
      const payload = (await response.json()).data as { customers?: CustomerRow[] };
      const rows = payload.customers ?? [];
      setCustomers(rows);
      setState(rows.length ? 'ready' : 'empty');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return (
      <main className={styles.page}>
        <AppStatePanel kind="loading" title="正在加载客户目录" />
      </main>
    );
  }
  if (state === 'forbidden') {
    return (
      <main className={styles.page}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看客户目录"
          description="需要有效员工会话与 customer.read 权限。"
        />
      </main>
    );
  }
  if (state === 'error') {
    return (
      <main className={styles.page}>
        <AppStatePanel
          kind="error"
          title="客户目录暂时不可用"
          description="请稍后重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Employee · 客户目录</p>
        <h1>客户目录</h1>
        <p>仅展示你拥有归属、任务或贡献关系的客户；公海线索请进入获客池。</p>
        <div className={styles.headerActions}>
          <a href="/e/leads">获客池</a>
          <Button tone="quiet" onClick={() => void load()}>
            刷新
          </Button>
        </div>
      </header>

      {state === 'empty' ? (
        <AppStatePanel
          kind="empty"
          title="暂无归属客户"
          description="领取线索或被分配任务后，客户会出现在这里。"
          action={<a href="/e/leads">去获客池</a>}
        />
      ) : (
        <section className={styles.list} aria-label="我的客户">
          {customers.map((customer) => (
            <article className={styles.card} key={customer.id}>
              <div>
                <div className={styles.meta}>
                  <StatusBadge tone={customer.owned ? 'success' : 'neutral'}>
                    {customer.owned ? '归属中' : '协作中'}
                  </StatusBadge>
                  {customer.openTasks > 0 ? (
                    <StatusBadge tone="info">{customer.openTasks} 个待办</StatusBadge>
                  ) : null}
                </div>
                <h2>{customer.displayName || '未命名客户'}</h2>
                <p>客户 ID：{customer.id.slice(0, 8)}…</p>
              </div>
              <a href={`/e/customers/${customer.id}`}>详情</a>
            </article>
          ))}
        </section>
      )}
      <p className={styles.note}>
        SYS-31 客户目录：列表与详情共用同一服务端客户范围规则，不宣称跨店导出或租户 CRM。
      </p>
    </main>
  );
}
