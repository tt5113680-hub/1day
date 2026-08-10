'use client';

import {
  effectiveStorefrontModules,
  normalizeModuleType,
  SECTION_MODULE_TYPES,
  StorefrontEmpty,
  StorefrontSection,
  storefrontActionIcon,
  visibleStorefrontModules,
} from '@oneday/storefront-renderer';
import '@oneday/storefront-renderer/storefront.css';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { storeHref, type ConsumerContext } from '../../consumer-shell';
import { memberAccessStorageKey } from '../../resolve-consumer-tabs';
import styles from './store.module.css';
import type { StoreDetail } from './store';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

type Module = NonNullable<StoreDetail['storefront']>['modules'][number];

export { visibleStorefrontModules };

export function StorefrontModules({
  data,
  context,
  sourceValue,
  shareCode,
  consultAction,
  consultHref,
  actionUrl,
  navigationUrl,
  openNavigation,
  call,
  share,
  setSwitcher,
  money,
  groupedPlatformOffers,
}: {
  data: StoreDetail;
  context: ConsumerContext;
  sourceValue: string;
  shareCode: string | null;
  consultAction: StoreDetail['actions'][number] | undefined;
  consultHref: string | null;
  actionUrl: (actionId: string, scene: string) => string;
  navigationUrl: string | null;
  openNavigation: () => Promise<void>;
  call: () => Promise<void>;
  share: () => Promise<void>;
  setSwitcher: (open: boolean) => void;
  money: (value: number) => string;
  groupedPlatformOffers: {
    serviceName: string;
    servicePriceLabel: string | null;
    offers: StoreDetail['platformOffers'];
  }[];
}) {
  const effectiveModules = effectiveStorefrontModules(data.storefront?.modules);
  const sectionTypes = SECTION_MODULE_TYPES;
  const renderModule = (module: Module) => {
    const type = normalizeModuleType(module.module_type);
    switch (type) {
      case 'store_hero':
        return (
          <StoreHero
            key={module.id}
            data={data}
            openNavigation={openNavigation}
            navigationUrl={navigationUrl}
            share={share}
            setSwitcher={setSwitcher}
          />
        );
      case 'banner_carousel':
        return (
          <BannerCarousel
            key={module.id}
            data={data}
            context={context}
            sourceValue={sourceValue}
            shareCode={shareCode}
            limit={typeof module.config.limit === 'number' ? module.config.limit : 3}
          />
        );
      case 'operating_channels':
        // Shell tabs consume this module; no in-page section.
        return null;
      case 'quick_actions':
        return (
          <QuickActions
            key={module.id}
            data={data}
            context={context}
            capabilities={
              Array.isArray(module.config.capabilities)
                ? module.config.capabilities.filter(
                    (item): item is string => typeof item === 'string',
                  )
                : ['consult', 'phone', 'navigation']
            }
            consultAction={consultAction}
            actionUrl={actionUrl}
            openNavigation={openNavigation}
            call={call}
            share={share}
            navigationUrl={navigationUrl}
          />
        );
      case 'member_entry':
        return (
          <MemberEntry
            key={module.id}
            data={data}
            consultAction={consultAction}
            consultHref={consultHref}
            actionUrl={actionUrl}
          />
        );
      case 'member_wallet':
        return <MemberWallet key={module.id} context={context} />;
      case 'service_catalog':
        return (
          <ServiceCatalog
            key={module.id}
            data={data}
            sourceValue={sourceValue}
            shareCode={shareCode}
          />
        );
      case 'offer_compare':
        return (
          <OfferCompare
            key={module.id}
            data={data}
            actionUrl={actionUrl}
            money={money}
            groupedPlatformOffers={groupedPlatformOffers}
          />
        );
      case 'content_feed':
        return <ContentFeed key={module.id} data={data} />;
      case 'store_info':
        return (
          <StoreInfo
            key={module.id}
            data={data}
            navigationUrl={navigationUrl}
            openNavigation={openNavigation}
            call={call}
            share={share}
            consultAction={consultAction}
            consultHref={consultHref}
            actionUrl={actionUrl}
          />
        );
      default:
        return null;
    }
  };
  const nodes: ReactNode[] = [];
  let sectionBatch: ReactNode[] = [];
  const flushSections = (key: string) => {
    if (!sectionBatch.length) return;
    nodes.push(
      <div className={styles.desktopGrid} key={key}>
        {sectionBatch}
      </div>,
    );
    sectionBatch = [];
  };
  for (const module of effectiveModules) {
    const type = normalizeModuleType(module.module_type);
    const node = renderModule(module);
    if (!node) continue;
    if (sectionTypes.has(type as never)) sectionBatch.push(node);
    else {
      flushSections(`sections-before-${module.id}`);
      nodes.push(node);
    }
  }
  flushSections('sections-tail');
  return <>{nodes}</>;
}

