'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  externalLinks: {
    id: string;
    linkId: string;
    title: string;
    description: string | null;
    platformType: 'meituan' | 'douyin' | 'external';
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
    platformType: 'meituan' | 'douyin' | 'external';
    offerPrice: number;
    marketPrice: number | null;
    targetUrl: string | null;
  }[];
};

const visual = (index: number) => ['◌', '▦', '✦', '♧', '◈', '⌁', '◍', '⌖', '↗', '⋯'][index] ?? '•';
const query = (data: StoreDetail, source: string, scene: string, shareCode: string | null) => {
  const params = new URLSearchParams({ tenant: data.tenant.slug, source, scene });
  if (shareCode) params.set('shareCode', shareCode);
  return params;
};

export function StoreState({ kind }: { kind: 'error' | 'forbidden' }) {
  const forbidden = kind === 'forbidden';
  return (
    <main className={styles.message}>
      <section className={styles.messageCard}>
        <span className={styles.messageMark}>O</span>
        <h1>{forbidden ? '门店暂不可访问' : '门店内容加载失败'}</h1>
        <p>
          {forbidden
            ? '请确认链接有效，或返回附近页面选择其他门店。'
            : '网络连接暂不可用，请稍后重新加载。'}
        </p>
        {!forbidden && (
          <button type="button" onClick={() => window.location.reload()}>
            重新加载
          </button>
        )}
      </section>
    </main>
  );
}

