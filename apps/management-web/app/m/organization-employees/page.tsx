'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, businessLabel, Button, StatusBadge } from '@oneday/ui';

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
type Merchant = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  status: string;
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
type Data = {
  organizations: Organization[];
  merchants: Merchant[];
  employees: Employee[];
  invitations: Invitation[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function OrganizationEmployeesPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState({ email: '', employeeCode: '', organizationId: '', title: '' });
  const [orgForm, setOrgForm] = useState({ code: '', name: '', organizationType: 'merchant' });
  const [merchantForm, setMerchantForm] = useState({
    code: '',
    name: '',
    organizationId: '',
  });
  const [storeForm, setStoreForm] = useState({
    code: '',
    name: '',
    organizationId: '',
    merchantId: '',
    address: '',
  });
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
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
      const firstOrg = next.organizations[0]?.id || '';
      const firstMerchant = next.merchants[0]?.id || '';
      setForm((value) => ({
        ...value,
        organizationId: value.organizationId || firstOrg,
      }));
      setMerchantForm((value) => ({
        ...value,
        organizationId: value.organizationId || firstOrg,
      }));
      setStoreForm((value) => ({
        ...value,
        organizationId: value.organizationId || firstOrg,
        merchantId: value.merchantId || firstMerchant,
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
  const createOrganization = async () => {
    if (!orgForm.code.trim() || !orgForm.name.trim()) {
      setFieldError('组织编码与名称不能为空。');
      return;
    }
    setFieldError('');
    setBusy('org');
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/organizations`, {
        method: 'POST',
        headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify(orgForm),
      });
      if (!response.ok) throw new Error('ORG');
      setOrgForm({ code: '', name: '', organizationType: 'merchant' });
      setNote('组织已创建。');
      await load();
    } catch {
      setNote('组织未创建，请确认具备组织管理权限。');
    } finally {
      setBusy(null);
    }
  };
  const createMerchant = async () => {
    if (!merchantForm.code.trim() || !merchantForm.name.trim() || !merchantForm.organizationId) {
      setFieldError('商户编码、名称与所属组织不能为空。');
      return;
    }
    setFieldError('');
    setBusy('merchant');
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/merchants`, {
        method: 'POST',
        headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify(merchantForm),
      });
      if (!response.ok) throw new Error('MERCHANT');
      setMerchantForm((value) => ({ ...value, code: '', name: '' }));
      setNote('商户已创建。');
      await load();
    } catch {
      setNote('商户未创建，请确认组织存在且具备组织管理权限。');
    } finally {
      setBusy(null);
    }
  };
  const createStore = async () => {
    if (
      !storeForm.code.trim() ||
      !storeForm.name.trim() ||
      !storeForm.organizationId ||
      !storeForm.merchantId
    ) {
      setFieldError('门店编码、名称、组织与商户不能为空。');
      return;
    }
    setFieldError('');
    setBusy('store');
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/stores`, {
        method: 'POST',
        headers: { ...headers(), 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify(storeForm),
      });
      if (!response.ok) throw new Error('STORE');
      setStoreForm((value) => ({ ...value, code: '', name: '', address: '' }));
      setNote('门店已创建。');
      await load();
    } catch {
      setNote('门店未创建，请确认商户归属正确且具备组织管理权限。');
    } finally {
      setBusy(null);
    }
  };
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
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载组织与员工数据"
          description="正在校验组织归属、邀请状态与交接风险。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看组织与员工"
          description="请使用具备推广员工具权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="组织数据暂不可用"
          description="组织与员工数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const merchantsForStore = data.merchants.filter(
    (merchant) =>
      !storeForm.organizationId || merchant.organization_id === storeForm.organizationId,
  );
  const activeEmployees = data.employees.filter((employee) => employee.status === 'active');
  const loadLabel = (count: number) =>
    count <= 0 ? '无待办' : count <= 5 ? '轻负载 1-5' : '重负载 6+';
  const customerLabel = (count: number) =>
    count <= 0 ? '无客户' : count <= 10 ? '少量客户 1-10' : '大量客户 11+';
  const employeeStatusCounts = new Map<string, number>();
  for (const employee of data.employees) {
    const key = employee.status === 'active' ? '在岗' : '已离岗/停用';
    employeeStatusCounts.set(key, (employeeStatusCounts.get(key) ?? 0) + 1);
  }
  const byEmployeeStatus = [...employeeStatusCounts.entries()].map(([key, value]) => ({
    key,
    value,
  }));
  const loadCounts = new Map<string, number>();
  for (const employee of data.employees) {
    const key = loadLabel(employee.open_task_count);
    loadCounts.set(key, (loadCounts.get(key) ?? 0) + 1);
  }
  const byLoad = [...loadCounts.entries()].map(([key, value]) => ({ key, value }));
  const customerCounts = new Map<string, number>();
  for (const employee of data.employees) {
    const key = customerLabel(employee.active_customer_count);
    customerCounts.set(key, (customerCounts.get(key) ?? 0) + 1);
  }
  const byCustomers = [...customerCounts.entries()].map(([key, value]) => ({ key, value }));
  const organizationCounts = new Map<string, number>();
  for (const employee of data.employees) {
    const org = data.organizations.find(
      (organization) => organization.id === employee.organization_id,
    );
    const key = org?.name ?? '未归属组织';
    organizationCounts.set(key, (organizationCounts.get(key) ?? 0) + 1);
  }
  const byOrganization = [...organizationCounts.entries()].map(([key, value]) => ({ key, value }));
  const invitationCounts = new Map<string, number>();
  for (const invitation of data.invitations) {
    const org = data.organizations.find(
      (organization) => organization.id === invitation.organization_id,
    );
    const key = org?.name ?? '未归属组织';
    invitationCounts.set(key, (invitationCounts.get(key) ?? 0) + 1);
  }
  const byInvitation = [...invitationCounts.entries()].map(([key, value]) => ({ key, value }));
  return (
    <main className={styles.page} data-testid="management-organization-employees">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 员工管理</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新组织
        </button>
      </header>

      <section className={styles.heroCard} aria-label="员工管理说明">
        <h1>让每位员工的归属、待办与离职交接可见</h1>
        <p>
          组织、商户、门店创建与员工邀请均复用既有组织写接口；不另造第二套
          API。员工表现、交接风险与受控离职均在租户工具授权范围内。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="员工管理概况">
        <div>
          <span>组织</span>
          <strong>{data.organizations.length}</strong>
        </div>
        <div>
          <span>商户</span>
          <strong>{data.merchants.length}</strong>
        </div>
        <div>
          <span>在岗员工</span>
          <strong>{activeEmployees.length}</strong>
        </div>
        <div>
          <span>待接受邀请</span>
          <strong>{data.invitations.length}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="员工分布">
        <div className={styles.panelBlock}>
          <h2>员工状态分布</h2>
          <ul className={styles.bars}>
            {byEmployeeStatus.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${data.employees.length ? (b.value / data.employees.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.employees.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>组织员工分布</h2>
          <ul className={styles.bars}>
            {byOrganization.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${data.employees.length ? (b.value / data.employees.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.employees.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>待办负载分布</h2>
          <ul className={styles.bars}>
            {byLoad.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${data.employees.length ? (b.value / data.employees.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.employees.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>客户负载分布</h2>
          <ul className={styles.bars}>
            {byCustomers.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${data.employees.length ? (b.value / data.employees.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.employees.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>待接受邀请分布</h2>
          <ul className={styles.bars}>
            {byInvitation.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${data.invitations.length ? (b.value / data.invitations.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.invitations.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取的真实组织与员工档案行现场推导（source=local）：不接美团/抖音实时人事或绩效、不伪造第三方评分或成交、不包含本平台收款、非本平台下单。
      </p>

      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <section className={styles.createGrid}>
        <article className={styles.panel}>
          <h2>创建组织</h2>
          <div className={styles.form}>
            <label>
              编码
              <input
                aria-label="组织编码"
                value={orgForm.code}
                onChange={(event) => setOrgForm({ ...orgForm, code: event.target.value })}
              />
            </label>
            <label>
              名称
              <input
                aria-label="组织名称"
                value={orgForm.name}
                onChange={(event) => setOrgForm({ ...orgForm, name: event.target.value })}
              />
            </label>
            <label>
              类型
              <select
                aria-label="组织类型"
                value={orgForm.organizationType}
                onChange={(event) =>
                  setOrgForm({ ...orgForm, organizationType: event.target.value })
                }
              >
                <option value="merchant">merchant</option>
                <option value="enterprise">enterprise</option>
                <option value="team">team</option>
              </select>
            </label>
            <Button disabled={busy === 'org'} onClick={() => void createOrganization()}>
              创建组织
            </Button>
          </div>
        </article>
        <article className={styles.panel}>
          <h2>创建商户</h2>
          <div className={styles.form}>
            <label>
              所属组织
              <select
                aria-label="商户所属组织"
                value={merchantForm.organizationId}
                onChange={(event) =>
                  setMerchantForm({ ...merchantForm, organizationId: event.target.value })
                }
              >
                {data.organizations.map((organization) => (
                  <option value={organization.id} key={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              编码
              <input
                aria-label="商户编码"
                value={merchantForm.code}
                onChange={(event) => setMerchantForm({ ...merchantForm, code: event.target.value })}
              />
            </label>
            <label>
              名称
              <input
                aria-label="商户名称"
                value={merchantForm.name}
                onChange={(event) => setMerchantForm({ ...merchantForm, name: event.target.value })}
              />
            </label>
            <Button disabled={busy === 'merchant'} onClick={() => void createMerchant()}>
              创建商户
            </Button>
          </div>
        </article>
        <article className={styles.panel}>
          <h2>创建门店</h2>
          <div className={styles.form}>
            <label>
              所属组织
              <select
                aria-label="门店所属组织"
                value={storeForm.organizationId}
                onChange={(event) => {
                  const organizationId = event.target.value;
                  const merchantId =
                    data.merchants.find((merchant) => merchant.organization_id === organizationId)
                      ?.id ?? '';
                  setStoreForm({ ...storeForm, organizationId, merchantId });
                }}
              >
                {data.organizations.map((organization) => (
                  <option value={organization.id} key={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              所属商户
              <select
                aria-label="门店所属商户"
                value={storeForm.merchantId}
                onChange={(event) => setStoreForm({ ...storeForm, merchantId: event.target.value })}
              >
                {merchantsForStore.map((merchant) => (
                  <option value={merchant.id} key={merchant.id}>
                    {merchant.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              编码
              <input
                aria-label="门店编码"
                value={storeForm.code}
                onChange={(event) => setStoreForm({ ...storeForm, code: event.target.value })}
              />
            </label>
            <label>
              名称
              <input
                aria-label="门店名称"
                value={storeForm.name}
                onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })}
              />
            </label>
            <label>
              地址
              <input
                aria-label="门店地址"
                value={storeForm.address}
                onChange={(event) => setStoreForm({ ...storeForm, address: event.target.value })}
              />
            </label>
            <Button disabled={busy === 'store'} onClick={() => void createStore()}>
              创建门店
            </Button>
          </div>
        </article>
      </section>
      {fieldError && <p className={styles.fieldError}>{fieldError}</p>}
      <section className={styles.grid}>
        <aside>
          <article className={styles.panel}>
            <h2>组织树</h2>
            {data.organizations.length ? (
              data.organizations.map((organization) => (
                <article className={styles.org} key={organization.id}>
                  <strong>{organization.name}</strong>
                  <span>
                    {organization.code} · {businessLabel(organization.organization_type)}
                  </span>
                  <small>{organization.active_employee_count} 名在岗员工</small>
                </article>
              ))
            ) : (
              <AppStatePanel kind="empty" title="暂无组织" />
            )}
            <h3>商户</h3>
            {data.merchants.length ? (
              data.merchants.map((merchant) => (
                <article className={styles.org} key={merchant.id}>
                  <strong>{merchant.name}</strong>
                  <span>{merchant.code}</span>
                </article>
              ))
            ) : (
              <p>暂无商户。</p>
            )}
          </article>
        </aside>
        <article className={styles.panel}>
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
            <Button onClick={() => void invite()}>创建邀请</Button>
          </div>
          <h3>待接受邀请</h3>
          {data.invitations.length ? (
            data.invitations.map((invitation) => (
              <p className={styles.invite} key={invitation.id}>
                {invitation.email} · {invitation.employee_code} · 截止{' '}
                {new Date(invitation.expires_at).toLocaleDateString('zh-CN')}
              </p>
            ))
          ) : (
            <p>暂无待接受邀请。</p>
          )}
        </article>
      </section>
      <article className={styles.panel}>
        <h2>员工与交接风险</h2>
        {data.employees.length ? (
          <div className={styles.table}>
            {data.employees.map((employee) => (
              <article className={styles.employee} key={employee.id}>
                <div>
                  <strong>{employee.display_name}</strong>
                  <span>
                    {employee.employee_code} · {employee.title ?? '未设置职务'}
                  </span>
                  <small>{employee.email}</small>
                  <StatusBadge tone={employee.status === 'active' ? 'success' : 'neutral'}>
                    {businessLabel(employee.status)}
                  </StatusBadge>
                </div>
                <div>
                  <b>{employee.open_task_count}</b>
                  <small>待办</small>
                </div>
                <div>
                  <b>{employee.active_customer_count}</b>
                  <small>客户</small>
                </div>
                <Button
                  tone="secondary"
                  disabled={employee.status !== 'active'}
                  onClick={() => void offboard(employee)}
                >
                  办理离职
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <AppStatePanel kind="empty" title="暂无员工" description="创建邀请以添加首位员工。" />
        )}
      </article>
    </main>
  );
}