function StoreHero({
  data,
  openNavigation,
  navigationUrl,
  share,
  setSwitcher,
}: {
  data: StoreDetail;
  openNavigation: () => Promise<void>;
  navigationUrl: string | null;
  share: () => Promise<void>;
  setSwitcher: (open: boolean) => void;
}) {
  return (
    <header className={styles.topbar} data-module="store_hero">
      <div className={styles.topMeta}>
        <button
          className={styles.lbsButton}
          type="button"
          onClick={openNavigation}
          disabled={!navigationUrl}
        >
          <i>⌖</i>
          <span>LBS 定位</span>
          <b>{data.store.address ?? '定位当前门店'}</b>
        </button>
        <span className={styles.futureRecommend} aria-label="商圈或 OEM 品牌推荐，暂未开放">
          <i>◇</i>
          <span>商圈 / OEM 推荐</span>
          <small>即将开放</small>
        </span>
      </div>
      <div className={styles.storeOverview}>
        <button
          className={styles.storeIdentity}
          type="button"
          onClick={() => setSwitcher(true)}
          aria-haspopup="dialog"
        >
          {data.store.imageUrl ? (
            <img className={styles.storeThumb} src={data.store.imageUrl} alt="" />
          ) : (
            <span className={styles.brandMark}>O</span>
          )}
          <span className={styles.storeIdentityCopy}>
            <small>{data.store.merchant}</small>
            <strong>{data.store.name}</strong>
          </span>
        </button>
        <button className={styles.shareButton} type="button" onClick={share} aria-label="分享门店">
          ↗
        </button>
      </div>
      <dl className={styles.storeFacts} aria-label="门店基础信息">
        <div>
          <dt>门店状态</dt>
          <dd>营业中</dd>
        </div>
        <div>
          <dt>营业时间</dt>
          <dd>{data.store.businessHours ?? '以门店为准'}</dd>
        </div>
        <div>
          <dt>服务方式</dt>
          <dd>到店自取</dd>
        </div>
        <div>
          <dt>门店标识</dt>
          <dd>TEST ONLY</dd>
        </div>
      </dl>
      <button
        className={styles.storeButton}
        type="button"
        onClick={() => setSwitcher(true)}
        aria-haspopup="dialog"
      >
        <span className={styles.brandMark}>O</span>
        <span>
          <b>{data.tenant.name.replace(' · ONEDAY测试模拟租户', '')}</b>
          <strong>{data.store.name}⌄</strong>
        </span>
      </button>
      <span className={styles.openState}>营业中 · {data.store.businessHours ?? '以门店为准'}</span>
      <button className={styles.shareButton} type="button" onClick={share} aria-label="分享门店">
        ↗
      </button>
    </header>
  );
}

