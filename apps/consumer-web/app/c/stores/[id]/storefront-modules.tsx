'use client';

import {
  effectiveStorefrontModules,
  normalizeModuleType,
  SECTION_MODULE_TYPES,
  StorefrontBannerCarousel,
  StorefrontBenefitList,
  StorefrontEmpty,
  StorefrontHero,
  StorefrontMemberCard,
  StorefrontOfferCompare,
  StorefrontOfferList,
  StorefrontQuickActions,
  StorefrontSection,
  StorefrontStoreInfo,
  StorefrontStoryList,
  visibleStorefrontModules,
} from '@oneday/storefront-renderer';
import '@oneday/storefront-renderer/storefront.css';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { storeHref, type ConsumerContext } from '../../consumer-shell';
import { observeModuleImpressions, trackFunnelEvent } from '../../entry-funnel-client';
import { fetchMemberWallet, readMemberAccess } from '../../member-session';
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
  const [mountEl, setMountEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!mountEl) return;
    return observeModuleImpressions({
      tenantSlug: data.tenant.slug,
      surface: 'store',
      root: mountEl,
      targetStoreId: data.store.id,
      shareCode,
      source: sourceValue,
      scene: 'storefront_modules',
    });
  }, [mountEl, data.tenant.slug, data.store.id, shareCode, sourceValue]);
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
            sourceValue={sourceValue}
            shareCode={shareCode}
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
  return (
    <div ref={setMountEl} data-funnel-root="storefront">
      {nodes}
    </div>
  );
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
  const hours = data.store.businessHours ?? '以门店为准';
  return (
    <StorefrontHero
      merchant={data.store.merchant}
      storeName={data.store.name}
      tenantLabel={data.tenant.name.replace(' · ONEDAY测试模拟租户', '')}
      addressLabel={data.store.address ?? '定位当前门店'}
      openStateLabel={`营业中 · ${hours}`}
      imageUrl={data.store.imageUrl}
      navigationEnabled={Boolean(navigationUrl)}
      facts={[
        { label: '门店状态', value: '营业中' },
        { label: '营业时间', value: hours },
        { label: '服务方式', value: '到店自取' },
        { label: '门店标识', value: 'TEST ONLY' },
      ]}
      onNavigate={openNavigation}
      onShare={share}
      onOpenSwitcher={() => setSwitcher(true)}
    />
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
        href: `/c/services/${offer.serviceId}?tenant=${encodeURIComponent(data.tenant.slug)}&source=${encodeURIComponent(sourceValue)}&scene=banner_group_buy_offer${shareCode ? `&shareCode=${encodeURIComponent(shareCode)}` : ''}&storeId=${encodeURIComponent(data.store.id)}`,
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
  if (!banners.length) return null;
  return <StorefrontBannerCarousel slides={banners} imageUrl={data.store.imageUrl} />;
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
      onClick: consultAction
        ? () => {
            void trackFunnelEvent(data.tenant.slug, {
              eventCode: 'consult_click',
              surface: 'store',
              moduleKey: 'quick_actions',
              targetStoreId: data.store.id,
              source: context.source ?? undefined,
              scene: 'shortcut_consult',
              shareCode: context.shareCode ?? undefined,
            });
          }
        : undefined,
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
    <StorefrontQuickActions
      items={shortcuts.map((item) => ({
        label: item!.label,
        icon: item!.icon,
        href: item!.href,
        onClick: item!.onClick,
        disabled: item!.disabled,
      }))}
    />
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
      <StorefrontMemberCard
        title="加入会员，领取门店专属权益"
        copy="匿名浏览不受影响；加入意向会由门店同事跟进确认。"
        ctaHref={`/c/stores/${data.store.id}/membership?tenant=${encodeURIComponent(data.tenant.slug)}&source=consumer:storefront&scene=membership_join`}
      />
      {data.benefits.length ? (
        <StorefrontSection title="门店权益" hint="入会后按门店配置发放" anchor="benefits">
          <StorefrontBenefitList
            items={data.benefits.map((item, index) => ({
              key: item.id,
              badge: index === 0 ? 'NEW' : 'PLUS',
              title: item.title,
              description: item.description ?? '以门店实际配置为准',
              href:
                consultHref && consultAction
                  ? actionUrl(consultAction.id, 'benefit_view')
                  : undefined,
              ctaFallback: consultHref && consultAction ? undefined : '暂未开放',
            }))}
          />
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
      const access = readMemberAccess(context.tenant, context.storeId);
      if (!access) {
        if (!cancelled) setState('anonymous');
        return;
      }
      if (!cancelled) setState('loading');
      try {
        const result = await fetchMemberWallet(apiBase, context.tenant, access);
        if (result.status === 404) {
          if (!cancelled) setState('anonymous');
          return;
        }
        if (!result.data) throw Error();
        if (!cancelled) {
          setWallet(result.data);
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
        <StorefrontBenefitList
          items={[
            {
              key: 'anonymous',
              badge: 'MEMBER',
              title: '入会后可查看权益余额',
              description:
                '匿名浏览不会暴露钱包；完成本店入会并授权后，此处显示可核销余额。',
              href: storeHref(context, '/membership', 'wallet_enroll'),
              ctaLabel: '前往入会',
            },
          ]}
        />
      ) : null}
      {state === 'ready' && wallet ? (
        <StorefrontBenefitList
          items={[
            {
              key: 'wallet-code',
              badge: wallet.tier || 'MEMBER',
              title: `会员码 ${wallet.memberCode}`,
              description: '余额来自门店已发放的权益账本，不以第三方平台库存为准。',
            },
            ...wallet.benefits.map((item) => ({
              key: item.id,
              badge: `余额 ${item.balance}`,
              title: item.title,
              description: item.description ?? '到店核销时出示会员码',
            })),
          ]}
        />
      ) : null}
      {state === 'ready' && wallet && !wallet.benefits.length ? (
        <StorefrontEmpty>入会成功，门店尚未发放可核销权益。</StorefrontEmpty>
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
      {data.services.length ? (
        <StorefrontOfferList
          items={data.services.map((item, index) => ({
            id: item.id,
            href: `/c/services/${item.id}?${params.toString()}&storeId=${encodeURIComponent(data.store.id)}`,
            title: item.name,
            description: item.description ?? '门店已发布的到店服务',
            meta: `${item.duration_minutes ? `${item.duration_minutes} 分钟` : '到店可用'} · 原价 ${item.price_label ?? '以门店为准'}`,
            cta: item.price_label ?? '立即查看',
            eyebrow: index === 0 ? '热销推荐' : '到店自取',
            imageUrl: data.store.imageUrl,
            imagePosition: index % 2 ? '65% 50%' : '100% 50%',
          }))}
        />
      ) : (
        <StorefrontEmpty>门店正在完善推荐内容。</StorefrontEmpty>
      )}
    </StorefrontSection>
  );
}

function OfferCompare({
  data,
  actionUrl,
  money,
  groupedPlatformOffers,
  sourceValue,
  shareCode,
}: {
  data: StoreDetail;
  actionUrl: (actionId: string, scene: string) => string;
  money: (value: number) => string;
  groupedPlatformOffers: {
    serviceName: string;
    servicePriceLabel: string | null;
    offers: StoreDetail['platformOffers'];
  }[];
  sourceValue: string;
  shareCode: string | null;
}) {
  const serviceDetailUrl = (serviceId: string, scene: string) => {
    const params = new URLSearchParams({
      tenant: data.tenant.slug,
      source: sourceValue,
      scene,
      storeId: data.store.id,
    });
    if (shareCode) params.set('shareCode', shareCode);
    return `/c/services/${serviceId}?${params.toString()}`;
  };
  return (
    <StorefrontSection
      title="全平台团购比价"
      hint="选好平台后经确认页跳转（不在此下单）"
      anchor="platforms"
      moduleType="offer_compare"
    >
      {data.platformOffers.length || data.externalLinks.length ? (
        <StorefrontOfferCompare
          packages={groupedPlatformOffers.map((group) => {
            const serviceId = group.offers[0]?.serviceId;
            const lowest = Math.min(...group.offers.map((item) => item.offerPrice));
            return {
              key: serviceId ?? group.serviceName,
              serviceName: group.serviceName,
              servicePriceLabel: group.servicePriceLabel,
              detailHref: serviceId
                ? serviceDetailUrl(serviceId, 'storefront_group_buy_detail')
                : undefined,
              rows: group.offers.map((item) => ({
                key: item.offerId,
                href: `${serviceDetailUrl(item.serviceId, 'storefront_group_buy_offer')}#offer-${item.offerId}`,
                platformType: item.platformType,
                title: item.title,
                meta: `${item.marketPrice ? `划线价 ${money(item.marketPrice)}` : '平台推荐套餐'} · 查看套餐详情 · 商家登记于 ${new Date(item.sourceUpdatedAt).toLocaleDateString('zh-CN')}`,
                priceLabel: `团购价 ${money(item.offerPrice)}`,
                lowest: item.offerPrice === lowest,
              })),
            };
          })}
          links={
            !data.platformOffers.length
              ? data.externalLinks.map((item, index) => ({
                  key: item.linkId,
                  href: actionUrl(item.id, 'platform_compare'),
                  platformType: item.platformType,
                  title: item.title,
                  description: item.description ?? '前往对应平台查看',
                  cta: index === 0 ? '优先查看' : '去比价',
                }))
              : []
          }
        />
      ) : (
        <>
          <StorefrontEmpty>门店暂未配置可跳转的平台入口。</StorefrontEmpty>
          <p className="od-sf-disclaimer">价格、库存及最终优惠以第三方平台实际页面为准。</p>
        </>
      )}
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
      {data.content.length ? (
        <StorefrontStoryList
          items={data.content.map((item, index) => ({
            id: item.id,
            eyebrow: item.content_type === 'story' ? '门店动态' : '今日推荐',
            title: item.title,
            summary: item.summary ?? '门店正在分享最新消息。',
            meta: '本地试用 · 推广员入口',
            imageUrl: data.store.imageUrl,
            imagePosition: index ? '40% 65%' : '75% 45%',
          }))}
        />
      ) : (
        <StorefrontEmpty>门店正在准备更多动态。</StorefrontEmpty>
      )}
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
    <StorefrontStoreInfo
      address={data.store.address ?? '门店暂未提供有效地址'}
      hours={data.store.businessHours ?? '营业时间以门店为准'}
      actions={[
        ...(navigationUrl
          ? [{ key: 'nav', label: '⌖ 导航', onClick: openNavigation }]
          : []),
        ...(data.store.phone
          ? [{ key: 'phone', label: `⌁ ${data.store.phone}`, onClick: call }]
          : []),
        ...(consultHref && consultAction
          ? [
              {
                key: 'consult',
                label: '◈ 咨询',
                href: actionUrl(consultAction.id, 'store_contact_consult'),
              },
            ]
          : []),
        { key: 'share', label: '↗ 分享', onClick: share },
      ]}
    />
  );
}
