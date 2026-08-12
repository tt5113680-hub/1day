'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ConsumerShell,
  resolveConsumerTabs,
  storeHref,
  type ConsumerContext,
  type ConsumerTab,
} from '../../consumer-shell';
import {
  clearMemberAccess,
  fetchMemberProfile,
  fetchMemberWallet,
  readMemberAccess,
  writeMemberAccess,
  type MemberProfilePayload,
  type MemberWalletPayload,
} from '../../member-session';
import type { StoreDetail } from './store';
import styles from './channel.module.css';

type Channel = Exclude<ConsumerTab, 'home'>;
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

const money = (value: number) => `¥${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
const platformName = (platform: StoreDetail['platformOffers'][number]['platformType']) =>
  platform === 'meituan'
    ? '美团团购'
    : platform === 'douyin'
      ? '抖音团购'
      : platform === 'saabei'
        ? '扫呗平台'
        : '其他平台·外链';
const shortPlatform = (platform: StoreDetail['platformOffers'][number]['platformType']) =>
  platform === 'meituan'
    ? '美团'
    : platform === 'douyin'
      ? '抖音'
      : platform === 'saabei'
        ? '扫呗平台'
        : '外链';

const countBy = (rows: string[]) => {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    buckets.set(row, (buckets.get(row) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};
const barWidth = (total: number, value: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

export default function StoreChannel({
  data,
  context,
  channel,
}: {
  data: StoreDetail;
  context: ConsumerContext;
  channel: Channel;
}) {
  const [phone, setPhone] = useState(''),
    [consent, setConsent] = useState(false),
    [member, setMember] = useState<{
      memberCode: string;
      profileAccessId: string;
      profileAccess: string;
    } | null>(null),
    [membershipNote, setMembershipNote] = useState(''),
    [joining, setJoining] = useState(false);
  const consultAction =
    data.actions.find((item) => item.actionType === 'consultation') ??
    data.actions.find((item) => item.actionType === 'platform_entry') ??
    data.actions[0];
  const navTabs = resolveConsumerTabs(
    data.storefront?.modules,
    data.storefront?.industry?.channels,
  );
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
  const serviceDetailHref = (serviceId: string, scene: string, offerId?: string) => {
    const params = new URLSearchParams({
      tenant: context.tenant,
      source: context.source ?? 'consumer:storefront',
      scene,
      storeId: context.storeId,
    });
    if (context.shareCode) params.set('shareCode', context.shareCode);
    const base = `/c/services/${serviceId}?${params.toString()}`;
    return offerId ? `${base}#offer-${offerId}` : base;
  };
  const enroll = async () => {
    setJoining(true);
    setMembershipNote('');
    try {
      const response = await fetch(
        `${apiBase}/api/v1/consumer/memberships/enroll?tenant=${encodeURIComponent(context.tenant)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ storeId: context.storeId, phone, consent }),
        },
      );
      if (!response.ok) throw Error();
      const payload = (await response.json()).data;
      setMember(payload);
      writeMemberAccess(context.tenant, context.storeId, {
        accessId: payload.profileAccessId,
        access: payload.profileAccess,
        memberCode: payload.memberCode,
      });
      setMembershipNote(
        `入会成功。会员码 ${payload.memberCode} 已写入本机会话，可前往「我的」查看会员证明。`,
      );
    } catch {
      setMembershipNote('暂时无法完成入会，请确认手机号、授权与门店状态后重试。');
    } finally {
      setJoining(false);
    }
  };

  const title =
    channel === 'group-buy'
      ? '全平台团购'
      : channel === 'menu'
        ? '门店菜单'
        : channel === 'membership'
          ? '会员权益'
          : '我的服务';
  const heroNote =
    channel === 'group-buy'
      ? '推广员工具 · 比价聚合后前往/跳转美团/抖音/扫呗等（不在此下单）'
      : channel === 'menu'
        ? '门店套餐说明；成交经确认跳转美团/抖音/扫呗第三方（不在此下单）'
        : channel === 'membership'
          ? '本店入会与权益说明 · 推广员工具留痕；不含第三方成交'
          : '推广员工具 · 会员证明与外链入口；「我的」仅展示本店会员证明';
  const eyebrow =
    channel === 'group-buy'
      ? '推广员工具 · 比价聚合'
      : channel === 'menu'
        ? '推广员工具 · 门店套餐说明'
        : channel === 'membership'
          ? '推广员工具 · 本店会员'
          : '推广员工具 · 我的服务';
  const platformTypes = useMemo(() => {
    const set = new Set(data.platformOffers.map((item) => item.platformType));
    return [...set];
  }, [data.platformOffers]);

  const platformDist = useMemo(
    () => countBy(data.platformOffers.map((item) => shortPlatform(item.platformType))),
    [data.platformOffers],
  );
  const priceBandDist = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const offer of data.platformOffers) {
      const key =
        offer.offerPrice <= 100 ? '¥0-100' : offer.offerPrice <= 200 ? '¥100-200' : '¥200+';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort(
        (a, b) => Number(a.label.replace(/[^\d-+]/g, '')) - Number(b.label.replace(/[^\d-+]/g, '')),
      );
  }, [data.platformOffers]);
  const compareDepthDist = useMemo(
    () =>
      groups.map((group) => ({
        label:
          group.offers.length >= 3
            ? '三平台以上'
            : group.offers.length === 2
              ? '双平台比价'
              : '单平台',
        value: 1,
      })),
    [groups],
  );
  const menuTypeDist = useMemo(
    () =>
      countBy(data.services.map((service) => (service.duration_minutes ? '定时服务' : '到店自取'))),
    [data.services],
  );
  const servicePriceDist = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const service of data.services) {
      const key = service.price_label ? '已标价' : '到店询价';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.services]);
  const benefitDist = useMemo(
    () =>
      data.benefits.map((benefit) => ({
        label: benefit.title,
        value: 1,
      })),
    [data.benefits],
  );
  const profileEntryDist = useMemo(
    () => countBy(data.externalLinks.map((item) => shortPlatform(item.platformType))),
    [data.externalLinks],
  );
  const profileServiceDist = useMemo(
    () =>
      countBy(data.services.map((service) => (service.duration_minutes ? '定时服务' : '到店自取'))),
    [data.services],
  );
  const profileStoreDist = useMemo(
    () =>
      countBy([
        ...data.stores.map((store) => store.name),
        ...(data.store.name ? [data.store.name] : []),
      ]),
    [data.stores, data.store.name],
  );
  const profileStoreTotal = useMemo(
    () => data.stores.length + (data.store.name ? 1 : 0),
    [data.stores, data.store.name],
  );

  const offerCount = data.platformOffers.length;
  const groupCount = groups.length;

  return (
    <ConsumerShell context={context} active={channel} tabs={navTabs}>
      <main id="top" className={`${styles.page} ${styles.main} od-sf-theme`}>
        <div className={styles.shell}>
          <h1 className={styles.visuallyHidden}>{title}</h1>
          <header className={styles.topBar}>
            <a
              className={styles.backLink}
              href={storeHref(context, '', 'channel_back')}
              aria-label="返回门店"
            >
              ‹
            </a>
            <span className={styles.topTitle}>{title}</span>
            <span className={styles.topMark}>推广员工具</span>
          </header>

          <section className={styles.heroCard} aria-label="频道概况">
            <header className={styles.heroHead}>
              <span>
                {data.store.name} · {eyebrow}
              </span>
              <h2>{title}</h2>
              <p role="note">{heroNote}</p>
            </header>
            <div className={styles.summaryStrip} aria-label="频道数据概况">
              <dl>
                <dt>
                  {channel === 'group-buy'
                    ? '推荐套餐'
                    : channel === 'menu'
                      ? '菜单项目'
                      : channel === 'membership'
                        ? '在册权益'
                        : '会员入口'}
                </dt>
                <dd>
                  {channel === 'group-buy'
                    ? groupCount
                    : channel === 'menu'
                      ? data.services.length
                      : channel === 'membership'
                        ? data.benefits.length
                        : member
                          ? '已生效'
                          : '待入会'}
                </dd>
              </dl>
              <dl>
                <dt>
                  {channel === 'group-buy'
                    ? '比价入口'
                    : channel === 'menu'
                      ? '到店自取'
                      : channel === 'membership'
                        ? '可咨询'
                        : '外链入口'}
                </dt>
                <dd>
                  {channel === 'group-buy'
                    ? offerCount
                    : channel === 'menu'
                      ? (menuTypeDist.find((item) => item.label === '到店自取')?.value ?? 0)
                      : channel === 'membership'
                        ? consultAction
                          ? '开放'
                          : '未开放'
                        : data.externalLinks.length}
                </dd>
              </dl>
              <dl>
                <dt>
                  {channel === 'group-buy'
                    ? '覆盖平台'
                    : channel === 'menu'
                      ? '定时服务'
                      : channel === 'membership'
                        ? '覆盖门店'
                        : '服务记录'}
                </dt>
                <dd>
                  {channel === 'group-buy'
                    ? platformTypes.length
                    : channel === 'menu'
                      ? (menuTypeDist.find((item) => item.label === '定时服务')?.value ?? 0)
                      : channel === 'membership'
                        ? data.stores.length
                        : data.stores.length}
                </dd>
              </dl>
            </div>
          </section>

          {channel === 'group-buy' && (
            <section className={styles.distribution} aria-label="团购比价分布">
              <header className={styles.panelHead}>
                <h3>团购比价分布</h3>
                <p>分布由本店已抓取团购入口档案行现场推导</p>
              </header>
              <div className={styles.panelBlock}>
                <span className={styles.barLabel}>平台入口分布</span>
                <div className={styles.bars} role="list">
                  {platformDist.length ? (
                    platformDist.map((bar) => (
                      <div className={styles.barRow} role="listitem" key={bar.label}>
                        <span>{bar.label}</span>
                        <b>
                          <i style={{ width: `${barWidth(offerCount, bar.value)}%` }} />
                        </b>
                        <em>{bar.value}</em>
                      </div>
                    ))
                  ) : (
                    <span className={styles.barEmpty}>暂无记录</span>
                  )}
                </div>
              </div>
              <div className={styles.panelBlock}>
                <span className={styles.barLabel}>价格带分布</span>
                <div className={styles.bars} role="list">
                  {priceBandDist.length ? (
                    priceBandDist.map((bar) => (
                      <div className={styles.barRow} role="listitem" key={bar.label}>
                        <span>{bar.label}</span>
                        <b>
                          <i style={{ width: `${barWidth(offerCount, bar.value)}%` }} />
                        </b>
                        <em>{bar.value}</em>
                      </div>
                    ))
                  ) : (
                    <span className={styles.barEmpty}>暂无记录</span>
                  )}
                </div>
              </div>
              {compareDepthDist.length ? (
                <div className={styles.panelBlock}>
                  <span className={styles.barLabel}>每套餐比价深度</span>
                  <div className={styles.bars} role="list">
                    {compareDepthDist.map((bar, index) => (
                      <div className={styles.barRow} role="listitem" key={`${bar.label}-${index}`}>
                        <span>{bar.label}</span>
                        <b>
                          <i style={{ width: `${barWidth(groupCount, bar.value)}%` }} />
                        </b>
                        <em>{bar.value}</em>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {channel === 'menu' && (
            <section className={styles.distribution} aria-label="菜单分布">
              <header className={styles.panelHead}>
                <h3>菜单分布</h3>
                <p>分布由门店已发布菜单档案行现场推导</p>
              </header>
              <div className={styles.panelBlock}>
                <span className={styles.barLabel}>服务类型分布</span>
                <div className={styles.bars} role="list">
                  {menuTypeDist.length ? (
                    menuTypeDist.map((bar) => (
                      <div className={styles.barRow} role="listitem" key={bar.label}>
                        <span>{bar.label}</span>
                        <b>
                          <i style={{ width: `${barWidth(data.services.length, bar.value)}%` }} />
                        </b>
                        <em>{bar.value}</em>
                      </div>
                    ))
                  ) : (
                    <span className={styles.barEmpty}>暂无记录</span>
                  )}
                </div>
              </div>
              <div className={styles.panelBlock}>
                <span className={styles.barLabel}>价格说明分布</span>
                <div className={styles.bars} role="list">
                  {servicePriceDist.length ? (
                    servicePriceDist.map((bar) => (
                      <div className={styles.barRow} role="listitem" key={bar.label}>
                        <span>{bar.label}</span>
                        <b>
                          <i style={{ width: `${barWidth(data.services.length, bar.value)}%` }} />
                        </b>
                        <em>{bar.value}</em>
                      </div>
                    ))
                  ) : (
                    <span className={styles.barEmpty}>暂无记录</span>
                  )}
                </div>
              </div>
            </section>
          )}

          {channel === 'membership' && (
            <section className={styles.distribution} aria-label="权益分布">
              <header className={styles.panelHead}>
                <h3>权益分布</h3>
                <p>分布由本店已配置权益档案行现场推导</p>
              </header>
              <div className={styles.panelBlock}>
                <span className={styles.barLabel}>在册权益</span>
                <div className={styles.bars} role="list">
                  {benefitDist.length ? (
                    benefitDist.map((bar, index) => (
                      <div className={styles.barRow} role="listitem" key={`${bar.label}-${index}`}>
                        <span>{bar.label}</span>
                        <b>
                          <i style={{ width: `${barWidth(data.benefits.length, bar.value)}%` }} />
                        </b>
                        <em>{bar.value}</em>
                      </div>
                    ))
                  ) : (
                    <span className={styles.barEmpty}>暂无记录</span>
                  )}
                </div>
              </div>
            </section>
          )}

          <p className={styles.honest} role="note">
            以上分布全部由本店档案行现场推导，源 source=local；
            成交/库存/核销以美团/抖音/扫呗等第三方平台实际为准； 不包含本平台收款 · 非本平台下单。
          </p>

          {channel === 'group-buy' && (
            <section className={styles.section} aria-label="全平台团购价格">
              <p className={styles.disclaimer} role="note">
                团购频道只做比价与确认跳转；成交、库存、核销以第三方平台页面为准。不在此下单。
              </p>
              <div className={styles.quickLinks}>
                <a href={storeHref(context, '', 'group_buy_home')}>门店首页</a>
                <a href={storeHref(context, '/menu', 'group_buy_menu')}>门店菜单</a>
                <a href={storeHref(context, '/membership', 'group_buy_membership')}>会员权益</a>
              </div>
              {platformTypes.length > 0 && (
                <ul className={styles.platformLegend} aria-label="已配置平台">
                  {platformTypes.map((platform) => (
                    <li key={platform}>
                      <span className={`${styles.platformBadge} ${styles[`platform${platform}`]}`}>
                        {platform === 'meituan'
                          ? '团'
                          : platform === 'douyin'
                            ? '抖'
                            : platform === 'saabei'
                              ? '扫'
                              : '选'}
                      </span>
                      {platformName(platform)}
                    </li>
                  ))}
                </ul>
              )}
              {groups.length ? (
                groups.map((group) => {
                  const serviceId = group.offers[0]?.serviceId;
                  const lowest = Math.min(...group.offers.map((item) => item.offerPrice));
                  return (
                    <article className={styles.package} key={group.name}>
                      <header>
                        <span>门店推荐套餐 · 外链比价</span>
                        {serviceId ? (
                          <a
                            className={styles.packageTitle}
                            href={serviceDetailHref(serviceId, 'group_buy_package_detail')}
                          >
                            <strong>{group.name}</strong>
                            <small>查看套餐详情 ›</small>
                          </a>
                        ) : (
                          <strong>{group.name}</strong>
                        )}
                        {group.price && <small>门店参考价 {group.price}</small>}
                      </header>
                      {group.offers.map((offer) => (
                        <a
                          className={styles.platformRow}
                          href={serviceDetailHref(
                            offer.serviceId,
                            'group_buy_offer_detail',
                            offer.offerId,
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
                                : offer.platformType === 'saabei'
                                  ? '扫'
                                  : '选'}
                          </span>
                          <span>
                            <strong>{offer.title || platformName(offer.platformType)}</strong>
                            <small>
                              {offer.marketPrice
                                ? `划线价 ${money(offer.marketPrice)} · 查看套餐详情`
                                : '平台套餐 · 查看套餐详情'}
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
            </section>
          )}

          {channel === 'menu' && (
            <section className={styles.section} aria-label="门店菜单">
              <p className={styles.disclaimer} role="note">
                菜单频道展示门店已发布套餐说明；下单请经确认页前往美团/抖音/扫呗等，不在此下单。
              </p>
              <div className={styles.quickLinks}>
                <a href={storeHref(context, '', 'menu_home')}>门店首页</a>
                <a href={storeHref(context, '/group-buy', 'menu_group_buy')}>全平台团购</a>
                <a href={storeHref(context, '/membership', 'menu_membership')}>会员权益</a>
              </div>
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
                      <em>{index === 0 ? '门店推荐 · 可进详情' : '到店自取 · 可进详情'}</em>
                      <strong>{service.name}</strong>
                      <p>
                        {service.description ?? '查看套餐内容与使用规则；成交以第三方平台为准。'}
                      </p>
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
              <p className={styles.disclaimer}>本页不含支付金额。</p>
            </section>
          )}

          {channel === 'membership' && (
            <section className={styles.stack} aria-label="会员权益">
              <div className={styles.quickLinks}>
                <a href={storeHref(context, '/profile', 'membership_profile')}>我的会员</a>
                <a href={storeHref(context, '/group-buy', 'membership_group_buy')}>全平台团购</a>
                <a href={storeHref(context, '', 'membership_home')}>门店首页</a>
              </div>
              <article className={styles.memberHero}>
                <span>本店会员 · 推广员工具</span>
                <h2>加入会员，获取本店专属服务</h2>
                <p>
                  提交手机号与隐私授权后生成本店会员身份；入会成功后可在「我的」查看会员证明。不替代美团/抖音/扫呗会员，痕迹仅留观看/访问/入会，不含支付金额。
                </p>
                <label>
                  手机号
                  <input
                    aria-label="入会手机号"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="用于生成本店会员身份"
                  />
                </label>
                <label>
                  <input
                    aria-label="同意会员隐私授权"
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />{' '}
                  我同意门店为会员服务处理手机号。
                </label>
                <button disabled={joining || !consent} onClick={() => void enroll()}>
                  {joining ? '正在入会' : '确认加入会员'}
                </button>
                {membershipNote && <p role="status">{membershipNote}</p>}
                {member && (
                  <>
                    <small>会员凭证仅在本设备当前会话展示；会员码：{member.memberCode}</small>
                    <a
                      className={styles.profileLink}
                      href={storeHref(context, '/profile', 'membership_ready')}
                    >
                      <span>我的会员</span>
                      <b>查看会员证明 ›</b>
                    </a>
                  </>
                )}
              </article>
              {data.benefits.length ? (
                data.benefits.map((benefit) => (
                  <article className={styles.benefit} key={benefit.id}>
                    <span>门店权益 · 可咨询</span>
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
            <>
              <section className={styles.distribution} aria-label="我的服务分布">
                <header className={styles.panelHead}>
                  <h3>我的服务分布</h3>
                  <p>分布全部由本店已抓取档案行现场推导 · 仅统计入口与到店服务痕迹</p>
                </header>
                <div className={styles.panelBlock}>
                  <span className={styles.barLabel}>入口类型分布</span>
                  <div className={styles.bars} role="list">
                    {profileEntryDist.length ? (
                      profileEntryDist.map((bar) => (
                        <div className={styles.barRow} role="listitem" key={bar.label}>
                          <span>{bar.label}</span>
                          <b>
                            <i
                              style={{
                                width: `${barWidth(data.externalLinks.length, bar.value)}%`,
                              }}
                            />
                          </b>
                          <em>{bar.value}</em>
                        </div>
                      ))
                    ) : (
                      <span className={styles.barEmpty}>暂无外链入口记录</span>
                    )}
                  </div>
                </div>
                <div className={styles.panelBlock}>
                  <span className={styles.barLabel}>菜单服务类型分布</span>
                  <div className={styles.bars} role="list">
                    {profileServiceDist.length ? (
                      profileServiceDist.map((bar) => (
                        <div className={styles.barRow} role="listitem" key={bar.label}>
                          <span>{bar.label}</span>
                          <b>
                            <i style={{ width: `${barWidth(data.services.length, bar.value)}%` }} />
                          </b>
                          <em>{bar.value}</em>
                        </div>
                      ))
                    ) : (
                      <span className={styles.barEmpty}>暂无菜单服务记录</span>
                    )}
                  </div>
                </div>
                <div className={styles.panelBlock}>
                  <span className={styles.barLabel}>门店服务覆盖分布</span>
                  <div className={styles.bars} role="list">
                    {profileStoreDist.length ? (
                      profileStoreDist.map((bar) => (
                        <div className={styles.barRow} role="listitem" key={bar.label}>
                          <span>{bar.label}</span>
                          <b>
                            <i style={{ width: `${barWidth(profileStoreTotal, bar.value)}%` }} />
                          </b>
                          <em>{bar.value}</em>
                        </div>
                      ))
                    ) : (
                      <span className={styles.barEmpty}>暂无门店记录</span>
                    )}
                  </div>
                </div>
              </section>
              <div className={styles.quickLinks}>
                <a href={storeHref(context, '', 'profile_home')}>门店首页</a>
                <a href={storeHref(context, '/membership', 'profile_tab_membership')}>会员权益</a>
                <a href={storeHref(context, '/group-buy', 'profile_tab_group_buy')}>全平台团购</a>
              </div>
              <MemberProfileChannel
                context={context}
                consultActionId={consultAction?.id}
                actionHref={actionHref}
              />
            </>
          )}
        </div>
      </main>
    </ConsumerShell>
  );
}

function MemberProfileChannel({
  context,
  consultActionId,
  actionHref,
}: {
  context: ConsumerContext;
  consultActionId?: string;
  actionHref: (actionId: string, scene: string, returnTo: string) => string;
}) {
  const [state, setState] = useState<'loading' | 'anonymous' | 'ready' | 'forbidden' | 'error'>(
    'loading',
  );
  const [wallet, setWallet] = useState<MemberWalletPayload | null>(null);
  const [profile, setProfile] = useState<MemberProfilePayload | null>(null);
  const [accessId, setAccessId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [resumePhone, setResumePhone] = useState('');
  const [resumeCode, setResumeCode] = useState('');
  const [resumeConsent, setResumeConsent] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [resumeNote, setResumeNote] = useState('');
  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const access = readMemberAccess(context.tenant, context.storeId);
      if (!access) {
        if (!cancelled) setState('anonymous');
        return;
      }
      try {
        const [walletResult, profileResult] = await Promise.all([
          fetchMemberWallet(apiBase, context.tenant, access),
          fetchMemberProfile(apiBase, context.tenant, access),
        ]);
        if (walletResult.status === 404 || profileResult.status === 404) {
          clearMemberAccess(context.tenant, context.storeId);
          if (!cancelled) setState('forbidden');
          return;
        }
        if (!walletResult.data || !profileResult.data) throw Error();
        if (!cancelled) {
          setAccessId(access.accessId);
          setAccessToken(access.access);
          setWallet(walletResult.data);
          setProfile(profileResult.data);
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
  }, [context.storeId, context.tenant, sessionTick]);

  const resume = async () => {
    setResuming(true);
    setResumeNote('');
    try {
      const response = await fetch(
        `${apiBase}/api/v1/consumer/memberships/resume?tenant=${encodeURIComponent(context.tenant)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({
            storeId: context.storeId,
            phone: resumePhone,
            memberCode: resumeCode,
            consent: resumeConsent,
          }),
        },
      );
      if (!response.ok) throw Error();
      const payload = (await response.json()).data as {
        memberCode: string;
        profileAccessId: string;
        profileAccess: string;
      };
      writeMemberAccess(context.tenant, context.storeId, {
        accessId: payload.profileAccessId,
        access: payload.profileAccess,
        memberCode: payload.memberCode,
      });
      setResumeNote(`恢复成功。会员码 ${payload.memberCode} 已写入本机会话。`);
      setState('loading');
      setSessionTick((value) => value + 1);
    } catch {
      setResumeNote('无法恢复会员。请确认手机号、会员码与授权后重试（本阶段不支持短信验证码）。');
    } finally {
      setResuming(false);
    }
  };

  if (state === 'loading') {
    return (
      <section className={styles.stack} aria-label="我的会员" aria-busy="true">
        <Empty>正在核对会员会话…</Empty>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className={styles.stack} aria-label="我的会员">
        <article className={styles.profileHero}>
          <span>我的会员</span>
          <h2>暂时无法读取会员资料</h2>
          <p>网络或门店服务不稳定，请稍后重试。匿名浏览不会展示隐私字段。</p>
        </article>
      </section>
    );
  }

  if (state === 'anonymous' || state === 'forbidden') {
    return (
      <section className={styles.stack} aria-label="我的服务">
        <article className={styles.profileHero} data-member-state={state}>
          <span>我的服务 · 推广员入口</span>
          <h2>{state === 'forbidden' ? '会员授权已失效' : '尚未完成本店入会'}</h2>
          <p>
            {state === 'forbidden'
              ? '当前会话无法证明会员身份；可用手机号与会员码在本设备恢复，或重新入会。'
              : '为保护隐私，未授权时不会展示手机号、会员码或个人资料。团购成交在美团/抖音/扫呗等第三方完成。'}
          </p>
        </article>
        <article
          className={styles.resumeCard}
          data-testid="member-resume-card"
          aria-label="跨设备恢复会员"
        >
          <span>跨设备恢复</span>
          <h2>用手机号与会员码恢复本店会员</h2>
          <p>需已存在入会记录；本阶段不发送短信验证码，仅校验手机号、12 位会员码与授权同意。</p>
          <label>
            手机号
            <input
              aria-label="恢复会员手机号"
              inputMode="tel"
              value={resumePhone}
              onChange={(event) => setResumePhone(event.target.value)}
              placeholder="入会时使用的手机号"
            />
          </label>
          <label>
            会员码
            <input
              aria-label="恢复会员码"
              value={resumeCode}
              onChange={(event) => setResumeCode(event.target.value)}
              placeholder="12 位会员码"
              autoComplete="off"
            />
          </label>
          <label>
            <input
              aria-label="同意恢复会员隐私授权"
              type="checkbox"
              checked={resumeConsent}
              onChange={(event) => setResumeConsent(event.target.checked)}
            />{' '}
            我同意门店为恢复会员会话处理手机号。
          </label>
          <button
            type="button"
            data-testid="member-resume-submit"
            disabled={resuming || !resumeConsent}
            onClick={() => void resume()}
          >
            {resuming ? '正在恢复' : '恢复本店会员'}
          </button>
          {resumeNote ? (
            <p role="status" data-testid="member-resume-status">
              {resumeNote}
            </p>
          ) : null}
        </article>
        <a
          className={styles.profileLink}
          href={storeHref(context, '/membership', 'profile_membership')}
          data-testid="member-enroll-cta"
        >
          <span>会员入会</span>
          <b>完成本店入会并授权 ›</b>
        </a>
        <a
          className={styles.profileLink}
          href={storeHref(context, '/group-buy', 'profile_group_buy')}
        >
          <span>全平台团购</span>
          <b>比价后经确认页跳转 ›</b>
        </a>
        <a
          className={styles.profileLink}
          href={`/c/circles?tenant=${encodeURIComponent(context.tenant)}`}
        >
          <span>商圈联盟</span>
          <b>附近商圈 · 进圈找店 ›</b>
        </a>
        <a
          className={styles.profileLink}
          href={`/c/entry?tenant=${encodeURIComponent(context.tenant)}`}
        >
          <span>统一入口</span>
          <b>返回经营首页 ›</b>
        </a>
        {consultActionId ? (
          <a
            className={styles.profileButton}
            href={actionHref(
              consultActionId,
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
    );
  }

  const phoneIdentity = profile?.profile.identities.find((item) => item.type === 'phone');
  const privacyHref =
    accessId && accessToken
      ? `/c/profile?tenant=${encodeURIComponent(context.tenant)}&profile=${encodeURIComponent(accessId)}&access=${encodeURIComponent(accessToken)}`
      : storeHref(context, '/membership', 'profile_privacy');

  return (
    <section className={styles.stack} aria-label="我的会员" data-member-state="ready">
      <article className={styles.profileHero}>
        <span>我的会员 · 推广员入口</span>
        <h2>{profile?.profile.displayName || '本店会员'}</h2>
        <p role="status" data-testid="member-proof">
          已证明本店会员身份。会员码 {wallet?.memberCode}
          {phoneIdentity ? ` · ${phoneIdentity.maskedValue}` : ''}
        </p>
        <p className={styles.profileHint}>
          本页展示入会证明与权益余额；第三方团购成交不在此履约，非本平台下单。
        </p>
      </article>
      <article className={styles.benefit} aria-label="会员钱包余额">
        <span>{wallet?.tier || 'MEMBER'}</span>
        <h2>权益余额</h2>
        {wallet?.benefits.length ? (
          wallet.benefits.map((item) => (
            <p key={item.id}>
              {item.title} · 余额 {item.balance}
            </p>
          ))
        ) : (
          <p>门店尚未发放可核销权益；到店时可出示会员码。</p>
        )}
      </article>
      {profile?.history.length ? (
        <article className={styles.benefit} aria-label="最近服务记录">
          <span>门店服务痕迹</span>
          <h2>最近到店服务记录</h2>
          <p className={styles.profileHint}>
            以下为门店侧服务痕迹，不代表美团/抖音/扫呗等第三方订单。
          </p>
          {profile.history.slice(0, 3).map((item) => (
            <p key={item.orderNumber}>
              {item.orderNumber} · {item.status}
            </p>
          ))}
        </article>
      ) : null}
      <a className={styles.profileLink} href={privacyHref} data-testid="member-privacy-link">
        <span>隐私授权</span>
        <b>查看授权状态或撤回同意 ›</b>
      </a>
      <a
        className={styles.profileLink}
        href={storeHref(context, '/membership', 'profile_membership')}
      >
        <span>会员权益说明</span>
        <b>查看本店可用权益 ›</b>
      </a>
      <a
        className={styles.profileLink}
        href={storeHref(context, '/group-buy', 'profile_group_buy_member')}
      >
        <span>全平台团购</span>
        <b>比价后经确认页跳转 ›</b>
      </a>
    </section>
  );
}

function Empty({ children }: { children: string }) {
  return <div className={styles.empty}>{children}</div>;
}