function BannerCarousel({
  data,
  context,
  sourceValue,
  shareCode,
  limit,
}: {
  data: StoreDetail;
  context: ConsumerContext;
  sourceValue: string;
  shareCode: string | null;
  limit: number;
}) {
  const banners = useMemo(() => {
    const slides: { eyebrow: string; title: string; copy: string; href: string }[] = [];
    for (const service of data.services) {
      if (slides.length >= limit) break;
      slides.push({
        eyebrow: '今日门店推荐',
        title: service.name,
        copy: service.description ?? '到店自取，享受当下的片刻松弛。',
        href: `/c/services/${service.id}?tenant=${encodeURIComponent(data.tenant.slug)}&source=${encodeURIComponent(sourceValue)}&scene=banner_service${shareCode ? `&shareCode=${encodeURIComponent(shareCode)}` : ''}&storeId=${encodeURIComponent(data.store.id)}`,
      });
    }
    for (const benefit of data.benefits) {
      if (slides.length >= limit) break;
      slides.push({
        eyebrow: '会员新客礼',
        title: benefit.title,
        copy: benefit.description ?? '查看当前门店发布的可用权益。',
        href: storeHref(context, '/membership', 'banner_membership'),
      });
    }
    for (const offer of data.platformOffers) {
      if (slides.length >= limit) break;
      slides.push({
        eyebrow: '全平台比价',
        title: offer.title,
        copy: '价格、库存与最终优惠以第三方实际页面为准。',
        href: storeHref(context, '/group-buy', 'banner_group_buy'),
      });
    }
    for (const item of data.content) {
      if (slides.length >= limit) break;
      slides.push({
        eyebrow: '门店动态',
        title: item.title,
        copy: item.summary ?? '门店正在分享最新消息。',
        href: '#updates',
      });
    }
    return slides.slice(0, limit);
  }, [data, context, sourceValue, shareCode, limit]);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % banners.length),
      4800,
    );
    return () => window.clearInterval(timer);
  }, [banners.length]);
  if (!banners.length) return null;
  const currentBanner = banners[slide] ?? banners[0]!;
  return (
    <section className={styles.banner} aria-label="门店营销活动" data-module="banner_carousel">
      {data.store.imageUrl && (
        <img src={data.store.imageUrl} alt="" className={styles.bannerImage} />
      )}
      <div className={styles.bannerShade} />
      <div className={styles.bannerCopy}>
        <p>{currentBanner.eyebrow}</p>
        <h1>{currentBanner.title}</h1>
        <span>{currentBanner.copy}</span>
        <a href={currentBanner.href}>
          立即查看 <b>→</b>
        </a>
      </div>
      {banners.length > 1 ? (
        <div className={styles.dots} aria-label="Banner 指示器">
          {banners.map((item, index) => (
            <button
              type="button"
              onClick={() => setSlide(index)}
              className={index === slide ? styles.dotActive : styles.dot}
              aria-label={`第 ${index + 1} 张活动`}
              key={`${item.title}-${index}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QuickActions({
  data,
  context,
  capabilities,
  consultAction,
  actionUrl,
  openNavigation,
  call,
  share,
  navigationUrl,
}: {
  data: StoreDetail;
  context: ConsumerContext;
  capabilities: string[];
  consultAction: StoreDetail['actions'][number] | undefined;
  actionUrl: (actionId: string, scene: string) => string;
  openNavigation: () => Promise<void>;
  call: () => Promise<void>;
  share: () => Promise<void>;
  navigationUrl: string | null;
}) {
  const catalog: Record<
    string,
    {
      label: string;
      icon: string;
      href?: string;
      onClick?: () => void | Promise<void>;
      disabled?: boolean;
    }
  > = {
    group_buy: {
      label: '团购',
      icon: '◌',
      href: storeHref(context, '/group-buy', 'shortcut_group_buy'),
    },
    menu: { label: '菜单', icon: '▦', href: storeHref(context, '/menu', 'shortcut_menu') },
    benefit: {
      label: '优惠',
      icon: '✦',
      href: storeHref(context, '/membership', 'shortcut_benefit'),
    },
    membership: {
      label: '会员',
      icon: '♧',
      href: storeHref(context, '/membership', 'shortcut_membership'),
    },
    consult: {
      label: '咨询',
      icon: '◈',
      href: consultAction ? actionUrl(consultAction.id, 'shortcut_consult') : undefined,
      disabled: !consultAction,
    },
    appointment: {
      label: '预约',
      icon: '◈',
      href: consultAction ? actionUrl(consultAction.id, 'shortcut_appointment') : undefined,
      disabled: !consultAction,
    },
    trial: {
      label: '体验',
      icon: '◍',
      href: consultAction ? actionUrl(consultAction.id, 'shortcut_trial') : undefined,
      disabled: !consultAction,
    },
    navigation: {
      label: '导航',
      icon: '⌖',
      onClick: openNavigation,
      disabled: !navigationUrl,
    },
    phone: {
      label: '电话',
      icon: '⌁',
      onClick: call,
      disabled: !data.store.phone,
    },
    updates: { label: '活动', icon: '◍', href: '#updates' },
    share: { label: '分享', icon: '↗', onClick: share },
    more: { label: '更多', icon: '⋯', href: '#store-info' },
  };
  const shortcuts = capabilities.map((code) => catalog[code]).filter(Boolean);
  if (!shortcuts.length) return null;
  return (
    <section className={styles.shortcutGrid} aria-label="门店快捷入口" data-module="quick_actions">
      {shortcuts.map((item, index) =>
        item!.href ? (
          <a className={styles.shortcut} href={item!.href} key={`${item!.label}-${index}`}>
            <i>{item!.icon ?? storefrontActionIcon(index)}</i>
            <span>{item!.label}</span>
          </a>
        ) : (
          <button
            className={styles.shortcut}
            type="button"
            onClick={item!.onClick}
            disabled={item!.disabled}
            key={`${item!.label}-${index}`}
          >
            <i>{item!.icon ?? storefrontActionIcon(index)}</i>
            <span>{item!.label}</span>
          </button>
        ),
      )}
    </section>
  );
}

function MemberEntry({
  data,
  consultAction,
  consultHref,
  actionUrl,
}: {
  data: StoreDetail;
  consultAction: StoreDetail['actions'][number] | undefined;
  consultHref: string | null;
  actionUrl: (actionId: string, scene: string) => string;
}) {
  return (
    <div data-module="member_entry">
      <section id="membership" className={styles.memberCard}>
        <div>
          <span>ONEDAY 会员</span>
          <h2>加入会员，领取门店专属权益</h2>
          <p>匿名浏览不受影响；加入意向会由门店同事跟进确认。</p>
        </div>
        <a
          href={`/c/stores/${data.store.id}/membership?tenant=${encodeURIComponent(data.tenant.slug)}&source=consumer:storefront&scene=membership_join`}
        >
          立即加入
        </a>
      </section>
      {data.benefits.length ? (
        <StorefrontSection title="门店权益" hint="入会后按门店配置发放" anchor="benefits">
          <div className={styles.benefitList}>
            {data.benefits.map((item, index) => (
              <article className={styles.benefit} key={item.id}>
                <span>{index === 0 ? 'NEW' : 'PLUS'}</span>
                <strong>{item.title}</strong>
                <p>{item.description ?? '以门店实际配置为准'}</p>
                {consultHref && consultAction ? (
                  <a href={actionUrl(consultAction.id, 'benefit_view')}>查看使用方式</a>
                ) : (
                  <span>暂未开放</span>
                )}
              </article>
            ))}
          </div>
        </StorefrontSection>
      ) : null}
    </div>
  );
}

function MemberWallet({ context }: { context: ConsumerContext }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'anonymous' | 'error'>('idle');
  const [wallet, setWallet] = useState<{
    memberCode: string;
    tier: string;
    benefits: { id: string; title: string; description: string | null; balance: number }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const raw =
        typeof sessionStorage === 'undefined'
          ? null
          : sessionStorage.getItem(memberAccessStorageKey(context.tenant, context.storeId));
      if (!raw) {
        if (!cancelled) setState('anonymous');
        return;
      }
      let access: { accessId?: string; access?: string } | null = null;
      try {
        access = JSON.parse(raw) as { accessId?: string; access?: string };
      } catch {
        if (!cancelled) setState('anonymous');
        return;
      }
      if (!access?.accessId || !access.access) {
        if (!cancelled) setState('anonymous');
        return;
      }
      if (!cancelled) setState('loading');
      try {
        const response = await fetch(
          `${apiBase}/api/v1/consumer/memberships/wallet?tenant=${encodeURIComponent(context.tenant)}&accessId=${encodeURIComponent(access.accessId)}&access=${encodeURIComponent(access.access)}`,
        );
        if (response.status === 404) {
          if (!cancelled) setState('anonymous');
          return;
        }
        if (!response.ok) throw Error();
        const payload = (await response.json()).data as typeof wallet;
        if (!cancelled) {
          setWallet(payload);
          setState('ready');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [context.storeId, context.tenant]);

  return (
    <StorefrontSection
      title="会员钱包"
      hint="仅展示本机会话已授权的权益余额"
      anchor="wallet"
      moduleType="member_wallet"
    >
      {state === 'loading' || state === 'idle' ? (
        <StorefrontEmpty>正在读取会员钱包…</StorefrontEmpty>
      ) : null}
      {state === 'error' ? (
        <StorefrontEmpty>暂时无法读取会员钱包，请稍后重试。</StorefrontEmpty>
      ) : null}
      {state === 'anonymous' ? (
        <div className={styles.benefitList}>
          <article className={styles.benefit}>
            <span>MEMBER</span>
            <strong>入会后可查看权益余额</strong>
            <p>匿名浏览不会暴露钱包；完成本店入会并授权后，此处显示可核销余额。</p>
            <a href={storeHref(context, '/membership', 'wallet_enroll')}>前往入会</a>
          </article>
        </div>
      ) : null}
      {state === 'ready' && wallet ? (
        <div className={styles.benefitList}>
          <article className={styles.benefit}>
            <span>{wallet.tier || 'MEMBER'}</span>
            <strong>会员码 {wallet.memberCode}</strong>
            <p>余额来自门店已发放的权益账本，不以第三方平台库存为准。</p>
          </article>
          {wallet.benefits.length ? (
            wallet.benefits.map((item) => (
              <article className={styles.benefit} key={item.id}>
                <span>余额 {item.balance}</span>
                <strong>{item.title}</strong>
                <p>{item.description ?? '到店核销时出示会员码'}</p>
              </article>
            ))
          ) : (
            <StorefrontEmpty>入会成功，门店尚未发放可核销权益。</StorefrontEmpty>
          )}
        </div>
      ) : null}
    </StorefrontSection>
  );
}

function ServiceCatalog({
  data,
  sourceValue,
  shareCode,
}: {
  data: StoreDetail;
  sourceValue: string;
  shareCode: string | null;
}) {
  const params = new URLSearchParams({
    tenant: data.tenant.slug,
    source: sourceValue,
    scene: 'storefront_service',
  });
  if (shareCode) params.set('shareCode', shareCode);
  return (
    <StorefrontSection
      title="今日推荐"
      hint="门店精选 · 到店自取"
      anchor="offers"
      moduleType="service_catalog"
    >
      <div className={styles.offerList}>
        {data.services.length ? (
          data.services.map((item, index) => (
            <a
              id={`offer-${item.id}`}
              href={`/c/services/${item.id}?${params.toString()}&storeId=${encodeURIComponent(data.store.id)}`}
              className={styles.offer}
              key={item.id}
            >
              {data.store.imageUrl && (
                <img
                  src={data.store.imageUrl}
                  alt=""
                  style={{ objectPosition: index % 2 ? '65% 50%' : '100% 50%' }}
                />
              )}
              <span className={styles.offerBody}>
                <em>{index === 0 ? '热销推荐' : '到店自取'}</em>
                <strong>{item.name}</strong>
                <p>{item.description ?? '门店已发布的到店服务'}</p>
                <small>
                  {item.duration_minutes ? `${item.duration_minutes} 分钟` : '到店可用'} · 原价{' '}
                  {item.price_label ?? '以门店为准'}
                </small>
                <b>
                  {item.price_label ?? '立即查看'} <i>›</i>
                </b>
              </span>
            </a>
          ))
        ) : (
          <StorefrontEmpty>门店正在完善推荐内容。</StorefrontEmpty>
        )}
      </div>
    </StorefrontSection>
  );
}

function OfferCompare({
  data,
  actionUrl,
  money,
  groupedPlatformOffers,
}: {
  data: StoreDetail;
  actionUrl: (actionId: string, scene: string) => string;
  money: (value: number) => string;
  groupedPlatformOffers: {
    serviceName: string;
    servicePriceLabel: string | null;
    offers: StoreDetail['platformOffers'];
  }[];
}) {
  return (
    <StorefrontSection
      title="全平台团购比价"
      hint="选好平台再前往下单"
      anchor="platforms"
      moduleType="offer_compare"
    >
      {data.platformOffers.length || data.externalLinks.length ? (
        <>
          {groupedPlatformOffers.map((group) => {
            const lowest = Math.min(...group.offers.map((item) => item.offerPrice));
            return (
              <article className={styles.comparisonPackage} key={group.offers[0]?.serviceId}>
                <header>
                  <span>门店推荐套餐</span>
                  <strong>{group.serviceName}</strong>
                  {group.servicePriceLabel && <small>门店标价 {group.servicePriceLabel}</small>}
                </header>
                <div className={styles.priceRows}>
                  {group.offers.map((item) => (
                    <a
                      className={styles.priceRow}
                      href={actionUrl(item.id, 'platform_compare_price')}
                      key={item.offerId}
                    >
                      <span
                        className={`${styles.platformMark} ${styles[`platform${item.platformType}`]}`}
                      >
                        {item.platformType === 'meituan'
                          ? '团'
                          : item.platformType === 'douyin'
                            ? '抖'
                            : '荐'}
                      </span>
                      <span className={styles.pricePlatform}>
                        <strong>{item.title}</strong>
                        <small>
                          {item.marketPrice ? `划线价 ${money(item.marketPrice)}` : '平台推荐套餐'}
                          {' · '}商家登记于{' '}
                          {new Date(item.sourceUpdatedAt).toLocaleDateString('zh-CN')}
                        </small>
                      </span>
                      <b className={styles.priceValue}>
                        {item.offerPrice === lowest && <em>当前低价</em>}
                        团购价 {money(item.offerPrice)}
                      </b>
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
          {!data.platformOffers.length && data.externalLinks.length ? (
            <div className={styles.platformList}>
              {data.externalLinks.map((item, index) => (
                <a
                  className={styles.platform}
                  href={actionUrl(item.id, 'platform_compare')}
                  key={item.linkId}
                >
                  <span
                    className={`${styles.platformMark} ${styles[`platform${item.platformType}`]}`}
                  >
                    {item.platformType === 'meituan'
                      ? '团'
                      : item.platformType === 'douyin'
                        ? '抖'
                        : '荐'}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <p>{item.description ?? '前往对应平台查看'}</p>
                  </span>
                  <b>
                    {index === 0 ? '优先查看' : '去比价'} <i>›</i>
                  </b>
                </a>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <StorefrontEmpty>门店暂未配置可跳转的平台入口。</StorefrontEmpty>
      )}
      <p className={styles.disclaimer}>价格、库存及最终优惠以第三方平台实际页面为准。</p>
    </StorefrontSection>
  );
}

function ContentFeed({ data }: { data: StoreDetail }) {
  return (
    <StorefrontSection
      title="门店活动"
      hint="只展示商家已发布内容"
      anchor="updates"
      moduleType="content_feed"
    >
      <div className={styles.storyList}>
        {data.content.length ? (
          data.content.map((item, index) => (
            <article className={styles.story} key={item.id}>
              {data.store.imageUrl && (
                <img
                  src={data.store.imageUrl}
                  alt=""
                  style={{ objectPosition: index ? '40% 65%' : '75% 45%' }}
                />
              )}
              <span>
                <em>{item.content_type === 'story' ? '门店动态' : '今日推荐'}</em>
                <strong>{item.title}</strong>
                <p>{item.summary ?? '门店正在分享最新消息。'}</p>
                <small>LOCAL HUMAN PILOT · TEST ONLY</small>
              </span>
            </article>
          ))
        ) : (
          <StorefrontEmpty>门店正在准备更多动态。</StorefrontEmpty>
        )}
      </div>
    </StorefrontSection>
  );
}

function StoreInfo({
  data,
  navigationUrl,
  openNavigation,
  call,
  share,
  consultAction,
  consultHref,
  actionUrl,
}: {
  data: StoreDetail;
  navigationUrl: string | null;
  openNavigation: () => Promise<void>;
  call: () => Promise<void>;
  share: () => Promise<void>;
  consultAction: StoreDetail['actions'][number] | undefined;
  consultHref: string | null;
  actionUrl: (actionId: string, scene: string) => string;
}) {
  return (
    <section id="store-info" className={styles.storeInfo} data-module="store_info">
      <p>门店位置</p>
      <h2>{data.store.address ?? '门店暂未提供有效地址'}</h2>
      <span>{data.store.businessHours ?? '营业时间以门店为准'}</span>
      <div>
        {navigationUrl && (
          <button type="button" onClick={openNavigation}>
            ⌖ 导航
          </button>
        )}
        {data.store.phone && (
          <button type="button" onClick={call}>
            ⌁ {data.store.phone}
          </button>
        )}
        {consultHref && consultAction && (
          <a href={actionUrl(consultAction.id, 'store_contact_consult')}>◈ 咨询</a>
        )}
        <button type="button" onClick={share}>
          ↗ 分享
        </button>
      </div>
    </section>
  );
}
