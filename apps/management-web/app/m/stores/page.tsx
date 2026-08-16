'use client';

import QRCode from 'qrcode';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
type ContactQr = {
  contactType: 'merchant' | 'store' | 'employee';
  label: string;
  token: string;
  targetPath: string;
  groupBy: string;
  scanCount: number;
};
type StoreDraft = {
  code: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
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
type Bucket = { label: string; value: number };
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};
const entryBuckets = (count: number) => {
  if (!count) return '无启用入口 0';
  if (count === 1) return '单一入口 1';
  return '多入口 2+';
};
const servicesBuckets = (count: number) => {
  if (!count) return '无可用服务 0';
  if (count <= 3) return '基础服务 1-3';
  return '丰富服务 4+';
};
const opensBuckets = (count: number) => {
  if (!count) return '近30日无打开 0';
  if (count <= 10) return '低活跃 1-10';
  return '活跃 11+';
};
const tasksBuckets = (count: number) => {
  if (!count) return '无待跟进 0';
  if (count <= 2) return '轻负载 1-2';
  return '重负载 3+';
};
const blankLink = (): LinkDraft => ({
  title: '',
  description: '',
  targetUrl: '',
  platformType: 'external',
  enabled: true,
  sortOrder: 0,
});
const blankStore = (): StoreDraft => ({ code: '', name: '', address: '', status: 'active' });
const contactMeta: Record<ContactQr['contactType'], { title: string; hint: string }> = {
  merchant: { title: '商户码', hint: '把顾客引到商户统一入口，按商户归因' },
  store: { title: '门店码', hint: '扫码直达本门店消费者页' },
  employee: { title: '员工码', hint: '把顾客引到员工触点，按员工/门店归因' },
};
const consumerOrigin =
  process.env.NEXT_PUBLIC_CONSUMER_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:3001';
const scanUrl = (targetPath: string) => `${consumerOrigin}${targetPath}`;

