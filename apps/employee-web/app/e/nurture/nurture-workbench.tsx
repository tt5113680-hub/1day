'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './nurture-workbench.module.css';
import { EmployeeWorkbenchKpi } from '../employee-workbench-kpi';

type Profile = {
  customerId: string;
  customerName: string;
  segment: 'active' | 'repurchase' | 'dormant';
  nextTouchAt: string | null;
  lastOrderAt: string | null;
  orderCount: number;
  openTasks: number;
  version: number;
};

type Bucket = { label: string; value: number };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const labels = { active: '持续跟进', repurchase: '回访机会', dormant: '沉睡唤醒' };

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const workloadLabel = (openTasks: number) =>
  openTasks === 0 ? '无待办' : openTasks <= 2 ? '少量待办' : '多待办';

const windowLabel = (nextTouchAt: string | null) => {
  if (!nextTouchAt) return '尚未排程';
  const date = new Date(nextTouchAt);
  if (Number.isNaN(date.getTime())) return '时间待定';
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return '已逾期';
  if (diffDays === 0) return '今日触达';
  if (diffDays <= 7) return '近一周';
  return '一周后';
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

export function NurtureWorkbench() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [segment, setSegment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const headers = () => ({
    'content-type': 'application/json',
  });
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const query = segment ? `?segment=${encodeURIComponent(segment)}` : '';
      const response = await sessionApi.request(`${api}/api/v1/employee/nurture${query}`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setProfiles((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [segment]);
  useEffect(() => {
    void load();
  }, [load]);
  const send = async (
    profile: Profile,
    path: string,
    body: Record<string, unknown>,
    success: string,
  ) => {
    setBusy(profile.customerId);
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/nurture/${profile.customerId}${path}`,
        {
          method: path ? 'POST' : 'PATCH',
          headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ version: profile.version, ...body }),
        },
      );
      if (!response.ok) throw Error('ACTION');
      setMessage(success);
      await load();
    } catch {
      setMessage('操作未完成，记录可能已更新。请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };

  const activeCount = useMemo(
    () => profiles.filter((p) => p.segment === 'active').length,
    [profiles],
  );
  const repurchaseCount = useMemo(
    () => profiles.filter((p) => p.segment === 'repurchase').length,
    [profiles],
  );
  const dormantCount = useMemo(
    () => profiles.filter((p) => p.segment === 'dormant').length,
    [profiles],
  );
  const overloaded = useMemo(() => profiles.filter((p) => p.openTasks > 2).length, [profiles]);
  const segmentDist = useMemo(
    () => countBy(profiles.map((p) => labels[p.segment] ?? '未分层')),
    [profiles],
  );
  const workloadDist = useMemo(
    () => countBy(profiles.map((p) => workloadLabel(p.openTasks))),
    [profiles],
  );
  const windowDist = useMemo(
    () => countBy(profiles.map((p) => windowLabel(p.nextTouchAt))),
    [profiles],
  );
  const touchDist = useMemo(
    () => countBy(profiles.map((p) => (p.nextTouchAt ? '已排程触达' : '待排程'))),
    [profiles],
  );

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载客户跟进队列"
          description="正在同步客户分层与下一次触达安排。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法访问客户跟进队列"
          description="请使用具备客户权限的员工账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="客户跟进队列暂不可用"
          description="客户跟进队列未能完成加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page} data-testid="employee-nurture">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 客户跟进</span>
        <div className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </div>
      </header>

      <section className={styles.heroCard} aria-label="客户跟进队列概览">
        <h1>把下一次触达变成今天的行动</h1>
        <p>
          分层查看回访机会与沉睡客户，记录每次触达并转成可执行任务。本页只做跟进作业编排，
          不碰销售成交、不含支付金额与第三方订单结果状态断言。
        </p>
      </section>

      <EmployeeWorkbenchKpi page="nurture" />

      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.panel} aria-label="客户跟进队列概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>队列客户</span>
            <strong>{profiles.length}</strong>
          </div>
          <div>
            <span>持续跟进</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <span>回访机会</span>
            <strong>{repurchaseCount}</strong>
          </div>
          <div>
            <span>沉睡唤醒</span>
            <strong>{dormantCount}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="客户跟进队列分布">
        <div className={styles.panelHead}>
          <h2>客户跟进队列分布</h2>
          <span className={styles.panelMeta}>由客户分层档案推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>分层分布</h3>
            <Bars items={segmentDist} total={profiles.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>待办负载分布</h3>
            <Bars items={workloadDist} total={profiles.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>触达安排分布</h3>
            <Bars items={touchDist} total={profiles.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>触达窗口分布</h3>
            <Bars items={windowDist} total={profiles.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>多待办负载</h3>
            <span className={styles.barEmpty}>{overloaded} 位客户已积压 2 个以上待办</span>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="触达过滤器">
        <div className={styles.toolbar}>
          <label>
            客户分层
            <select
              aria-label="客户分层"
              value={segment}
              onChange={(event) => setSegment(event.target.value)}
            >
              <option value="">全部客户</option>
              <option value="repurchase">回访机会</option>
              <option value="dormant">沉睡唤醒</option>
              <option value="active">持续跟进</option>
            </select>
          </label>
          <strong>{profiles.length} 位</strong>
        </div>
      </section>

      <section className={styles.panel} aria-label="跟进队列">
        <div className={styles.panelHead}>
          <h2>跟进队列</h2>
          <span className={styles.panelMeta}>由当前筛选分层显示</span>
        </div>
        {profiles.length ? (
          profiles.map((profile) => (
            <article className={styles.card} key={profile.customerId}>
              <div>
                <span className={styles.segmentBadge} data-segment={profile.segment}>
                  {labels[profile.segment] ?? profile.segment}
                </span>
                <h3>{profile.customerName}</h3>
                <p>
                  服务痕迹 {profile.orderCount} 次 ·{' '}
                  {profile.openTasks ? `${profile.openTasks} 个待办` : '暂无待办'}
                </p>
                <small>
                  {profile.lastOrderAt
                    ? `最近服务 ${new Date(profile.lastOrderAt).toLocaleDateString()}`
                    : '尚无服务痕迹'}
                  {profile.nextTouchAt
                    ? ` · 下次触达 ${new Date(profile.nextTouchAt).toLocaleDateString()}`
                    : ''}
                </small>
              </div>
              <div className={styles.actions}>
                <select
                  aria-label={`调整 ${profile.customerName} 分层`}
                  value={profile.segment}
                  disabled={busy === profile.customerId}
                  onChange={(event) =>
                    void send(
                      profile,
                      '',
                      { segment: event.target.value, nextTouchAt: profile.nextTouchAt },
                      '客户分层已更新。',
                    )
                  }
                >
                  <option value="active">持续跟进</option>
                  <option value="repurchase">回访机会</option>
                  <option value="dormant">沉睡唤醒</option>
                </select>
                <Button
                  tone="secondary"
                  loading={busy === profile.customerId}
                  onClick={() =>
                    void send(
                      profile,
                      '/touchpoints',
                      { actionType: 'message', note: '员工端记录触达' },
                      '触达已留痕。',
                    )
                  }
                >
                  记录触达
                </Button>
                <Button
                  loading={busy === profile.customerId}
                  onClick={() =>
                    void send(
                      profile,
                      '/touchpoints',
                      {
                        actionType: 'call',
                        note: '安排跟进',
                        createTask: true,
                        taskTitle: `跟进 ${profile.customerName}`,
                        dueAt: new Date(Date.now() + 86400000).toISOString(),
                      },
                      '跟进任务已创建。',
                    )
                  }
                >
                  安排跟进
                </Button>
              </div>
            </article>
          ))
        ) : (
          <AppStatePanel
            kind="empty"
            title="暂时没有需要跟进的客户"
            description="把获客池中的线索转入跟进后，会在这里形成可执行的服务队列。"
          />
        )}
      </section>

      <p className={styles.honest} role="note">
        以上分布全部由已抓取客户分层档案行现场推导，源 source=local：分层、待办负载与触达窗口按真实
        nurture
        行统计。推广员工具客户跟进队列只做跟进作业编排与入口痕迹整理，不代履约美团/抖音订单，
        非本平台下单，不含第三方订单履约与支付金额。
      </p>
    </main>
  );
}
