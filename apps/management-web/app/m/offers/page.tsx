'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Offer = {
  id: string;
  actionName: string;
  platform: string;
  offerPrice: string;
  marketPrice: string | null;
  currency: string;
  priceSource: string;
  sourceUpdatedAt: string;
  status: string;
  version: number;
};
type Service = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_label: string | null;
  category: string | null;
  rank: number;
  status: string;
  version: number;
  offers: Offer[];
};
type Store = {
  id: string;
  name: string;
  status: string;
  services: Service[];
  externalLinks: { actionId: string; name: string; platform: string }[];
};
type CategoryGroup = {
  category: string;
  unassigned: boolean;
  storeCount: number;
  serviceCount: number;
  services: {
    id: string;
    storeId: string;
    storeName: string;
    name: string;
    category: string | null;
    status: string;
    offerCount: number;
  }[];
};
type JumpRankItem = {
  serviceId: string;
  serviceName: string;
  storeId: string;
  jumps: number;
  jumpConfirms: number;
  distinctModules: number;
  sharePct: number;
};
type ModuleClickRankItem = {
  serviceId: string;
  serviceName: string;
  storeId: string;
  impressions: number;
  jumps: number;
  jumpConfirms: number;
  stationClicks: number;
  total: number;
  sharePct: number;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const initialService = {
  code: '',
  name: '',
  description: '',
  priceLabel: '',
  rank: 100,
  category: '',
};
const platformCopy: Record<string, string> = {
  meituan: '美团',
  douyin: '抖音',
  saabei: '扫呗',
  external: '直接外链',
};
const priceBand = (value: number) => (value < 100 ? '¥0-100' : value <= 300 ? '¥100-300' : '¥300+');
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

export default function OffersPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [stores, setStores] = useState<Store[]>([]),
    [categories, setCategories] = useState<CategoryGroup[]>([]),
    [jumpRank, setJumpRank] = useState<JumpRankItem[]>([]),
    [moduleClickRank, setModuleClickRank] = useState<ModuleClickRankItem[]>([]),
    [reorderStore, setReorderStore] = useState(''),
    [rankDrafts, setRankDrafts] = useState<Record<string, number>>({}),
    [selectedStore, setSelectedStore] = useState(''),
    [service, setService] = useState(initialService),
    [offerDrafts, setOfferDrafts] = useState<Record<string, Record<string, string>>>({}),
    [batchSelection, setBatchSelection] = useState<Record<string, boolean>>({}),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const [catalogResponse, categoryResponse, rankResponse, clickRankResponse] =
        await Promise.all([
          sessionApi.request(`${api}/api/v1/management/catalog`),
          sessionApi.request(`${api}/api/v1/management/catalog/categories`),
          sessionApi.request(`${api}/api/v1/management/catalog/jump-rank?days=30`),
          sessionApi.request(`${api}/api/v1/management/catalog/module-click-rank?days=30`),
        ]);
      if ([401, 403].includes(catalogResponse.status)) return setState('forbidden');
      if (!catalogResponse.ok) throw Error();
      const data = (await catalogResponse.json()).data as Store[];
      setStores(data);
      setSelectedStore((current) => current || data[0]?.id || '');
      setReorderStore((current) => current || data[0]?.id || '');
      if (categoryResponse.ok)
        setCategories(
          ((await categoryResponse.json()).data as { categories?: CategoryGroup[] }).categories ??
            [],
        );
      if (rankResponse.ok)
        setJumpRank(((await rankResponse.json()).data as { items?: JumpRankItem[] }).items ?? []);
      if (clickRankResponse.ok)
        setModuleClickRank(
          ((await clickRankResponse.json()).data as { items?: ModuleClickRankItem[] }).items ?? [],
        );
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const request = (path: string, method: 'POST' | 'PUT', body: unknown, idempotent = false) =>
    sessionApi.request(`${api}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(idempotent ? { 'idempotency-key': crypto.randomUUID() } : {}),
      },
      body: JSON.stringify(body),
    });
  const createService = async () => {
    if (!selectedStore) return;
    setSaving(true);
    try {
      const response = await request(
        `/api/v1/management/catalog/stores/${selectedStore}/services`,
        'POST',
        service,
        true,
      );
      if (!response.ok) throw Error();
      setService(initialService);
      setNote('服务/套餐已创建，Consumer 目录刷新后可见。');
      await load();
    } catch {
      setNote('服务/套餐未保存，请检查编码、名称与价格说明。');
    } finally {
      setSaving(false);
    }
  };
  const saveOffer = async (store: Store, item: Service) => {
    const draft = offerDrafts[item.id] ?? {};
    setSaving(true);
    try {
      const response = await request(
        `/api/v1/management/catalog/services/${item.id}/offers`,
        'POST',
        {
          externalActionId: draft.externalActionId,
          offerPrice: draft.offerPrice,
          marketPrice: draft.marketPrice || null,
          priceSource: draft.priceSource || '商户后台登记',
          sourceUpdatedAt: new Date().toISOString(),
          sortOrder: 0,
        },
        true,
      );
      if (!response.ok) throw Error();
      setNote('Offer 已关联到受控 HTTPS 入口；Consumer 会显示来源与更新时间。');
      await load();
    } catch {
      setNote('Offer 未保存：请选择当前门店启用的 HTTPS 外链，并检查价格关系。');
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (offer: Offer) => {
    setSaving(true);
    try {
      const response = await request(`/api/v1/management/catalog/offers/${offer.id}`, 'PUT', {
        offerPrice: offer.offerPrice,
        marketPrice: offer.marketPrice,
        priceSource: offer.priceSource,
        sourceUpdatedAt: new Date().toISOString(),
        sortOrder: 0,
        status: offer.status === 'active' ? 'inactive' : 'active',
        version: offer.version,
      });
      if (!response.ok) throw Error();
      setNote(
        offer.status === 'active'
          ? 'Offer 已停用，Consumer 不再展示或跳转。'
          : 'Offer 已重新启用。',
      );
      await load();
    } catch {
      setNote('Offer 状态未更新，请刷新后重试。');
    } finally {
      setSaving(false);
    }
  };
  const batchToggle = async (store: Store, status: 'active' | 'inactive') => {
    const serviceIds = store.services
      .filter((item) => batchSelection[item.id])
      .map((item) => item.id);
    if (!serviceIds.length) return setNote('请先勾选要上下架的套餐。');
    setSaving(true);
    try {
      const response = await request(
        `/api/v1/management/catalog/stores/${store.id}/services/batch-status`,
        'POST',
        { storeId: store.id, serviceIds, status },
        true,
      );
      if (!response.ok) throw Error();
      const data = (await response.json()).data as { effected?: number };
      setNote(
        status === 'active'
          ? `已批量上架 ${data.effected ?? serviceIds.length} 个套餐。`
          : `已批量下架 ${data.effected ?? serviceIds.length} 个套餐。`,
      );
      setBatchSelection({});
      await load();
    } catch {
      setNote('批量操作未生效，请刷新后重试。');
    } finally {
      setSaving(false);
    }
  };
  const reorder = async () => {
    const reorderStoreData = stores.find((store) => store.id === reorderStore);
    if (!reorderStoreData) return setNote('请先选择要排序的门店。');
    const services = reorderStoreData.services;
    if (!services.length) return setNote('该门店暂无套餐可排序。');
    const ordered = [...services].sort(
      (a, b) => (rankDrafts[b.id] ?? b.rank ?? 0) - (rankDrafts[a.id] ?? a.rank ?? 0),
    );
    setSaving(true);
    try {
      const response = await request(
        `/api/v1/management/catalog/stores/${reorderStoreData.id}/services/reorder`,
        'POST',
        { orderedIds: ordered.map((item) => item.id) },
        true,
      );
      if (!response.ok) throw Error();
      const data = (await response.json()).data as { effected?: number };
      setNote(
        `已按当前排序更新 ${data.effected ?? ordered.length} 个套餐的展示顺序，目录刷新后生效。`,
      );
      setRankDrafts({});
      await load();
    } catch {
      setNote('排序未保存，请检查后重试。');
    } finally {
      setSaving(false);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载商品/套餐入口" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权访问商品/套餐入口" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="套餐数据暂不可用"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  const currentStore = stores.find((store) => store.id === selectedStore);
  const allServices = stores.flatMap((store) => store.services);
  const allOffers = allServices.flatMap((item) => item.offers);
  const serviceStatusCounts = new Map<string, number>();
  for (const item of allServices) {
    const key = item.status === 'active' ? 'Consumer 可见' : '已停用';
    serviceStatusCounts.set(key, (serviceStatusCounts.get(key) ?? 0) + 1);
  }
  const byServiceStatus = [...serviceStatusCounts.entries()].map(([key, value]) => ({
    key,
    value,
  }));
  const platformCounts = new Map<string, number>();
  for (const offer of allOffers) {
    const key = platformCopy[offer.platform] ?? offer.platform;
    platformCounts.set(key, (platformCounts.get(key) ?? 0) + 1);
  }
  const byPlatform = [...platformCounts.entries()].map(([key, value]) => ({ key, value }));
  const offerStatusCounts = new Map<string, number>();
  for (const offer of allOffers) {
    const key = offer.status === 'active' ? '展示中' : '已停用';
    offerStatusCounts.set(key, (offerStatusCounts.get(key) ?? 0) + 1);
  }
  const byOfferStatus = [...offerStatusCounts.entries()].map(([key, value]) => ({ key, value }));
  const bandCounts = new Map<string, number>();
  for (const offer of allOffers) {
    const band = priceBand(Number(offer.offerPrice));
    bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
  }
  const byBand = [...bandCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, value }));
  return (
    <main className={styles.page} data-testid="management-offers">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 商品/套餐入口</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="商品套餐概览">
        <h1>商品/套餐入口</h1>
        <p>
          维护服务/套餐真源与受控平台价格入口，供统一入口展示与比价；价格由商户登记，不宣称第三方实时同步，也不在此售卖下单。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="商品套餐数据概况">
        <div>
          <span>门店</span>
          <strong>{stores.length}</strong>
        </div>
        <div>
          <span>套餐/服务</span>
          <strong>{allServices.length}</strong>
        </div>
        <div>
          <span>平台 Offer</span>
          <strong>{allOffers.length}</strong>
        </div>
        <div>
          <span>展示中</span>
          <strong>{allOffers.filter((offer) => offer.status === 'active').length}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="商品套餐分布">
        <div className={styles.panelBlock}>
          <h2>套餐可见分布</h2>
          <ul className={styles.bars}>
            {byServiceStatus.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${allServices.length ? (b.value / allServices.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!allServices.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>门店分布</h2>
          <ul className={styles.bars}>
            {stores.map((b) => (
              <li key={b.id} className={styles.barRow}>
                <span className={styles.barLabel}>{b.name}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${allServices.length ? (b.services.length / allServices.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.services.length}</span>
              </li>
            ))}
            {!allServices.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>平台入口分布</h2>
          <ul className={styles.bars}>
            {byPlatform.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${allOffers.length ? (b.value / allOffers.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!allOffers.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>Offer 状态分布</h2>
          <ul className={styles.bars}>
            {byOfferStatus.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${allOffers.length ? (b.value / allOffers.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!allOffers.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>价格带分布</h2>
          <ul className={styles.bars}>
            {byBand.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${allOffers.length ? (b.value / allOffers.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!allOffers.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由商户登记的既有套餐/Offer
        档案行实时推导（source=local）：不接美团/抖音实时价格、不伪造第三方评分或成交、不包含本平台收款、非本平台下单。
      </p>

      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}

      <section className={styles.panel} aria-label="跳转排行">
        <div className={styles.sectionTitle}>
          <h2>套餐跳转排行</h2>
          <p>
            按真实入口跳转痕迹（jump / jump_confirm）聚合到套餐，仅统计出站跳转，不代表第三方成交。
          </p>
        </div>
        {jumpRank.length ? (
          <ul className={styles.bars}>
            {jumpRank.map((item) => (
              <li key={item.serviceId} className={styles.barRow}>
                <span className={styles.barLabel}>{item.serviceName}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(jumpRank[0]?.jumps ?? 0, item.jumps) }}
                  />
                </span>
                <span className={styles.barValue}>{item.jumps}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.barEmpty}>近 30 日暂无跳转痕迹。</p>
        )}
        <p className={styles.honest} role="note">
          排行仅聚合入口痕迹中的出站跳转（event_code = jump /
          jump_confirm，source=local）；不接美团/抖音实时，也不代表第三方成交或支付。
        </p>
      </section>

      <section className={styles.panel} aria-label="模块点击排行">
        <div className={styles.sectionTitle}>
          <h2>套餐模块点击排行</h2>
          <p>
            按入口痕迹中的点击族信号聚合到套餐（出站跳转 jump / jump_confirm + 站内咨询/收藏
            click），曝光仅作独立参考不计为点击。
          </p>
        </div>
        {moduleClickRank.length ? (
          <ul className={styles.bars}>
            {moduleClickRank.map((item) => (
              <li key={item.serviceId} className={styles.barRow}>
                <span className={styles.barLabel}>{item.serviceName}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(moduleClickRank[0]?.total ?? 0, item.total) }}
                  />
                </span>
                <span className={styles.barValue}>{item.total}</span>
                <span className={styles.clickMeta}>
                  跳转 {item.jumps} · 确认 {item.jumpConfirms} · 站内 {item.stationClicks} · 曝光{' '}
                  {item.impressions}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.barEmpty}>近 30 日暂无点击族痕迹。</p>
        )}
        <p className={styles.honest} role="note">
          仅聚合点击族痕迹（jump / jump_confirm / consult_click /
          favorite_click，source=local）；曝光 module_impression
          独立展示不计为点击；不接美团/抖音实时，也不代表第三方成交或支付。
        </p>
      </section>

      <section className={styles.panel} aria-label="商品分类树">
        <div className={styles.sectionTitle}>
          <h2>商品分类树</h2>
          <p>按分类组织套餐入口，便于按类目批量上下架与管理展示。</p>
        </div>
        {categories.length ? (
          <div className={styles.categoryList}>
            {categories.map((group) => (
              <div key={group.category} className={styles.categoryNode}>
                <h3>{group.category}</h3>
                <span className={styles.categoryMeta}>
                  {group.serviceCount} 个套餐 · 覆盖 {group.storeCount} 个门店
                </span>
                <div className={styles.categoryServices}>
                  {group.services.map((item) => (
                    <span className={styles.categoryService} key={item.id}>
                      <span>{item.name}</span>
                      <span>
                        {item.offerCount} 平台入口 ·{' '}
                        {item.status === 'active' ? 'Consumer 可见' : '已停用'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.barEmpty}>暂无分类；创建套餐时可填分类，将在此按类目归档。</p>
        )}
      </section>
      <section className={styles.panel} aria-label="新建商品套餐">
        <h2>新建商品/套餐</h2>
        <div className={styles.create}>
          <label>
            门店
            <select
              aria-label="套餐所属门店"
              value={selectedStore}
              onChange={(event) => setSelectedStore(event.target.value)}
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            内部编码
            <input
              aria-label="套餐编码"
              value={service.code}
              onChange={(event) => setService({ ...service, code: event.target.value })}
            />
          </label>
          <label>
            套餐名称
            <input
              aria-label="套餐名称"
              value={service.name}
              onChange={(event) => setService({ ...service, name: event.target.value })}
            />
          </label>
          <label>
            价格说明
            <input
              aria-label="价格说明"
              value={service.priceLabel}
              onChange={(event) => setService({ ...service, priceLabel: event.target.value })}
              placeholder="例如：价格请咨询门店"
            />
          </label>
          <label>
            分类
            <input
              aria-label="套餐分类"
              value={service.category}
              onChange={(event) => setService({ ...service, category: event.target.value })}
              placeholder="例如：团购套餐 / 到店服务"
            />
          </label>
          <label className={styles.wide}>
            套餐说明
            <input
              aria-label="套餐说明"
              value={service.description}
              onChange={(event) => setService({ ...service, description: event.target.value })}
            />
          </label>
          <Button loading={saving} onClick={() => void createService()}>
            创建套餐
          </Button>
        </div>
      </section>
      <section className={styles.panel} aria-label="批量上下架">
        <div className={styles.sectionTitle}>
          <h2>批量上下架</h2>
          <p>在当前门店内勾选多个套餐，一次性置为上架或下架（Consumer 可见性）。</p>
        </div>
        <div className={styles.batchToolbar}>
          <select
            className={styles.batchSelect}
            value={selectedStore}
            onChange={(event) => setSelectedStore(event.target.value)}
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <Button
            loading={saving}
            onClick={() => currentStore && void batchToggle(currentStore, 'active')}
          >
            批量上架
          </Button>
          <Button
            tone="quiet"
            loading={saving}
            onClick={() => currentStore && void batchToggle(currentStore, 'inactive')}
          >
            批量下架
          </Button>
        </div>
      </section>
      <section className={styles.panel} aria-label="套餐排序">
        <div className={styles.sectionTitle}>
          <h2>套餐排序</h2>
          <p>为当前门店的套餐设定展示顺序（rank 高者优先），一次保存统一生效（≤200 个）。</p>
        </div>
        <div className={styles.reorderToolbar}>
          <select
            className={styles.batchSelect}
            value={reorderStore}
            onChange={(event) => setReorderStore(event.target.value)}
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <Button loading={saving} onClick={() => void reorder()}>
            保存顺序
          </Button>
        </div>
        {(() => {
          const target = stores.find((store) => store.id === reorderStore);
          const services = target?.services ?? [];
          const ordered = [...services].sort(
            (a, b) => (rankDrafts[b.id] ?? b.rank ?? 0) - (rankDrafts[a.id] ?? a.rank ?? 0),
          );
          return ordered.length ? (
            <ul className={styles.reorderList} data-testid="reorder-list">
              {ordered.map((item, index) => (
                <li key={item.id} className={styles.reorderRow}>
                  <input
                    aria-label={`${item.name} 排序值`}
                    inputMode="numeric"
                    value={String(rankDrafts[item.id] ?? item.rank ?? ordered.length - index)}
                    onChange={(event) => {
                      const numeric = Number(event.target.value);
                      setRankDrafts({
                        ...rankDrafts,
                        [item.id]: Number.isFinite(numeric) ? numeric : 0,
                      });
                    }}
                  />
                  <span>{item.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.barEmpty}>该门店暂无套餐可排序。</p>
          );
        })()}
      </section>
      <section className={styles.catalog}>
        {currentStore?.services.map((item) => {
          const draft = offerDrafts[item.id] ?? {};
          return (
            <article key={item.id} className={styles.service}>
              <header>
                <div className={styles.treeRow}>
                  <input
                    type="checkbox"
                    aria-label={`选择 ${item.name}`}
                    checked={Boolean(batchSelection[item.id])}
                    onChange={(event) =>
                      setBatchSelection((value) => ({
                        ...value,
                        [item.id]: event.target.checked,
                      }))
                    }
                  />
                  <div>
                    <h2>{item.name}</h2>
                    <p>
                      {item.description ?? '暂无说明'} · {item.price_label ?? '价格请咨询门店'}
                      {item.category ? ` · 分类 ${item.category}` : ''}
                    </p>
                  </div>
                </div>
                <StatusBadge tone={item.status === 'active' ? 'success' : 'neutral'}>
                  {item.status === 'active' ? 'Consumer 可见' : '已停用'}
                </StatusBadge>
              </header>
              <div className={styles.offerForm}>
                <label>
                  平台入口
                  <select
                    aria-label={`${item.name} 平台入口`}
                    value={draft.externalActionId ?? ''}
                    onChange={(event) =>
                      setOfferDrafts({
                        ...offerDrafts,
                        [item.id]: { ...draft, externalActionId: event.target.value },
                      })
                    }
                  >
                    <option value="">请选择已启用 HTTPS 外链</option>
                    {currentStore.externalLinks.map((link) => (
                      <option key={link.actionId} value={link.actionId}>
                        {link.name} · {link.platform}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Offer 价
                  <input
                    aria-label={`${item.name} Offer 价`}
                    inputMode="decimal"
                    value={draft.offerPrice ?? ''}
                    onChange={(event) =>
                      setOfferDrafts({
                        ...offerDrafts,
                        [item.id]: { ...draft, offerPrice: event.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  参考原价
                  <input
                    aria-label={`${item.name} 参考原价`}
                    inputMode="decimal"
                    value={draft.marketPrice ?? ''}
                    onChange={(event) =>
                      setOfferDrafts({
                        ...offerDrafts,
                        [item.id]: { ...draft, marketPrice: event.target.value },
                      })
                    }
                  />
                </label>
                <Button loading={saving} onClick={() => void saveOffer(currentStore, item)}>
                  新增 Offer
                </Button>
              </div>
              <div className={styles.offers}>
                {item.offers.length ? (
                  item.offers.map((offer) => (
                    <article key={offer.id}>
                      <div>
                        <strong>{offer.actionName}</strong>
                        <span>
                          ¥{Number(offer.offerPrice).toFixed(2)}
                          {offer.marketPrice
                            ? ` / 参考 ¥${Number(offer.marketPrice).toFixed(2)}`
                            : ''}
                        </span>
                        <small>
                          {offer.priceSource} ·{' '}
                          {new Date(offer.sourceUpdatedAt).toLocaleString('zh-CN')}
                        </small>
                      </div>
                      <div>
                        <StatusBadge tone={offer.status === 'active' ? 'success' : 'neutral'}>
                          {offer.status === 'active' ? '展示中' : '已停用'}
                        </StatusBadge>
                        <Button tone="quiet" onClick={() => void toggle(offer)}>
                          {offer.status === 'active' ? '停用' : '启用'}
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <AppStatePanel
                    kind="empty"
                    title="暂无 Offer"
                    description={
                      currentStore.externalLinks.length
                        ? '选择受控平台入口并登记价格。'
                        : '请先在“门店与外链”添加安全 HTTPS 入口。'
                    }
                  />
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
