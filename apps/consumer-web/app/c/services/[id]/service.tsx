'use client';

import { useMemo, useState } from 'react';
import styles from './service.module.css';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

type PlatformOffer = {
  id: string;
  offerId: string;
  title: string;
  platformType: 'meituan' | 'douyin' | 'external';
  offerPrice: number;
  marketPrice: number | null;
  targetUrl: string | null;
};

type Action = {
  id: string;
  name: string;
  targetUrl: string | null;
  actionType: string;
  platform: string;
};

export type ServiceDetail = {
  tenant: { slug: string; name: string };
  service: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number | null;
    priceLabel: string | null;
  };
  store: {
    id: string;
    name: string;
    address: string | null;
    merchant: string;
    phone: string | null;
    businessHours: string | null;
    imageUrl: string | null;
  };
  benefits: { id: string; title: string; description: string | null }[];
  content: { id: string; content_type: string; title: string; summary: string | null }[];
  actions: Action[];
  platformOffers: PlatformOffer[];
};

const money = (value: number) => `¥${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
const platformLabel = (type: PlatformOffer['platformType']) =>
  type === 'meituan' ? '美团团购' : type === 'douyin' ? '抖音团购' : '其他平台';

export function ServiceState({ kind }: { kind: 'error' | 'forbidden' }) {
  const forbidden = kind === 'forbidden';
  return (
    <main className={styles.message}>
      <section className={styles.messageCard}>
        <h1>{forbidden ? '商品暂不可访问' : '商品内容加载失败'}</h1>
        <p>{forbidden ? '请返回门店详情选择其他商品。' : '网络连接不稳定，请稍后重新加载。'}</p>
      </section>
    </main>
  );
}

export default function ServicePage({
  data,
  source,
}: {
  data: ServiceDetail;
  source: string | null;
}) {
  const [notice, setNotice] = useState('');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const lowestOfferId = useMemo(
    () =>
      data.platformOffers.reduce<string | null>(
        (current, offer) =>
          current === null ||
          offer.offerPrice <
            (data.platformOffers.find((item) => item.id === current)?.offerPrice ?? Infinity)
            ? offer.id
            : current,
        null,
      ),
    [data.platformOffers],
  );
  const fallbackAction =
    data.actions.find((action) => action.actionType !== 'platform_entry') ?? data.actions[0];
  const primaryAction = data.platformOffers[0] ?? fallbackAction;

  const open = async (action: PlatformOffer | Action) => {
    const actionName = 'title' in action ? action.title : action.name;
    setPendingActionId(action.id);
    try {
      const response = await fetch(
        `${apiBase}/api/v1/consumer/services/${data.service.id}/actions/${action.id}/open?tenant=${encodeURIComponent(data.tenant.slug)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ source: source ?? 'consumer:service-detail' }),
        },
      );
      if (!response.ok) throw new Error('SERVICE_ACTION');
      if (action.targetUrl) {
        window.location.assign(action.targetUrl);
        return;
      }
      setNotice(`已记录你前往${actionName}的意向，门店顾问会在经营工作台中跟进。`);
    } catch {
      setNotice('暂时无法记录你的意向，请稍后再试。');
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            {data.store.merchant} · {data.store.name}
          </p>
          <p className={styles.testOnly}>TEST ONLY 商品演示</p>
        </header>

        <section className={styles.productCard} aria-label="商品信息">
          {data.store.imageUrl ? (
            <img className={styles.productImage} src={data.store.imageUrl} alt="" />
          ) : (
            <div className={styles.productImageFallback}>套餐</div>
          )}
          <div className={styles.productMain}>
            <h1>{data.service.name}</h1>
            <p>{data.service.description ?? '商品安排以门店实际说明为准。'}</p>
            <div className={styles.priceLine}>
              <strong>{data.service.priceLabel ?? '到店询价'}</strong>
              <span>门店套餐价</span>
            </div>
            <div className={styles.tags}>
              <span>到店自取</span>
              {data.service.durationMinutes && (
                <span>预计 {data.service.durationMinutes} 分钟</span>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="platform-title">
          <div className={styles.sectionTitle}>
            <div>
              <p>价格对比</p>
              <h2 id="platform-title">全平台团购价格</h2>
            </div>
            <span>价格以平台页为准</span>
          </div>
          {data.platformOffers.length ? (
            <div className={styles.offerList}>
              {data.platformOffers.map((offer) => (
                <article className={styles.offer} key={offer.offerId}>
                  <div className={styles.offerMeta}>
                    <span className={styles.platformMark}>{platformLabel(offer.platformType)}</span>
                    {offer.id === lowestOfferId && <b>当前低价</b>}
                    {offer.title !== platformLabel(offer.platformType) && (
                      <small>{offer.title}</small>
                    )}
                  </div>
                  <div className={styles.offerAction}>
                    <div>
                      <strong>{money(offer.offerPrice)}</strong>
                      {offer.marketPrice !== null && <del>{money(offer.marketPrice)}</del>}
                    </div>
                    <button
                      type="button"
                      onClick={() => open(offer)}
                      disabled={pendingActionId !== null}
                    >
                      {pendingActionId === offer.id ? '正在前往…' : '去购买'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>当前商品暂未配置平台团购价，可向门店咨询。</div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="detail-title">
          <div className={styles.sectionTitle}>
            <div>
              <p>套餐资料</p>
              <h2 id="detail-title">商品详情</h2>
            </div>
          </div>
          <article className={styles.card}>
            <h3>套餐内容</h3>
            <p>{data.service.description ?? '商品内容以门店确认信息为准。'}</p>
          </article>
          {data.content.map((item) => (
            <article className={styles.card} key={item.id}>
              <h3>{item.title}</h3>
              <p>{item.summary ?? '门店已发布该资料，具体以门店现场说明为准。'}</p>
            </article>
          ))}
        </section>

        <section className={styles.section} aria-labelledby="rules-title">
          <div className={styles.sectionTitle}>
            <div>
              <p>下单前请阅读</p>
              <h2 id="rules-title">购买须知</h2>
            </div>
          </div>
          <article className={styles.card}>
            <h3>适用门店</h3>
            <p>
              {data.store.name}
              {data.store.address ? ` · ${data.store.address}` : ''}
              {data.store.businessHours ? ` · 营业时间 ${data.store.businessHours}` : ''}
            </p>
          </article>
          <article className={styles.card}>
            <h3>使用说明</h3>
            <p>
              下单后请以第三方平台订单、库存和门店现场规则为准。本页仅用于 TEST ONLY 商用流程演示。
            </p>
          </article>
        </section>

        <section className={styles.section} aria-labelledby="benefits-title">
          <div className={styles.sectionTitle}>
            <div>
              <p>门店福利</p>
              <h2 id="benefits-title">服务权益</h2>
            </div>
          </div>
          {data.benefits.length ? (
            data.benefits.map((benefit) => (
              <article className={styles.card} key={benefit.id}>
                <h3>{benefit.title}</h3>
                <p>{benefit.description ?? '以门店实际说明为准。'}</p>
              </article>
            ))
          ) : (
            <div className={styles.empty}>当前商品暂无额外服务权益。</div>
          )}
        </section>

        <div className={styles.bar}>
          {primaryAction ? (
            <button
              className={styles.primaryButton}
              type="button"
              disabled={pendingActionId !== null}
              onClick={() => open(primaryAction)}
            >
              {pendingActionId === primaryAction.id
                ? '正在前往…'
                : data.platformOffers.length
                  ? `去${platformLabel(data.platformOffers[0]!.platformType)}购买`
                  : 'title' in primaryAction
                    ? primaryAction.title
                    : primaryAction.name}
            </button>
          ) : (
            <div className={styles.empty}>商品入口暂未开放。</div>
          )}
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
