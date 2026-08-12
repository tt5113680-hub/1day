'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type Employee = {
  id: string;
  name: string;
  employeeCode: string;
  title: string | null;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  followUps: number;
  evidenceLinks: number;
  contributionOrders: number;
  coaching: string;
};

type Bucket = { label: string; value: number };
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};
const backlogBucket = (count: number) => {
  if (count <= 0) return '无待办 0';
  if (count <= 5) return '轻负载 1-5';
  return '重负载 6+';
};
const twiceBucket = (value: number, labelYes: string, labelNo: string) =>
  value > 0 ? labelYes : labelNo;

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function EmployeeProcessPerformancePage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/employee-process-performance`,
        { headers: {} },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setEmployees((await response.json()).data.employees);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);

  const backlogDist = useMemo(
    () => countBy(employees.map((e) => backlogBucket(e.openTasks + e.overdueTasks))),
    [employees],
  );
  const overdueDist = useMemo(
    () => countBy(employees.map((e) => twiceBucket(e.overdueTasks, '有逾期待办', '无逾期待办'))),
    [employees],
  );
  const followDist = useMemo(
    () => countBy(employees.map((e) => twiceBucket(e.followUps, '已有跟进记录', '尚无跟进记录'))),
    [employees],
  );
  const evidenceDist = useMemo(
    () => countBy(employees.map((e) => twiceBucket(e.evidenceLinks, '有证据关联', '暂无证据'))),
    [employees],
  );
  const contributionDist = useMemo(
    () =>
      countBy(
        employees.map((e) => twiceBucket(e.contributionOrders, '有贡献关联', '暂无贡献关联')),
      ),
    [employees],
  );

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总员工过程信号"
          description="正在加载任务、跟进、证据与贡献过程数据。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看员工过程绩效"
          description="请使用具备推广员工具权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="员工过程数据暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  const overdueSignal = employees.filter((e) => e.overdueTasks > 0).length;
  const withFollow = employees.filter((e) => e.followUps > 0).length;
  const withContribution = employees.filter((e) => e.contributionOrders > 0).length;
  return (
    <main className={styles.page} data-testid="management-employee-process-performance">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 员工表现</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新数据
        </button>
      </header>

      <section className={styles.heroCard} aria-label="员工表现说明">
        <h1>用任务、跟进、证据与贡献过程支持辅导</h1>
        <p>
          参与客户成交来自已确认贡献关联的订单，不表示个人成交额，也不作为唯一绩效结论。本页只呈现过程信号，不接第三方实时人事/绩效。
        </p>
      </section>

      <section className={styles.panel} aria-label="员工概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>在职员工</span>
            <strong>{employees.length}</strong>
          </div>
          <div>
            <span>有逾期信号</span>
            <strong>{overdueSignal}</strong>
          </div>
          <div>
            <span>已有跟进</span>
            <strong>{withFollow}</strong>
          </div>
          <div>
            <span>有贡献关联</span>
            <strong>{withContribution}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="员工表现分布">
        <div className={styles.panelHead}>
          <h2>员工表现分布</h2>
          <span className={styles.panelMeta}>由真实员工过程档案行现场推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>任务负载分布</h3>
            <BarList items={backlogDist} total={employees.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>逾期信号分布</h3>
            <BarList items={overdueDist} total={employees.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>跟进完整度分布</h3>
            <BarList items={followDist} total={employees.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>证据链覆盖分布</h3>
            <BarList items={evidenceDist} total={employees.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>贡献关联分布</h3>
            <BarList items={contributionDist} total={employees.length} />
          </div>
        </div>
        <p className={styles.honest} role="note">
          以上分布全部由已抓取在职员工过程档案行现场推导(source=local)：任务负载、逾期信号、
          跟进完整度、证据链覆盖与贡献关联均按本租户真实员工过程信号统计；订单/客户关联仅反映
          已确认贡献关联的过程信号，不代表个人成交额或唯一绩效结论，不接第三方实时人事/绩效，
          不包含本平台收款、非本平台下单。
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>过程视图</h2>
          <span className={styles.panelMeta}>在职员工过程信号</span>
        </div>
        {employees.length ? (
          <div className={styles.rows}>
            {employees.map((employee) => (
              <article key={employee.id}>
                <div>
                  <strong>{employee.name}</strong>
                  <span>
                    {employee.employeeCode} · {employee.title ?? '未设置岗位'}
                  </span>
                  <p>{employee.coaching}</p>
                </div>
                <dl>
                  <div>
                    <dt>待办 / 逾期</dt>
                    <dd>
                      {employee.openTasks} /{' '}
                      <StatusBadge tone={employee.overdueTasks ? 'danger' : 'neutral'}>
                        {employee.overdueTasks}
                      </StatusBadge>
                    </dd>
                  </div>
                  <div>
                    <dt>已完成任务</dt>
                    <dd>{employee.completedTasks}</dd>
                  </div>
                  <div>
                    <dt>跟进 / 证据</dt>
                    <dd>
                      {employee.followUps} / {employee.evidenceLinks}
                    </dd>
                  </div>
                  <div>
                    <dt>参与客户成交</dt>
                    <dd>{employee.contributionOrders}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>当前没有可展示的在职员工过程记录。</div>
        )}
      </section>
    </main>
  );
}
function BarList({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li key={item.label} className={styles.barRow}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </span>
          <span className={styles.barValue}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