export default function StoresPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [commercial, setCommercial] = useState<Record<string, Partial<Commercial>>>({});
  const [drafts, setDrafts] = useState<Record<string, LinkDraft>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [newStore, setNewStore] = useState<StoreDraft>(blankStore);
  const [editStore, setEditStore] = useState<Record<string, Partial<StoreDraft>>>({});
  const [qr, setQr] = useState<
    Record<string, Record<ContactQr['contactType'], string> | undefined>
  >({});
  const [qrContacts, setQrContacts] = useState<
    Record<string, Record<ContactQr['contactType'], ContactQr> | undefined>
  >({});
  const [qrLoading, setQrLoading] = useState<Record<string, boolean>>({});
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<'active' | 'inactive'>('active');
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
  const statusDist = useMemo(
    () => countBy(stores.map((store) => (store.status === 'active' ? '营业中' : '已停用'))),
    [stores],
  );
  const ownerDist = useMemo(
    () => countBy(stores.map((store) => (store.managers.length ? '已指派负责人' : '未指派负责人'))),
    [stores],
  );
  const entryDist = useMemo(
    () => countBy(stores.map((store) => entryBuckets(store.entryCount))),
    [stores],
  );
  const servicesDist = useMemo(
    () => countBy(stores.map((store) => servicesBuckets(store.activeServices))),
    [stores],
  );
  const opensDist = useMemo(
    () => countBy(stores.map((store) => opensBuckets(store.entryOpens30d))),
    [stores],
  );
  const tasksDist = useMemo(
    () => countBy(stores.map((store) => tasksBuckets(store.openTasks))),
    [stores],
  );
  const request = (
    url: string,
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body?: unknown,
    idempotencyKey?: string,
  ) =>
    sessionApi.request(url, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: {
              'content-type': 'application/json',
              ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
            },
            body: JSON.stringify(body),
          }),
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
  const createStore = async () => {
    setBusy('create-store');
    setNote('');
    try {
      const response = await request(`${api}/api/v1/management/stores/depth`, 'POST', {
        code: newStore.code,
        name: newStore.name,
        address: newStore.address || undefined,
      });
      if (!response.ok) throw new Error('CREATE_STORE');
      setNote(`门店「${newStore.name}」已创建。`);
      setNewStore(blankStore());
      await load();
    } catch {
      setNote('门店未创建。门店编号需唯一，请检查编号与店名后重试。');
    } finally {
      setBusy(null);
    }
  };
  const applyBatchStatus = async () => {
    if (!selectedStores.size) return setNote('请先勾选要批量营业状态的门店。');
    setBusy('batch-status');
    setNote('');
    try {
      const storeIds = [...selectedStores];
      const target = batchStatus === 'active' ? '营业中' : '已停用';
      if (
        batchStatus === 'inactive' &&
        !window.confirm(
          `确认将选中的 ${storeIds.length} 家门店批量置为「已停用」？该操作可审计且可再次批量恢复。`,
        )
      )
        return setTimeout(() => setBusy(null), 0);
      const response = await request(
        `${api}/api/v1/management/stores/depth/batch-status`,
        'POST',
        { storeIds, status: batchStatus },
        `batch-status-${storeIds.sort().join(',')}-${batchStatus}`,
      );
      if (!response.ok) throw new Error('BATCH_STATUS');
      setSelectedStores(new Set());
      setNote(`已将选中的 ${storeIds.length} 家门店批量置为「${target}」。`);
      await load();
    } catch {
      setNote('批量营业状态未生效，请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };
  const saveStore = async (store: Store) => {
    const draft = editStore[store.id] ?? {};
    if (draft.name === undefined && draft.address === undefined && draft.status === undefined)
      return setNote('请先修改门店名称、地址或营业状态。');
    setBusy(`edit-${store.id}`);
    setNote('');
    try {
      const response = await request(`${api}/api/v1/management/stores/depth/${store.id}`, 'PUT', {
        name: draft.name ?? store.name,
        address: draft.address ?? store.address ?? '',
        status: draft.status ?? store.status,
        version: store.version,
      });
      if (!response.ok) throw new Error('SAVE_STORE');
      setNote(`门店「${store.name}」已更新。`);
      setEditStore((value) => ({ ...value, [store.id]: {} }));
      await load();
    } catch {
      setNote('门店未更新，可能已被其他操作修改，请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };
  const removeStore = async (store: Store) => {
    if (!window.confirm(`确认停用并移除门店「${store.name}」？该操作可审计且不可在本页恢复。`))
      return;
    setBusy(`delete-${store.id}`);
    setNote('');
    try {
      const response = await request(
        `${api}/api/v1/management/stores/depth/${store.id}`,
        'DELETE',
        undefined,
      );
      if (!response.ok) throw new Error('DELETE_STORE');
      setNote(`门店「${store.name}」已停用并移除。`);
      await load();
    } catch {
      setNote('门店未移除，请刷新后重试。');
    } finally {
      setBusy(null);
    }
  };
  const loadQr = async (store: Store) => {
    setQrLoading((value) => ({ ...value, [store.id]: true }));
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/stores/depth/${store.id}/qr-codes`,
      );
      if (!response.ok) throw new Error('QR');
      const data = (await response.json()).data as { contacts: ContactQr[] };
      const next: Record<ContactQr['contactType'], string> = {
        merchant: '',
        store: '',
        employee: '',
      };
      const nextContacts: Record<ContactQr['contactType'], ContactQr> = {
        merchant: data.contacts.find((c) => c.contactType === 'merchant')!,
        store: data.contacts.find((c) => c.contactType === 'store')!,
        employee: data.contacts.find((c) => c.contactType === 'employee')!,
      };
      await Promise.all(
        data.contacts.map(async (contact) => {
          next[contact.contactType] = await QRCode.toDataURL(scanUrl(contact.targetPath), {
            margin: 1,
            width: 320,
            errorCorrectionLevel: 'M',
          });
        }),
      );
      setQr((value) => ({ ...value, [store.id]: next }));
      setQrContacts((value) => ({ ...value, [store.id]: nextContacts }));
    } catch {
      setNote('二维码加载失败，请稍后重试。');
    } finally {
      setQrLoading((value) => ({ ...value, [store.id]: false }));
    }
  };
  const qrOpen = (storeId: string) => Boolean(qr[storeId]);
  const toggleQr = async (store: Store) => {
    if (qrOpen(store.id)) {
      setQr((value) => ({ ...value, [store.id]: undefined }));
      setQrContacts((value) => ({ ...value, [store.id]: undefined }));
      return;
    }
    await loadQr(store);
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载门店入口"
          description="正在连接门店、员工与外链配置。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权访问门店入口"
          description="请使用具备推广员工具权限的账号登录。"
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
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 门店入口</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="门店入口概览">
        <h1>门店入口</h1>
        <p>
          维护门店营业状态、资料、统一入口与负责人；第三方入口仅记录跳转，不代替平台下单/支付，也不含第三方订单履约。
        </p>
      </section>

      <section className={styles.panel} aria-label="门店概况">
        <div className={styles.summaryStrip}>
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
        </div>
      </section>

      <section className={styles.panel} aria-label="门店入口分布">
        <div className={styles.panelHead}>
          <h2>门店入口分布</h2>
          <span className={styles.panelMeta}>由真实门店档案行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>营业状态分布</h3>
            <BarList items={statusDist} total={stores.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>负责人指派分布</h3>
            <BarList items={ownerDist} total={stores.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>启用平台入口分布</h3>
            <BarList items={entryDist} total={stores.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>服务覆盖分布</h3>
            <BarList items={servicesDist} total={stores.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>近30日入口打开分布</h3>
            <BarList items={opensDist} total={stores.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>待跟进负载分布</h3>
            <BarList items={tasksDist} total={stores.length} />
          </div>
        </div>
        <p className={styles.honest} role="note">
          以上分布全部由已抓取门店档案行现场推导(source=local)：营业状态、负责人指派、启用平台入口、
          可用服务、近 30
          日入口打开与待跟进负载均按真实门店行统计。第三方入口仅记录跳转，不包含本平台收款、
          非本平台下单，不代替平台成交。
        </p>
      </section>

      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <section className={styles.panel} aria-label="新建门店">
        <div className={styles.panelHead}>
          <h2>新建门店</h2>
          <span className={styles.panelMeta}>门店编号需在租户内唯一</span>
        </div>
        <div className={styles.formGrid}>
          <label>
            门店编号
            <input
              value={newStore.code}
              onChange={(event) => setNewStore((value) => ({ ...value, code: event.target.value }))}
              placeholder="例如：SH-002"
            />
          </label>
          <label>
            门店名称
            <input
              value={newStore.name}
              onChange={(event) => setNewStore((value) => ({ ...value, name: event.target.value }))}
              placeholder="例如：陆家嘴旗舰店"
            />
          </label>
          <label className={styles.full}>
            地址
            <input
              value={newStore.address}
              onChange={(event) =>
                setNewStore((value) => ({ ...value, address: event.target.value }))
              }
              placeholder="可选"
            />
          </label>
        </div>
        <Button type="button" disabled={busy === 'create-store'} onClick={() => void createStore()}>
          创建门店
        </Button>
      </section>
      <section className={styles.panel} aria-label="门店营业状态批量">
        <div className={styles.panelHead}>
          <h2>门店营业状态批量</h2>
          <span className={styles.panelMeta}>可审计 · 幂等 · 后续可再批量恢复</span>
        </div>
        <p className={styles.help}>
          勾选多家门店后统一置为 营业中 /
          已停用。仅登记营业状态，不包含本平台收款、非本平台下单、不代替平台成交。
        </p>
        <div className={styles.batchRow}>
          <label className={styles.batchCheck}>
            <input
              type="checkbox"
              checked={selectedStores.size === stores.length && stores.length > 0}
              onChange={(event) =>
                setSelectedStores(
                  event.target.checked ? new Set(stores.map((s) => s.id)) : new Set(),
                )
              }
            />
            全选本轮门店
          </label>
          <label>
            置为
            <select
              value={batchStatus}
              onChange={(event) => setBatchStatus(event.target.value as 'active' | 'inactive')}
            >
              <option value="active">营业中</option>
              <option value="inactive">已停用</option>
            </select>
          </label>
          <Button
            type="button"
            disabled={busy === 'batch-status' || selectedStores.size === 0}
            onClick={() => void applyBatchStatus()}
          >
            批量应用营业状态（已选 {selectedStores.size}）
          </Button>
        </div>
      </section>
      <section className={styles.list}>
        {stores.map((store) => (
          <article className={styles.card} key={store.id}>
            <div className={styles.head}>
              <div>
                <label className={styles.batchCheck} htmlFor={`batch-${store.id}`}>
                  <input
                    id={`batch-${store.id}`}
                    type="checkbox"
                    checked={selectedStores.has(store.id)}
                    onChange={(event) =>
                      setSelectedStores((value) => {
                        const next = new Set(value);
                        if (event.target.checked) next.add(store.id);
                        else next.delete(store.id);
                        return next;
                      })
                    }
                  />
                  批量选择
                </label>
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
            <section className={styles.commercial} aria-label="门店资料维护">
              <h3>门店资料维护</h3>
              <div className={styles.formGrid}>
                <label>
                  门店名称
                  <input
                    value={editStore[store.id]?.name ?? store.name}
                    onChange={(event) =>
                      setEditStore((value) => ({
                        ...value,
                        [store.id]: { ...value[store.id], name: event.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  地址
                  <input
                    value={editStore[store.id]?.address ?? store.address ?? ''}
                    onChange={(event) =>
                      setEditStore((value) => ({
                        ...value,
                        [store.id]: { ...value[store.id], address: event.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  营业状态
                  <select
                    value={editStore[store.id]?.status ?? store.status}
                    onChange={(event) =>
                      setEditStore((value) => ({
                        ...value,
                        [store.id]: {
                          ...value[store.id],
                          status: event.target.value as 'active' | 'inactive',
                        },
                      }))
                    }
                  >
                    <option value="active">营业中</option>
                    <option value="inactive">已停用</option>
                  </select>
                </label>
              </div>
              <div className={styles.lineActions}>
                <Button
                  disabled={busy === `edit-${store.id}`}
                  onClick={() => void saveStore(store)}
                >
                  保存门店资料
                </Button>
                <Button
                  tone="danger"
                  disabled={busy === `delete-${store.id}`}
                  onClick={() => void removeStore(store)}
                >
                  停用并移除
                </Button>
              </div>
            </section>
            <section className={styles.commercial} aria-label="三类触点二维码">
              <h3>三类触点二维码</h3>
              <p className={styles.help}>
                商户码 / 门店码 /
                员工码是扫码分流入口，顾客扫码仅进站/跳转并按触点归因到入口痕迹，不含本平台收款、不建立自营订单。
              </p>
              <Button
                type="button"
                disabled={qrLoading[store.id]}
                onClick={() => void toggleQr(store)}
              >
                {qrOpen(store.id) ? '收起二维码' : '查看触点二维码'}
              </Button>
              {qrOpen(store.id) && (
                <div className={styles.qrGrid}>
                  {(Object.keys(contactMeta) as ContactQr['contactType'][]).map((type) => (
                    <div className={styles.qrCard} key={type}>
                      <h4>{contactMeta[type].title}</h4>
                      <p>{contactMeta[type].hint}</p>
                      {qr[store.id]?.[type] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qr[store.id]![type]}
                          alt={`${contactMeta[type].title}二维码`}
                          width={160}
                          height={160}
                        />
                      ) : (
                        <div className={styles.qrEmpty}>二维码加载中…</div>
                      )}
                      <a
                        className={styles.qrLink}
                        href={scanUrl(qrContacts[store.id]?.[type]?.targetPath ?? '/c/entry')}
                        target="_blank"
                        rel="noreferrer"
                      >
                        打开落点
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>
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
