'use client';
import { SessionApiClient } from '@oneday/session-client';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Manager = { id: string; name: string };
type Store = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  status: string;
  version: number;
  merchantName: string;
  managers: Manager[];
  activeServices: number;
  entryCount: number;
  entryOpens30d: number;
  openTasks: number;
};
type Employee = { id: string; display_name: string; employee_code: string; status: string };
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function StoresPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const headers = {};
      const [storeResponse, employeeResponse] = await Promise.all([
        sessionApi.request(`${api}/api/v1/management/stores`, { headers }),
        sessionApi.request(`${api}/api/v1/employees`, {
          headers: { ...headers },
        }),
      ]);
      if ([401, 403].includes(storeResponse.status)) return setState('forbidden');
      if (!storeResponse.ok) throw new Error('LOAD');
      setStores((await storeResponse.json()).data);
      setEmployees(
        employeeResponse.ok
          ? (await employeeResponse.json()).data.filter(
              (employee: Employee) => employee.status === 'active',
            )
          : [],
      );
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const assign = async (store: Store) => {
    const employeeId = selected[store.id];
    if (!employeeId) return setNote('请选择负责人后再保存。');
    const response = await sessionApi.request(
      `${api}/api/v1/management/stores/${store.id}/manager`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ employeeId, version: store.version }),
      },
    );
    if (!response.ok) return setNote('负责人未更新，请刷新后重试。');
    setNote('负责人已更新，变更已记入审计记录。');
    await load();
  };
  if (state === 'loading') return <main className={styles.centered}>正在汇总门店经营数据…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看门店管理</h1>
          <p>请使用具备经营管理权限的账号。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>门店数据暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 门店管理</p>
          <h1>在同一视图比较每个门店的入口与经营信号</h1>
          <span>指标只使用已持久化的服务、消费者入口打开与同组织待办数据。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <section className={styles.list}>
        {stores.length ? (
          stores.map((store) => (
            <article className={styles.card} key={store.id}>
              <div className={styles.head}>
                <div>
                  <span className={styles[store.status]}>{store.status}</span>
                  <h2>{store.name}</h2>
                  <p>
                    {store.code} · {store.merchantName} · {store.address ?? '未配置地址'}
                  </p>
                </div>
                <strong>
                  {store.entryOpens30d}
                  <small>近 30 天入口打开</small>
                </strong>
              </div>
              <dl>
                <div>
                  <dt>负责人</dt>
                  <dd>
                    {store.managers.length
                      ? store.managers.map((manager) => manager.name).join('、')
                      : '未指派'}
                  </dd>
                </div>
                <div>
                  <dt>入口</dt>
                  <dd>{store.entryCount} 个已配置动作</dd>
                </div>
                <div>
                  <dt>服务</dt>
                  <dd>{store.activeServices} 项可用服务</dd>
                </div>
                <div>
                  <dt>待推进</dt>
                  <dd>{store.openTasks} 项同组织任务</dd>
                </div>
              </dl>
              <div className={styles.assign}>
                <label htmlFor={`manager-${store.id}`}>调整负责人</label>
                <select
                  id={`manager-${store.id}`}
                  value={selected[store.id] ?? ''}
                  onChange={(event) =>
                    setSelected((values) => ({ ...values, [store.id]: event.target.value }))
                  }
                >
                  <option value="">选择员工</option>
                  {employees.map((employee) => (
                    <option value={employee.id} key={employee.id}>
                      {employee.display_name} ({employee.employee_code})
                    </option>
                  ))}
                </select>
                <button onClick={() => void assign(store)}>保存负责人</button>
              </div>
            </article>
          ))
        ) : (
          <section className={styles.empty}>
            <h2>暂无门店</h2>
            <p>创建门店并配置入口后，经营对比会在此处出现。</p>
          </section>
        )}
      </section>
    </main>
  );
}
