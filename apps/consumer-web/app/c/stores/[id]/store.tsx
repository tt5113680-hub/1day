'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { StorefrontFloatingConsult } from '@oneday/storefront-renderer';
import { useStorefrontSync } from '@oneday/sync-client';
import { AppStatePanel, Button } from '@oneday/ui';
import { bindPageFunnel, trackFunnelEvent } from '../../entry-funnel-client';
import { ConsumerShell, resolveConsumerTabs } from '../../consumer-shell';
import { StorefrontModules } from './storefront-modules';
import styles from './store.module.css';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

type StoreOption = {
  id: string;
  name: string;
  address: string | null;
  businessHours: string | null;
  imageUrl: string | null;
};
export type StoreDetail = {
  tenant: { slug: string; name: string };
  storefront: {
    mode: 'preview' | 'published';
    bindingId: string;
    bindingVersion: number;
    templateVersionId: string;
    publishedAt: string | null;
    industry: { family?: string; label?: string; channels?: string[] };
    modules: {
      id: string;
      module_type: string;
      position: number;
      config: Record<string, unknown>;
    }[];
  } | null;
  store: {
    id: string;
    name: string;
    address: string | null;
    merchant: string;
    phone: string | null;
    businessHours: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  stores: StoreOption[];
  services: {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number | null;
    price_label: string | null;
  }[];
  benefits: { id: string; title: string; description: string | null }[];
  content: { id: string; content_type: string; title: string; summary: string | null }[];
  actions: { id: string; name: string; actionType: string; targetUrl: string | null }[];
  outboundPolicy?: 'store_scoped_links_and_offers';
  externalLinks: {
    id: string;
    linkId: string;
    title: string;
    description: string | null;
    platformType: 'meituan' | 'douyin' | 'saabei' | 'external';
    targetUrl: string;
    actionType: string;
  }[];
  platformOffers: {
    id: string;
    offerId: string;
    serviceId: string;
    serviceName: string;
    servicePriceLabel: string | null;
    title: string;
    platformType: 'meituan' | 'douyin' | 'saabei' | 'external';
    offerPrice: number;
    marketPrice: number | null;
    currency: string;
    priceSource: string;
    sourceUpdatedAt: string;
    targetUrl: string | null;
  }[];
};

const query = (data: StoreDetail, source: string, scene: string, shareCode: string | null) => {
  const params = new URLSearchParams({ tenant: data.tenant.slug, source, scene });
  if (shareCode) params.set('shareCode', shareCode);
  return params;
};

export function StoreState({ kind }: { kind: 'error' | 'forbidden' }) {
  const forbidden = kind === 'forbidden';
  return (
    <main className={styles.message}>
      <AppStatePanel
        kind={forbidden ? 'forbidden' : 'error'}
        title={forbidden ? '门店暂不可访问' : '门店内容加载失败'}
        description={
          forbidden
            ? '请确认链接有效，或返回附近页面选择其他门店。'
            : '网络连接暂不可用，请稍后重新加载。'
        }
        action={
          forbidden ? undefined : (
            <Button type="button" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          )
        }
      />
    </main>
  );
}

export default function StorePage({
  data,
  source,
  shareCode,
  scene,
}: {
  data: StoreDetail;
  source: string | null;
  shareCode: string | null;
  scene?: string | null;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const [switcher, setSwitcher] = useState(false);
  const consultAction =
    data.actions.find((item) => item.actionType === 'consultation') ??
    data.actions.find((item) => item.actionType === 'platform_entry') ??
    data.actions[0];
  const sourceValue = source ?? 'consumer:storefront';
  const context = {
    tenant: data.tenant.slug,
    storeId: data.store.id,
    source: sourceValue,
    scene: scene ?? 'storefront',
    shareCode,
  };
  useEffect(
    () =>
      bindPageFunnel({
        tenantSlug: data.tenant.slug,
        surface: 'store',
        moduleKey: 'storefront',
        targetStoreId: data.store.id,
        shareCode,
        source: sourceValue,
        scene: scene ?? 'storefront',
      }),
    [data.tenant.slug, data.store.id, shareCode, sourceValue, scene],
  );
  useStorefrontSync(apiBase, data.tenant.slug, data.store.id, () => {
    setNotice('门店内容已更新，正在同步最新装修…');
    router.refresh();
  });
  const navTabs = resolveConsumerTabs(
    data.storefront?.modules,
    data.storefront?.industry?.channels,
  );
  const industry = data.storefront?.industry.family ?? 'restaurant';
  const returnTo = `/c/stores/${data.store.id}?${query(data, sourceValue, 'storefront', shareCode).toString()}`;
  const actionUrl = (actionId: string, sceneName: string) =>
    `/c/actions/${actionId}?${query(data, sourceValue, sceneName, shareCode).toString()}&storeId=${encodeURIComponent(data.store.id)}&returnTo=${encodeURIComponent(returnTo)}`;
  const consultHref = consultAction ? actionUrl(consultAction.id, 'storefront_consult') : null;
  const groupedPlatformOffers = useMemo(() => {
    const groups = new Map<
      string,
      {
        serviceName: string;
        servicePriceLabel: string | null;
        offers: StoreDetail['platformOffers'];
      }
    >();
    for (const item of data.platformOffers) {
      const current = groups.get(item.serviceId) ?? {
        serviceName: item.serviceName,
        servicePriceLabel: item.servicePriceLabel,
        offers: [],
      };
      current.offers.push(item);
      groups.set(item.serviceId, current);
    }
    return [...groups.values()];
  }, [data.platformOffers]);
  const money = (value: number) => `¥${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
  const navigationUrl =
    data.store.latitude !== null && data.store.longitude !== null
      ? `https://uri.amap.com/marker?position=${data.store.longitude},${data.store.latitude}&name=${encodeURIComponent(data.store.name)}&src=ONEDAY`
      : data.store.address
        ? `https://www.amap.com/search?query=${encodeURIComponent(data.store.address)}`
        : null;

  const outbound = async (outboundType: 'navigation' | 'phone', targetUrl: string) => {
    void trackFunnelEvent(data.tenant.slug, {
      eventCode: 'jump',
      surface: 'store',
      moduleKey: outboundType === 'navigation' ? 'store_navigation' : 'store_phone',
      targetUrl,
      targetStoreId: data.store.id,
      targetPlatform: 'external',
      source: sourceValue,
      scene: 'storefront',
      shareCode,
    });
    const response = await fetch(
      `${apiBase}/api/v1/consumer/stores/${data.store.id}/outbound?tenant=${encodeURIComponent(data.tenant.slug)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          outboundType,
          targetUrl,
          source: sourceValue,
          scene: 'storefront',
          shareCode,
        }),
      },
    );
    if (!response.ok) throw new Error('OUTBOUND');
  };
  const openNavigation = async () => {
    if (!navigationUrl) return;
    try {
      await outbound('navigation', navigationUrl);
      window.location.assign(navigationUrl);
    } catch {
      setNotice('暂时无法打开导航，请稍后重试。');
    }
  };
  const call = async () => {
    if (!data.store.phone) return;
    try {
      await outbound('phone', `tel:${data.store.phone.replace(/\s/g, '')}`);
      window.location.assign(`tel:${data.store.phone.replace(/\s/g, '')}`);
    } catch {
      setNotice('暂时无法发起电话，请稍后重试。');
    }
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share)
        await navigator.share({ title: data.store.name, text: `看看 ${data.store.name}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('门店链接已复制，可发送给朋友。');
      }
      void trackFunnelEvent(data.tenant.slug, {
        eventCode: 'share',
        surface: 'store',
        moduleKey: 'store_share',
        targetStoreId: data.store.id,
        targetUrl: url,
        source: sourceValue,
        scene: 'storefront',
        shareCode,
        shareState: 'sent',
      });
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <ConsumerShell context={context} active="home" tabs={navTabs}>
      {data.storefront?.mode === 'preview' ? (
        <aside className={styles.previewBanner} role="status">
          装修预览 · 当前内容尚未发布，消费者不会看到此版本
        </aside>
      ) : null}
      <main id="top" className={`${styles.page} od-sf-theme`} data-industry={industry}>
        <div className={styles.shell}>
          <h1 className={styles.visuallyHidden}>{data.store.name}</h1>
          <header className={styles.merchantBar}>
            <div>
              <p className={styles.merchantEyebrow}>美团 App · 商家页</p>
              <strong className={styles.merchantName}>{data.store.name}</strong>
              <p className={styles.merchantMeta}>
                {data.store.address ?? '地址待补充'}
                {' · '}
                {data.store.businessHours ?? '营业时间待补充'}
              </p>
            </div>
            <div className={styles.merchantActions}>
              {navigationUrl ? (
                <button type="button" onClick={() => void openNavigation()}>
                  导航
                </button>
              ) : null}
              {data.store.phone ? (
                <button type="button" onClick={() => void call()}>
                  电话
                </button>
              ) : null}
              <button type="button" onClick={() => void share()}>
                分享
              </button>
            </div>
          </header>
          <StorefrontModules
            data={data}
            context={context}
            sourceValue={sourceValue}
            shareCode={shareCode}
            consultAction={consultAction}
            consultHref={consultHref}
            actionUrl={actionUrl}
            navigationUrl={navigationUrl}
            openNavigation={openNavigation}
            call={call}
            share={share}
            setSwitcher={setSwitcher}
            money={money}
            groupedPlatformOffers={groupedPlatformOffers}
          />
          {consultAction ? (
            <StorefrontFloatingConsult
              href={actionUrl(consultAction.id, 'storefront_primary_consult')}
              label={consultAction.name}
              onClick={() => {
                void trackFunnelEvent(data.tenant.slug, {
                  eventCode: 'consult_click',
                  surface: 'store',
                  moduleKey: 'floating_consult',
                  targetStoreId: data.store.id,
                  source: sourceValue,
                  scene: 'storefront_primary_consult',
                  shareCode,
                });
              }}
            />
          ) : null}
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
        </div>
        {switcher && (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={() => setSwitcher(false)}
          >
            <section
              className={styles.switcher}
              role="dialog"
              aria-modal="true"
              aria-label="选择门店"
              onClick={(event) => event.stopPropagation()}
            >
              <div>
                <p>选择门店</p>
                <button type="button" onClick={() => setSwitcher(false)} aria-label="关闭">
                  ×
                </button>
              </div>
              {data.stores.map((store) => (
                <a
                  href={`/c/stores/${store.id}?${query(data, sourceValue, 'store_switcher', shareCode).toString()}`}
                  key={store.id}
                >
                  <span>{store.imageUrl && <img src={store.imageUrl} alt="" />}</span>
                  <strong>
                    {store.name}
                    <small>
                      {store.address ?? '地址待补充'} · {store.businessHours ?? '营业中'}
                    </small>
                  </strong>
                  {store.id === data.store.id && <em>当前</em>}
                </a>
              ))}
            </section>
          </div>
        )}
      </main>
    </ConsumerShell>
  );
}
