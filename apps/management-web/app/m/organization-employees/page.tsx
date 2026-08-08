'use client';
import { SessionApiClient } from '@oneday/session-client';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Organization = {
  id: string;
  code: string;
  name: string;
  organization_type: string;
  status: string;
  active_employee_count: number;
};
type Employee = {
  id: string;
  organization_id: string;
  employee_code: string;
  title: string | null;
  status: string;
  version: number;
  display_name: string;
  email: string;
  open_task_count: number;
  active_customer_count: number;
};
type Invitation = {
  id: string;
  organization_id: string;
  email: string;
  employee_code: string;
  title: string | null;
  expires_at: string;
};
type Data = { organizations: Organization[]; employees: Employee[]; invitations: Invitation[] };
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function OrganizationEmployeesPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState({ email: '', employeeCode: '', organizationId: '', title: '' });
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/organization-employees`, {
        headers: {},
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw new Error('LOAD');
      const next = (await response.json()).data as Data;
      setData(next);
      setForm((value) => ({
        ...value,
        organizationId: value.organizationId || next.organizations[0]?.id || '',
      }));
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const headers = () => ({
    'content-type': 'application/json',
  });
  const invite = async () => {
    if (!form.email || !form.employeeCode || !form.organizationId) {
      setFieldError('邮箱、员工编号和组织不能为空。');
      return;
    }
    setFieldError('');
    const response = await sessionApi.request(`${api}/api/v1/employees/invitations`, {
      method: 'POST',
      headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      setNote('邀请未发送，请检查字段后重试。');
      return;
    }
    setNote('邀请已创建，等待员工在有效期内接受。');
    setForm((value) => ({ ...value, email: '', employeeCode: '', title: '' }));
    await load();
  };
  const offboard = async (employee: Employee) => {
    if (
      !confirm(
        `确认离职 ${employee.display_name}？其待办 ${employee.open_task_count} 项、客户 ${employee.active_customer_count} 位需要先完成后续交接。`,
      )
    )
      return;
    const response = await sessionApi.request(`${api}/api/v1/employees/${employee.id}/offboard`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ version: employee.version }),
    });
    if (!response.ok) {
      setNote('离职操作未完成，请刷新后重试。');
      return;
    }
    setNote('员工已离职；交接风险仍在页面中保留，需由管理者安排处理。');
    await load();
  };
  if (state === 'loading') return <main className={styles.centered}>正在加载组织与员工数据…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看组织与员工</h1>
          <p>请使用具备经营管理权限的账号。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>组织数据暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 组织与员工</p>
          <h1>让每位员工的归属、待办与离职交接可见</h1>
          <span>组织、邀请、员工和交接风险均从租户隔离的业务数据读取。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <aside className={styles.panel}>
          <h2>组织树</h2>
          {data.organizations.length ? (
            data.organizations.map((organization) => (
              <article className={styles.org} key={organization.id}>
                <strong>{organization.name}</strong>
                <span>
                  {organization.code} · {organization.organization_type}
                </span>
                <small>{organization.active_employee_count} 名在岗员工</small>
              </article>
            ))
          ) : (
            <p>暂无组织。</p>
          )}
        </aside>
        <section className={styles.panel}>
          <h2>邀请员工</h2>
          <div className={styles.form}>
            <label>
              组织
              <select
                value={form.organizationId}
                onChange={(event) => setForm({ ...form, organizationId: event.target.value })}
              >
                {data.organizations.map((organization) => (
                  <option value={organization.id} key={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              邮箱
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              员工编号
              <input
                value={form.employeeCode}
                onChange={(event) => setForm({ ...form, employeeCode: event.target.value })}
              />
            </label>
            <label>
              职务
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            {fieldError && <p className={styles.fieldError}>{fieldError}</p>}
            <button onClick={() => void invite()}>创建邀请</button>
          </div>
          <h3>待接受邀请</h3>
          {data.invitations.length ? (
            data.invitations.map((invitation) => (
              <p className={styles.invite} key={invitation.id}>
                {invitation.email} · {invitation.employee_code} · 截止{' '}
                {new Date(invitation.expires_at).toLocaleDateString()}
              </p>
            ))
          ) : (
            <p>暂无待接受邀请。</p>
          )}
        </section>
      </section>
      <section className={styles.panel}>
        <h2>员工与交接风险</h2>
        {data.employees.length ? (
          <div className={styles.table}>
            {data.employees.map((employee) => (
              <article className={styles.employee} key={employee.id}>
                <div>
                  <strong>{employee.display_name}</strong>
                  <span>
                    {employee.employee_code} · {employee.title ?? '未设置职务'} · {employee.status}
                  </span>
                  <small>{employee.email}</small>
                </div>
                <div>
                  <b>{employee.open_task_count}</b>
                  <small>待办</small>
                </div>
                <div>
                  <b>{employee.active_customer_count}</b>
                  <small>客户</small>
                </div>
                <button
                  disabled={employee.status !== 'active'}
                  onClick={() => void offboard(employee)}
                >
                  办理离职
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>暂无员工。</p>
        )}
      </section>
    </main>
  );
}
