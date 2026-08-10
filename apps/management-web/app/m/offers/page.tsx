'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';
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

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const initialService = { code: '', name: '', description: '', priceLabel: '', rank: 100 };

export default function OffersPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [stores, setStores] = useState<Store[]>([]),
    [selectedStore, setSelectedStore] = useState(''),
    [service, setService] = useState(initialService),
    [offerDrafts, setOfferDrafts] = useState<Record<string, Record<string, string>>>({}),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/catalog`);
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      const data = (await response.json()).data as Store[];
      setStores(data);
      setSelectedStore((current) => current || data[0]?.id || '');
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
          priceSource: draft.priceSource || '商户经营后台登记',
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
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载商品管理" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权进入商品管理" />
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
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="美团商家端 PC · 商品"
        title="商品管理"
        description="对标美团商家端商品库：维护服务/套餐真源与受控平台价格入口。价格来自商户登记，不宣称第三方实时同步。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新
          </Button>
        }
      />
      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}
      <Card className={styles.create}>
        <h2>新建商品/套餐</h2>
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
      </Card>
      <section className={styles.catalog}>
        {currentStore?.services.map((item) => {
          const draft = offerDrafts[item.id] ?? {};
          return (
            <Card key={item.id} className={styles.service}>
              <header>
                <div>
                  <h2>{item.name}</h2>
                  <p>
                    {item.description ?? '暂无说明'} · {item.price_label ?? '价格请咨询门店'}
                  </p>
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
            </Card>
          );
        })}
      </section>
    </main>
  );
}
