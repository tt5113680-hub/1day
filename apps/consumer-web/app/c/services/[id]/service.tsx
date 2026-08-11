'use client';

import { useMemo } from 'react';
import { AppStatePanel } from '@oneday/ui';
import { ConsumerShell, storeHref } from '../../consumer-shell';
import styles from './service.module.css';

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
      <AppStatePanel
        kind={kind}
        title={forbidden ? '套餐暂不可访问' : '套餐内容加载失败'}
        description={
          forbidden
            ? '请返回门店菜单选择其他套餐说明。'
            : '网络连接不稳定，请稍后重新加载。本页不提供下单。'
        }
      />
    </main>
  );
}

export default function ServicePage({
  data,
  source,
  shareCode,
}: {
  data: ServiceDetail;
  source: string | null;
  shareCode?: string | null;
}) {
  const context = {
    tenant: data.tenant.slug,
    storeId: data.store.id,
    source: source ?? 'consumer:service-detail',
    scene: 'service_detail',
    shareCode: shareCode ?? null,
  };
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

  const actionHref = (actionId: string, scene: string) => {
    const returnTo = `/c/services/${data.service.id}?${new URLSearchParams({
      tenant: data.tenant.slug,
      source: context.source,
      scene: 'service_detail',
      storeId: data.store.id,
      ...(context.shareCode ? { shareCode: context.shareCode } : {}),
    }).toString()}`;
    const params = new URLSearchParams({
      tenant: data.tenant.slug,
      source: context.source,
      scene,
      storeId: data.store.id,
      returnTo,
    });
    if (context.shareCode) params.set('shareCode', context.shareCode);
    return `/c/actions/${actionId}?${params.toString()}`;
  };

  return (
    <ConsumerShell context={context} active="menu">
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <a className={styles.back} href={storeHref(context, '/menu', 'service_back')}>
              ‹ 返回菜单
            </a>
            <p className={styles.eyebrow}>
              推广员工具 · 套餐详情 · {data.store.merchant} · {data.store.name}
            </p>
            <p className={styles.testOnly}>本地试用 · 不在此下单</p>
          </header>

          <p className={styles.disclaimer} role="note">
            本页只做套餐说明与比价；成交经确认页跳转美团/抖音等第三方，不在此下单，也不含支付金额。
          </p>
          <div className={styles.quickLinks}>
            <a href={storeHref(context, '', 'service_home')}>门店首页</a>
            <a href={storeHref(context, '/menu', 'service_menu')}>门店菜单</a>
            <a href={storeHref(context, '/group-buy', 'service_group_buy')}>全平台团购</a>
          </div>

          <section className={styles.productCard} aria-label="套餐信息">
            {data.store.imageUrl ? (
              <img className={styles.productImage} src={data.store.imageUrl} alt="" />
            ) : (
              <div className={styles.productImageFallback}>套餐</div>
            )}
            <div className={styles.productMain}>
              <h1>{data.service.name}</h1>
              <p>{data.service.description ?? '套餐安排以门店实际说明为准。'}</p>
              <div className={styles.priceLine}>
                <strong>{data.service.priceLabel ?? '到店询价'}</strong>
                <span>门店参考价</span>
              </div>
              <div className={styles.tags}>
                <span>到店自取</span>
                <span>外链成交</span>
                {data.service.durationMinutes && (
                  <span>预计 {data.service.durationMinutes} 分钟</span>
                )}
              </div>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="platform-title">
            <div className={styles.sectionTitle}>
              <div>
                <p>推广员比价</p>
                <h2 id="platform-title">全平台团购价格</h2>
              </div>
              <span>经确认页跳转</span>
            </div>
            {data.platformOffers.length ? (
              <div className={styles.offerList}>
                {data.platformOffers.map((offer) => (
                  <article className={styles.offer} key={offer.offerId}>
                    <div className={styles.offerMeta}>
                      <span className={styles.platformMark}>
                        {platformLabel(offer.platformType)}
                      </span>
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
                      <a href={actionHref(offer.id, 'service_platform_offer')}>
                        确认前往
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                当前套餐暂未配置平台团购入口，可返回菜单或咨询门店。
              </div>
            )}
          </section>

          <section className={styles.section} aria-labelledby="detail-title">
            <div className={styles.sectionTitle}>
              <div>
                <p>套餐资料</p>
                <h2 id="detail-title">套餐详情</h2>
              </div>
            </div>
            <article className={styles.card}>
              <h3>套餐内容</h3>
              <p>{data.service.description ?? '套餐内容以门店确认信息为准。'}</p>
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
                <p>跳转前请阅读</p>
                <h2 id="rules-title">外链须知</h2>
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
                跳转后以第三方平台订单、库存和门店现场规则为准。本页为推广员工具说明面，非本平台下单。
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
              <div className={styles.empty}>当前套餐暂无额外服务权益。</div>
            )}
          </section>

          <div className={styles.bar}>
            {primaryAction ? (
              <a
                className={styles.primaryButton}
                href={actionHref(primaryAction.id, 'service_primary_action')}
              >
                {data.platformOffers.length
                  ? `确认前往${platformLabel(data.platformOffers[0]!.platformType)}`
                  : 'title' in primaryAction
                    ? primaryAction.title
                    : primaryAction.name}
              </a>
            ) : (
              <div className={styles.empty}>套餐外链入口暂未开放。</div>
            )}
            <p className={styles.notice}>确认后离开本站；本页不含支付与订单履约。</p>
          </div>
        </div>
      </main>
    </ConsumerShell>
  );
}
