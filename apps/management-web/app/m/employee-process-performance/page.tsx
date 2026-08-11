'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
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
        {
          headers: {},
        },
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
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 员工表现"
        title="用任务、跟进、证据与贡献过程支持辅导"
        description="参与客户成交来自已确认贡献关联的订单，不表示个人成交额，也不作为唯一绩效结论。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新数据
          </Button>
        }
      />
      <Card className={styles.panel}>
        <h2>过程视图</h2>
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
      </Card>
    </main>
  );
}