export default function StorePage({
  data,
  source,
  shareCode,
}: {
  data: StoreDetail;
  source: string | null;
  shareCode: string | null;
}) {
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [slide, setSlide] = useState(0);
  const consultAction = data.actions.find((item) => item.actionType !== 'link') ?? data.actions[0];
  const platformAction = data.platformOffers[0] ?? data.externalLinks[0];
  const sourceValue = source ?? 'consumer:storefront';
  const returnTo = `/c/stores/${data.store.id}?${query(data, sourceValue, 'storefront', shareCode).toString()}`;
  const actionUrl = (actionId: string, scene: string) =>
    `/c/actions/${actionId}?${query(data, sourceValue, scene, shareCode).toString()}&storeId=${encodeURIComponent(data.store.id)}&returnTo=${encodeURIComponent(returnTo)}`;
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
  const banners = useMemo(
    () => [
      {
        eyebrow: '今日门店推荐',
        title: data.services[0]?.name ?? '一杯好咖啡，从现在开始',
        copy: data.services[0]?.description ?? '到店自取，享受当下的片刻松弛。',
        href: data.services[0] ? `#offer-${data.services[0].id}` : '#offers',
      },
      {
        eyebrow: '会员新客礼',
        title: data.benefits[0]?.title ?? '门店专属权益已上线',
        copy: data.benefits[0]?.description ?? '查看当前门店发布的可用权益。',
        href: '#benefits',
      },
      {
        eyebrow: '全平台比价',
        title: platformAction ? `${platformAction.title}` : '找到适合你的购买入口',
        copy: '价格、库存与最终优惠以第三方实际页面为准。',
        href: platformAction ? actionUrl(platformAction.id, 'banner_platform') : '#platforms',
      },
    ],
    [data.services, data.benefits, platformAction, data.store.id],
  );

  useEffect(() => {
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % banners.length),
      4800,
    );
    return () => window.clearInterval(timer);
  }, [banners.length]);
  const currentBanner = banners[slide] ?? banners[0]!;

  const outbound = async (outboundType: 'navigation' | 'phone', targetUrl: string) => {
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
  const consult = async (scene = 'storefront_consult') => {
    if (!consultAction) return;
    setPending(true);
    try {
      const response = await fetch(
        `${apiBase}/api/v1/consumer/stores/${data.store.id}/actions/${consultAction.id}/open?tenant=${encodeURIComponent(data.tenant.slug)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ source: sourceValue, scene, shareCode }),
        },
      );
      if (!response.ok) throw new Error('CONSULT');
      if (consultAction.targetUrl) window.location.assign(consultAction.targetUrl);
      else setNotice('咨询意向已记录，门店同事会在经营工作台中跟进。');
    } catch {
      setNotice('暂时无法记录咨询，请稍后重试。');
    } finally {
      setPending(false);
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
    } catch {
      /* user cancelled share */
    }
  };
  const shortcuts = [
    {
      label: '团购',
      icon: '◌',
      href: platformAction ? actionUrl(platformAction.id, 'shortcut_group_buy') : '#platforms',
    },
    { label: '菜单', icon: '▦', href: '#offers' },
    { label: '优惠', icon: '✦', href: '#benefits' },
    { label: '会员', icon: '♧', href: '#membership' },
    { label: '咨询', icon: '◈', onClick: () => consult('shortcut_consult') },
    { label: '导航', icon: '⌖', onClick: openNavigation, disabled: !navigationUrl },
    { label: '电话', icon: '⌁', onClick: call, disabled: !data.store.phone },
    { label: '活动', icon: '◍', href: '#updates' },
    { label: '分享', icon: '↗', onClick: share },
    { label: '更多', icon: '⋯', href: '#store-info' },
  ];
  return (
    <main id="top" className={styles.page}>
      <div className={styles.shell}>
        <h1 className={styles.visuallyHidden}>{data.store.name}</h1>
        <header className={styles.topbar}>
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
            <button
              className={styles.shareButton}
              type="button"
              onClick={share}
              aria-label="分享门店"
            >
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
          <span className={styles.openState}>
            营业中 · {data.store.businessHours ?? '以门店为准'}
          </span>
          <button
            className={styles.shareButton}
            type="button"
            onClick={share}
            aria-label="分享门店"
          >
            ↗
          </button>
        </header>

        <section className={styles.banner} aria-label="门店营销活动">
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
          <div className={styles.dots} aria-label="Banner 指示器">
            {banners.map((item, index) => (
              <button
                type="button"
                onClick={() => setSlide(index)}
                className={index === slide ? styles.dotActive : styles.dot}
                aria-label={`第 ${index + 1} 张活动`}
                key={item.title}
              />
            ))}
          </div>
        </section>

        <section className={styles.shortcutGrid} aria-label="门店快捷入口">
          {shortcuts.map((item, index) =>
            item.href ? (
              <a className={styles.shortcut} href={item.href} key={item.label}>
                <i>{item.icon ?? visual(index)}</i>
                <span>{item.label}</span>
              </a>
            ) : (
              <button
                className={styles.shortcut}
                type="button"
                onClick={item.onClick}
                disabled={item.disabled || pending}
                key={item.label}
              >
                <i>{item.icon ?? visual(index)}</i>
                <span>{item.label}</span>
              </button>
            ),
          )}
        </section>

        <section id="membership" className={styles.memberCard}>
          <div>
            <span>ONEDAY 会员</span>
            <h2>加入会员，领取门店专属权益</h2>
            <p>匿名浏览不受影响；加入意向会由门店同事跟进确认。</p>
          </div>
          <button type="button" onClick={() => consult('membership_join')} disabled={pending}>
            {pending ? '正在提交…' : '立即加入'}
          </button>
        </section>

        <Section title="今日推荐" hint="门店精选 · 到店自取" anchor="offers">
          <div className={styles.offerList}>
            {data.services.length ? (
              data.services.map((item, index) => (
                <a
                  id={`offer-${item.id}`}
                  href={`/c/services/${item.id}?tenant=${encodeURIComponent(data.tenant.slug)}&source=${encodeURIComponent(sourceValue)}`}
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
              <Empty>门店正在完善推荐内容。</Empty>
            )}
          </div>
        </Section>

        <Section title="全平台团购比价" hint="选好平台再前往下单" anchor="platforms">
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
                              {item.marketPrice
                                ? `划线价 ${money(item.marketPrice)}`
                                : '平台推荐套餐'}
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
            <Empty>门店暂未配置可跳转的平台入口。</Empty>
          )}
          <p className={styles.disclaimer}>价格、库存及最终优惠以第三方平台实际页面为准。</p>
        </Section>

        <Section title="门店活动" hint="只展示商家已发布内容" anchor="updates">
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
              <Empty>门店正在准备更多动态。</Empty>
            )}
          </div>
        </Section>

        <Section title="商圈权益" hint="国贸商圈的联合福利" anchor="benefits">
          {data.benefits.length ? (
            <div className={styles.benefitList}>
              {data.benefits.map((item, index) => (
                <article className={styles.benefit} key={item.id}>
                  <span>{index === 0 ? 'NEW' : 'PLUS'}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description ?? '以门店实际配置为准'}</p>
                  <button type="button" onClick={() => consult('benefit_view')} disabled={pending}>
                    查看使用方式
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Empty>当前暂无可领取的门店权益。</Empty>
          )}
        </Section>

        <section id="store-info" className={styles.storeInfo}>
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
            <button type="button" onClick={() => consult('store_contact_consult')}>
              ◈ 咨询
            </button>
            <button type="button" onClick={share}>
              ↗ 分享
            </button>
          </div>
        </section>
        {consultAction && (
          <div className={styles.floatingConsult}>
            <button
              type="button"
              onClick={() => consult('storefront_primary_consult')}
              disabled={pending}
            >
              {pending ? '正在记录咨询…' : consultAction.name}
            </button>
          </div>
        )}
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
      </div>
      <nav className={styles.bottomNav} aria-label="消费者主导航">
        <a className={styles.navActive} href="#top">
          <i>⌂</i>首页
        </a>
        <a href={`/c/discovery?tenant=${encodeURIComponent(data.tenant.slug)}#nearby`}>
          <i>⌖</i>附近
        </a>
        <a href={`/c/discovery?tenant=${encodeURIComponent(data.tenant.slug)}#circles`}>
          <i>◎</i>商圈
        </a>
        <a href="#benefits">
          <i>✦</i>权益
        </a>
        <a href="#membership">
          <i>♧</i>我的
        </a>
      </nav>
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
                href={`/c/stores/${store.id}?tenant=${encodeURIComponent(data.tenant.slug)}&source=${encodeURIComponent(sourceValue)}`}
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
  );
}
function Section({
  title,
  hint,
  anchor,
  children,
}: {
  title: string;
  hint: string;
  anchor: string;
  children: ReactNode;
}) {
  return (
    <section id={anchor} className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
        <a href="#top">更多 ›</a>
      </div>
      {children}
    </section>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}
