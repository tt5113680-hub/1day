'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Link = {
  id: string;
  title: string;
  description: string | null;
  targetUrl: string;
  platformType: 'meituan' | 'douyin' | 'external';
  enabled: boolean;
  sortOrder: number;
  version: number;
};
type Commercial = {
  phone: string | null;
  businessHours: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
};
type Store = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  status: string;
  version: number;
  merchantName: string;
  managers: { id: string; name: string }[];
  activeServices: number;
  entryCount: number;
  entryOpens30d: number;
  openTasks: number;
  commercial: Commercial;
  externalLinks: Link[];
};
type Employee = { id: string; display_name: string; employee_code: string; status: string };
type LinkDraft = {
  title: string;
  description: string;
  targetUrl: string;
  platformType: Link['platformType'];
  enabled: boolean;
  sortOrder: number;
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const blankLink = (): LinkDraft => ({
  title: '',
  description: '',
  targetUrl: '',
  platformType: 'external',
  enabled: true,
  sortOrder: 0,
});

export default function StoresPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [commercial, setCommercial] = useState<Record<string, Partial<Commercial>>>({});
  const [drafts, setDrafts] = useState<Record<string, LinkDraft>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const [storesResponse, employeeResponse] = await Promise.all([
        sessionApi.request(`${api}/api/v1/management/stores`),
        sessionApi.request(`${api}/api/v1/employees`),
      ]);
      if ([401, 403].includes(storesResponse.status)) return setState('forbidden');
      if (!storesResponse.ok) throw new Error('LOAD');
      const nextStores = (await storesResponse.json()).data as Store[];
      setStores(nextStores);
      setCommercial(Object.fromEntries(nextStores.map((store) => [store.id, store.commercial])));
      setEmployees(
        employeeResponse.ok
          ? (await employeeResponse.json()).data.filter(
              (item: Employee) => item.status === 'active',
            )
          : [],
      );
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const request = (url: string, method: 'POST' | 'PATCH' | 'PUT', body: unknown) =>
    sessionApi.request(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const saveCommercial = async (store: Store) => {
    setBusy(`commercial-${store.id}`);
    setNote('');
    try {
      const response = await request(
        `${api}/api/v1/management/stores/${store.id}/commercial`,
        'PUT',
        commercial[store.id],
      );
      if (!response.ok) throw new Error('SAVE');
      setNote(`${store.name} 的门店资料已保存。`);
      await load();
    } catch {
      setNote('门店资料未保存。请检查 HTTPS 图片链接、坐标与网络后重试。');
    } finally {
      setBusy(null);
    }
  };
  const assign = async (store: Store) => {
    const employeeId = selected[store.id];
    if (!employeeId) return setNote('请选择负责人后再保存。');
    setBusy(`manager-${store.id}`);
    try {
      const response = await request(
        `${api}/api/v1/management/stores/${store.id}/manager`,
        'PATCH',
        { employeeId, version: store.version },
      );
      if (!response.ok) throw new Error('ASSIGN');
      setNote('负责人已更新。');
      await load();
    } catch {
      setNote('负责人未更新，请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };
  const saveLink = async (store: Store, link?: Link) => {
    const draft = link
      ? {
          title: link.title,
          description: link.description ?? '',
          targetUrl: link.targetUrl,
          platformType: link.platformType,
          enabled: link.enabled,
          sortOrder: link.sortOrder,
        }
      : (drafts[store.id] ?? blankLink());
    setBusy(`link-${link?.id ?? store.id}`);
    try {
      const url = link
        ? `${api}/api/v1/management/stores/${store.id}/external-links/${link.id}`
        : `${api}/api/v1/management/stores/${store.id}/external-links`;
      const response = await request(url, link ? 'PATCH' : 'POST', draft);
      if (!response.ok) throw new Error('LINK');
      setDrafts((value) => ({ ...value, [store.id]: blankLink() }));
      setNote('第三方入口已保存；消费者刷新门店页后会按启用状态显示。');
      await load();
    } catch {
      setNote('第三方入口未保存。仅支持安全 HTTPS 链接，请检查输入内容。');
    } finally {
      setBusy(null);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总门店经营数据"
          description="正在连接门店、员工与外链配置。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看门店管理"
          description="请使用具备经营管理权限的账号登录。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="门店数据暂不可用"
          description="请检查网络后重新加载。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 门店入口"
        title="门店管理"
        description="维护门店营业状态、资料、统一入口与负责人；第三方入口仅记录跳转，不代替平台下单/支付，也不含第三方订单履约。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新
          </Button>
        }
      />
      <section className={styles.summaryStrip} aria-label="门店概况">
        <div>
          <span>门店数</span>
          <strong>{stores.length}</strong>
        </div>
        <div>
          <span>营业中</span>
          <strong>{stores.filter((s) => s.status === 'active').length}</strong>
        </div>
        <div>
          <span>待跟进任务</span>
          <strong>{stores.reduce((n, s) => n + s.openTasks, 0)}</strong>
        </div>
        <div>
          <span>近30日入口打开</span>
          <strong>{stores.reduce((n, s) => n + s.entryOpens30d, 0)}</strong>
        </div>
      </section>
      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <section className={styles.list}>
        {stores.map((store) => (
          <article className={styles.card} key={store.id}>
            <div className={styles.head}>
              <div>
                <StatusBadge tone={store.status === 'active' ? 'success' : 'neutral'}>
                  {store.status === 'active' ? '营业中' : '已停用'}
                </StatusBadge>
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
                <dt>平台入口</dt>
                <dd>{store.entryCount} 个启用</dd>
              </div>
              <div>
                <dt>服务</dt>
                <dd>{store.activeServices} 项可用</dd>
              </div>
              <div>
                <dt>待跟进</dt>
                <dd>{store.openTasks} 项任务</dd>
              </div>
            </dl>
            <div className={styles.assign}>
              <label htmlFor={`manager-${store.id}`}>调整负责人</label>
              <select
                id={`manager-${store.id}`}
                value={selected[store.id] ?? ''}
                onChange={(event) =>
                  setSelected((value) => ({ ...value, [store.id]: event.target.value }))
                }
              >
                <option value="">选择员工</option>
                {employees.map((employee) => (
                  <option value={employee.id} key={employee.id}>
                    {employee.display_name} ({employee.employee_code})
                  </option>
                ))}
              </select>
              <Button disabled={busy === `manager-${store.id}`} onClick={() => void assign(store)}>
                保存负责人
              </Button>
            </div>
            <section className={styles.commercial}>
              <h3>消费者门店资料</h3>
              <div className={styles.formGrid}>
                <label>
                  营业时间
                  <input
                    value={commercial[store.id]?.businessHours ?? ''}
                    onChange={(event) =>
                      setCommercial((value) => ({
                        ...value,
                        [store.id]: {
                          ...value[store.id],
                          businessHours: event.target.value || null,
                        },
                      }))
                    }
                    placeholder="例如：每日 07:00–22:00"
                  />
                </label>
                <label>
                  联系电话
                  <input
                    value={commercial[store.id]?.phone ?? ''}
                    onChange={(event) =>
                      setCommercial((value) => ({
                        ...value,
                        [store.id]: { ...value[store.id], phone: event.target.value || null },
                      }))
                    }
                    placeholder="例如：400-000-0000"
                  />
                </label>
                <label>
                  门店图片 HTTPS 地址
                  <input
                    value={commercial[store.id]?.imageUrl ?? ''}
                    onChange={(event) =>
                      setCommercial((value) => ({
                        ...value,
                        [store.id]: { ...value[store.id], imageUrl: event.target.value || null },
                      }))
                    }
                    placeholder="https://…"
                  />
                </label>
                <label>
                  纬度
                  <input
                    type="number"
                    value={commercial[store.id]?.latitude ?? ''}
                    onChange={(event) =>
                      setCommercial((value) => ({
                        ...value,
                        [store.id]: {
                          ...value[store.id],
                          latitude: event.target.value === '' ? null : Number(event.target.value),
                        },
                      }))
                    }
                  />
                </label>
                <label>
                  经度
                  <input
                    type="number"
                    value={commercial[store.id]?.longitude ?? ''}
                    onChange={(event) =>
                      setCommercial((value) => ({
                        ...value,
                        [store.id]: {
                          ...value[store.id],
                          longitude: event.target.value === '' ? null : Number(event.target.value),
                        },
                      }))
                    }
                  />
                </label>
              </div>
              <Button
                disabled={busy === `commercial-${store.id}`}
                onClick={() => void saveCommercial(store)}
              >
                保存门店资料
              </Button>
            </section>
            <section className={styles.commercial}>
              <h3>团购与第三方平台入口</h3>
              <p className={styles.help}>
                仅允许 HTTPS 地址。关闭入口后，消费者刷新门店页即不再看到该卡片。
              </p>
              {store.externalLinks.map((link) => (
                <LinkEditor
                  key={link.id}
                  value={{
                    title: link.title,
                    description: link.description ?? '',
                    targetUrl: link.targetUrl,
                    platformType: link.platformType,
                    enabled: link.enabled,
                    sortOrder: link.sortOrder,
                  }}
                  label={`编辑：${link.title}`}
                  busy={busy === `link-${link.id}`}
                  onSave={(draft) => {
                    setDrafts((value) => ({ ...value, [store.id]: draft }));
                    void saveLink(store, { ...link, ...draft });
                  }}
                />
              ))}
              <LinkEditor
                value={drafts[store.id] ?? blankLink()}
                label="新增平台入口"
                busy={busy === `link-${store.id}`}
                onSave={(draft) => {
                  setDrafts((value) => ({ ...value, [store.id]: draft }));
                  void saveLink(store);
                }}
              />
            </section>
          </article>
        ))}
      </section>
    </main>
  );
}
function LinkEditor({
  value,
  label,
  busy,
  onSave,
}: {
  value: LinkDraft;
  label: string;
  busy: boolean;
  onSave: (draft: LinkDraft) => void;
}) {
  const [draft, setDraft] = useState(value);
  const update = <K extends keyof LinkDraft>(key: K, value: LinkDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <fieldset className={styles.linkEditor}>
      <legend>{label}</legend>
      <label>
        平台
        <select
          value={draft.platformType}
          onChange={(event) => update('platformType', event.target.value as Link['platformType'])}
        >
          <option value="meituan">美团</option>
          <option value="douyin">抖音</option>
          <option value="external">通用外链</option>
        </select>
      </label>
      <label>
        标题
        <input value={draft.title} onChange={(event) => update('title', event.target.value)} />
      </label>
      <label>
        说明/价格
        <input
          value={draft.description}
          onChange={(event) => update('description', event.target.value)}
        />
      </label>
      <label>
        HTTPS 地址
        <input
          value={draft.targetUrl}
          onChange={(event) => update('targetUrl', event.target.value)}
          placeholder="https://…"
        />
      </label>
      <label>
        排序
        <input
          type="number"
          min="0"
          value={draft.sortOrder}
          onChange={(event) => update('sortOrder', Number(event.target.value))}
        />
      </label>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(event) => update('enabled', event.target.checked)}
        />
        消费者可见
      </label>
      <Button type="button" disabled={busy} onClick={() => onSave(draft)}>
        保存入口
      </Button>
    </fieldset>
  );
}
