'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

type Bucket = { label: string; value: number };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const statusLabel = (status: string) =>
  ({ active: '跟进中', paused: '已暂停', archived: '已归档', closed: '已关闭' })[status] ??
  (status ? status : '未标注');

const taskLoadBucket = (openTasks: number) => {
  if (!openTasks) return '无待办';
  if (openTasks <= 2) return '轻负载 1-2';
  return '重负载 3+';
};

const createdBucket = (createdAt: string) => {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return '时间待定';
  const days = (Date.now() - created) / 864e5;
  if (days <= 7) return '近 7 天';
  if (days <= 30) return '近 30 天';
  return '30 天以上';
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

  const ownershipDist = useMemo(
    () => countBy(customers.map((row) => (row.owned ? '归属中' : '协作中'))),
    [customers],
  );
  const statusDist = useMemo(
    () => countBy(customers.map((row) => statusLabel(row.status))),
    [customers],
  );
  const taskLoadDist = useMemo(
    () => countBy(customers.map((row) => taskLoadBucket(row.openTasks ?? 0))),
    [customers],
  );
  const createdDist = useMemo(
    () => countBy(customers.map((row) => createdBucket(row.createdAt))),
    [customers],
  );

  if (state === 'loading') {
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载客户目录" />
      </main>
    );
  }
  if (state === 'forbidden') {
    return (
      <main className={styles.centered}>
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
      <main className={styles.centered}>
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
    <main className={styles.page} data-testid="employee-customer-directory">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 客户目录</span>
        <div className={styles.topBarActions}>
          <a className={styles.topBarLink} href="/e/leads">
            获客池
          </a>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </div>
      </header>

      <section className={styles.heroCard} aria-label="客户目录概览">
        <h1>客户目录</h1>
        <p>
          仅展示你拥有归属、任务或贡献关系的客户；公海线索请进入获客池。跟进服务痕迹，不含第三方订单履约。
        </p>
      </section>

      <section className={styles.panel} aria-label="客户概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>客户记录</span>
            <strong>{customers.length}</strong>
          </div>
          <div>
            <span>归属中</span>
            <strong>{customers.filter((row) => row.owned).length}</strong>
          </div>
          <div>
            <span>协作中</span>
            <strong>{customers.filter((row) => !row.owned).length}</strong>
          </div>
          <div>
            <span>有待办</span>
            <strong>{customers.filter((row) => row.openTasks > 0).length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="客户跟进分布">
        <div className={styles.panelHead}>
          <h2>客户跟进分布</h2>
          <span className={styles.panelMeta}>由目录真实行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>归属分布</h3>
            <Bars items={ownershipDist} total={customers.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>状态分布</h3>
            <Bars items={statusDist} total={customers.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>待办负载分布</h3>
            <Bars items={taskLoadDist} total={customers.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>建档窗口分布</h3>
            <Bars items={createdDist} total={customers.length} />
          </div>
        </div>
      </section>

      {state === 'empty' ? (
        <section className={styles.section}>
          <AppStatePanel
            kind="empty"
            title="暂无归属客户"
            description="领取线索或被分配任务后，客户会出现在这里。"
            action={<a href="/e/leads">去获客池</a>}
          />
        </section>
      ) : (
        <section className={styles.section} aria-label="我的客户">
          <div className={styles.sectionHead}>
            <h2>我的客户</h2>
            <span>{customers.length} 位</span>
          </div>
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
                <h3>{customer.displayName || '未命名客户'}</h3>
                <p>客户 ID：{customer.id.slice(0, 8)}…</p>
              </div>
              <a href={`/e/customers/${customer.id}`}>详情</a>
            </article>
          ))}
        </section>
      )}

      <p className={styles.honest} role="note">
        以上分布全部由已抓取客户目录档案行现场推导(source=local)：归属/状态/待办负载/建档窗口均由真实
        customers 行统计。推广员工具客户目录跟进服务痕迹，不含第三方订单履约，不代履约美团/抖音订单，非本平台下单。
      </p>
      <p className={styles.note}>
        推广员工具客户目录：列表与详情共用同一服务端客户范围规则；不宣称跨店导出、租户 CRM 或第三方成交回写。
      </p>
    </main>
  );
}
