'use client';

import { useMemo } from 'react';
import {
  ConsumerShell,
  storeHref,
  type ConsumerContext,
  type ConsumerTab,
} from '../../consumer-shell';
import type { StoreDetail } from './store';
import styles from './channel.module.css';

type Channel = Exclude<ConsumerTab, 'home'>;

const money = (value: number) => `¥${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
const platformName = (platform: StoreDetail['platformOffers'][number]['platformType']) =>
  platform === 'meituan' ? '美团团购' : platform === 'douyin' ? '抖音团购' : '其他平台';

export default function StoreChannel({
  data,
  context,
  channel,
}: {
  data: StoreDetail;
  context: ConsumerContext;
  channel: Channel;
}) {
  const consultAction = data.actions.find((item) => item.actionType !== 'link') ?? data.actions[0];
  const groups = useMemo(() => {
    const result = new Map<
      string,
      { name: string; price: string | null; offers: StoreDetail['platformOffers'] }
    >();
    for (const offer of data.platformOffers) {
      const group = result.get(offer.serviceId) ?? {
        name: offer.serviceName,
        price: offer.servicePriceLabel,
        offers: [],
      };
      group.offers.push(offer);
      result.set(offer.serviceId, group);
    }
    return [...result.values()];
  }, [data.platformOffers]);
  const actionHref = (actionId: string, scene: string, returnTo: string) => {
    const params = new URLSearchParams({
      tenant: context.tenant,
      source: context.source ?? 'consumer:storefront',
      scene,
      storeId: context.storeId,
      returnTo,
    });
    if (context.shareCode) params.set('shareCode', context.shareCode);
    return `/c/actions/${actionId}?${params.toString()}`;
  };

  const title =
    channel === 'group-buy'
      ? '全平台团购'
      : channel === 'menu'
        ? '门店菜单'
        : channel === 'membership'
          ? '会员权益'
          : '我的服务';
  const subtitle =
    channel === 'group-buy'
      ? '先比价格，再前往对应平台下单'
      : channel === 'menu'
        ? '门店已发布的套餐与商品说明'
        : channel === 'membership'
          ? '加入会员后，可由门店为你提供专属服务'
          : '查看本店的服务入口与隐私说明';

  return (
    <ConsumerShell context={context} active={channel}>
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <a href={storeHref(context, '', 'channel_back')}>‹ 返回门店</a>
            <p>
              {data.store.merchant} · {data.store.name}
            </p>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </header>

          {channel === 'group-buy' && (
            <section className={styles.section} aria-label="全平台团购价格">
              {groups.length ? (
                groups.map((group) => {
                  const lowest = Math.min(...group.offers.map((item) => item.offerPrice));
                  return (
                    <article className={styles.package} key={group.name}>
                      <header>
                        <span>门店推荐套餐</span>
                        <strong>{group.name}</strong>
                        {group.price && <small>门店参考价 {group.price}</small>}
                      </header>
                      {group.offers.map((offer) => (
                        <a
                          className={styles.platformRow}
                          href={actionHref(
                            offer.id,
                            'group_buy_compare',
                            storeHref(context, '/group-buy', 'tab_group-buy'),
                          )}
                          key={offer.offerId}
                        >
                          <span
                            className={`${styles.platformBadge} ${styles[`platform${offer.platformType}`]}`}
                          >
                            {offer.platformType === 'meituan'
                              ? '团'
                              : offer.platformType === 'douyin'
                                ? '抖'
                                : '选'}
                          </span>
                          <span>
                            <strong>{offer.title || platformName(offer.platformType)}</strong>
                            <small>
                              {offer.marketPrice
                                ? `划线价 ${money(offer.marketPrice)}`
                                : '平台套餐入口'}
                            </small>
                          </span>
                          <b>
                            {offer.offerPrice === lowest && <em>当前低价</em>}
                            {money(offer.offerPrice)} <i>›</i>
                          </b>
                        </a>
                      ))}
                    </article>
                  );
                })
              ) : (
                <Empty>门店暂未配置可前往的团购入口。</Empty>
              )}
              <p className={styles.disclaimer}>价格、库存和最终优惠以第三方平台实际页面为准。</p>
            </section>
          )}

          {channel === 'menu' && (
            <section className={styles.menu} aria-label="门店菜单">
              {data.services.length ? (
                data.services.map((service, index) => (
                  <a
                    className={styles.menuCard}
                    href={`/c/services/${service.id}?${new URLSearchParams({
                      tenant: context.tenant,
                      source: context.source ?? 'consumer:storefront',
                      scene: 'menu_service',
                      storeId: context.storeId,
                      ...(context.shareCode ? { shareCode: context.shareCode } : {}),
                    }).toString()}`}
                    key={service.id}
                  >
                    {data.store.imageUrl ? (
                      <img src={data.store.imageUrl} alt="" />
                    ) : (
                      <span className={styles.menuImage}>套餐</span>
                    )}
                    <span>
                      <em>{index === 0 ? '门店推荐' : '到店自取'}</em>
                      <strong>{service.name}</strong>
                      <p>{service.description ?? '查看套餐内容、使用规则和平台价格。'}</p>
                      <small>
                        {service.duration_minutes
                          ? `预计 ${service.duration_minutes} 分钟`
                          : '到店可用'}{' '}
                        · {service.price_label ?? '查看价格'}
                      </small>
                    </span>
                    <b>{service.price_label ?? '查看'} ›</b>
                  </a>
                ))
              ) : (
                <Empty>门店正在完善菜单内容。</Empty>
              )}
            </section>
          )}

          {channel === 'membership' && (
            <section className={styles.stack} aria-label="会员权益">
              <article className={styles.memberHero}>
                <span>ONEDAY 会员</span>
                <h2>加入会员，获取本店专属服务</h2>
                <p>无需先创建复杂账号；提交意向后，由门店以合规方式确认服务。</p>
                {consultAction ? (
                  <a
                    href={actionHref(
                      consultAction.id,
                      'membership_join',
                      storeHref(context, '/membership', 'tab_membership'),
                    )}
                  >
                    立即咨询加入
                  </a>
                ) : (
                  <span>暂未开放</span>
                )}
              </article>
              {data.benefits.length ? (
                data.benefits.map((benefit) => (
                  <article className={styles.benefit} key={benefit.id}>
                    <span>门店权益</span>
                    <h2>{benefit.title}</h2>
                    <p>{benefit.description ?? '以门店实际说明为准。'}</p>
                    {consultAction ? (
                      <a
                        href={actionHref(
                          consultAction.id,
                          'benefit_consult',
                          storeHref(context, '/membership', 'tab_membership'),
                        )}
                      >
                        咨询使用方式
                      </a>
                    ) : (
                      <span>暂未开放</span>
                    )}
                  </article>
                ))
              ) : (
                <Empty>当前暂无已发布的会员权益。</Empty>
              )}
            </section>
          )}

          {channel === 'profile' && (
            <section className={styles.stack} aria-label="我的服务">
              <article className={styles.profileHero}>
                <span>我的服务</span>
                <h2>先轻松浏览，需要时再联系门店</h2>
                <p>为保护隐私，未授权时不会在此展示手机号、订单或个人资料。</p>
              </article>
              <a
                className={styles.profileLink}
                href={storeHref(context, '/membership', 'profile_membership')}
              >
                <span>会员权益</span>
                <b>查看本店可用权益 ›</b>
              </a>
              <a
                className={styles.profileLink}
                href={storeHref(context, '/group-buy', 'profile_group_buy')}
              >
                <span>团购比价</span>
                <b>查看各平台套餐价格 ›</b>
              </a>
              {consultAction ? (
                <a
                  className={styles.profileButton}
                  href={actionHref(
                    consultAction.id,
                    'profile_consult',
                    storeHref(context, '/profile', 'tab_profile'),
                  )}
                >
                  咨询门店服务
                </a>
              ) : (
                <span className={styles.profileButton}>暂未开放</span>
              )}
            </section>
          )}
        </div>
      </main>
    </ConsumerShell>
  );
}

function Empty({ children }: { children: string }) {
  return <div className={styles.empty}>{children}</div>;
}
