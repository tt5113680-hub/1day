'use client';

import { useEffect, useState } from 'react';
import { storefrontActionIcon } from './chrome.js';

export type StorefrontBannerSlide = {
  eyebrow: string;
  title: string;
  copy: string;
  href: string;
};

export function StorefrontBannerCarousel({
  slides,
  imageUrl,
  intervalMs = 4800,
}: {
  slides: StorefrontBannerSlide[];
  imageUrl?: string | null;
  intervalMs?: number;
}) {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % slides.length),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [slides.length, intervalMs]);
  if (!slides.length) return null;
  const current = slides[slide] ?? slides[0]!;
  return (
    <section className="od-sf-banner" aria-label="门店营销活动" data-module="banner_carousel">
      {imageUrl ? <img src={imageUrl} alt="" className="od-sf-banner__image" /> : null}
      <div className="od-sf-banner__shade" />
      <div className="od-sf-banner__copy">
        <p>{current.eyebrow}</p>
        <h1>{current.title}</h1>
        <span>{current.copy}</span>
        <a href={current.href}>
          立即查看 <b>→</b>
        </a>
      </div>
      {slides.length > 1 ? (
        <div className="od-sf-banner__dots" aria-label="Banner 指示器">
          {slides.map((item, index) => (
            <button
              type="button"
              onClick={() => setSlide(index)}
              className={
                index === slide ? 'od-sf-banner__dot od-sf-banner__dot--active' : 'od-sf-banner__dot'
              }
              aria-label={`第 ${index + 1} 张活动`}
              key={`${item.title}-${index}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export type StorefrontQuickActionItem = {
  label: string;
  icon?: string;
  href?: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
};

export function StorefrontQuickActions({ items }: { items: StorefrontQuickActionItem[] }) {
  if (!items.length) return null;
  return (
    <section className="od-sf-shortcuts" aria-label="门店快捷入口" data-module="quick_actions">
      {items.map((item, index) =>
        item.href ? (
          <a className="od-sf-shortcut" href={item.href} key={`${item.label}-${index}`}>
            <i>{item.icon ?? storefrontActionIcon(index)}</i>
            <span>{item.label}</span>
          </a>
        ) : (
          <button
            className="od-sf-shortcut"
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            key={`${item.label}-${index}`}
          >
            <i>{item.icon ?? storefrontActionIcon(index)}</i>
            <span>{item.label}</span>
          </button>
        ),
      )}
    </section>
  );
}

export type StorefrontMemberCardProps = {
  eyebrow?: string;
  title: string;
  copy: string;
  ctaHref: string;
  ctaLabel?: string;
};

export function StorefrontMemberCard({
  eyebrow = 'ONEDAY 会员',
  title,
  copy,
  ctaHref,
  ctaLabel = '立即加入',
}: StorefrontMemberCardProps) {
  return (
    <section id="membership" className="od-sf-member">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <a href={ctaHref}>{ctaLabel}</a>
    </section>
  );
}

export type StorefrontOfferItem = {
  id: string;
  href: string;
  title: string;
  description: string;
  meta: string;
  cta: string;
  eyebrow?: string;
  imageUrl?: string | null;
  imagePosition?: string;
};

export function StorefrontOfferList({ items }: { items: StorefrontOfferItem[] }) {
  if (!items.length) return null;
  return (
    <div className="od-sf-offers">
      {items.map((item) => (
        <a id={`offer-${item.id}`} href={item.href} className="od-sf-offer" key={item.id}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
            />
          ) : null}
          <span className="od-sf-offer__body">
            {item.eyebrow ? <em>{item.eyebrow}</em> : null}
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            <small>{item.meta}</small>
            <b>
              {item.cta} <i>›</i>
            </b>
          </span>
        </a>
      ))}
    </div>
  );
}

export type StorefrontPlatformMark = 'meituan' | 'douyin' | 'external' | string;

export function storefrontPlatformGlyph(platformType: StorefrontPlatformMark) {
  if (platformType === 'meituan') return '团';
  if (platformType === 'douyin') return '抖';
  return '荐';
}

export type StorefrontComparePriceRow = {
  key: string;
  href: string;
  platformType: StorefrontPlatformMark;
  title: string;
  meta: string;
  priceLabel: string;
  lowest?: boolean;
};

export type StorefrontComparePackage = {
  key: string;
  serviceName: string;
  servicePriceLabel?: string | null;
  rows: StorefrontComparePriceRow[];
};

export type StorefrontPlatformLinkItem = {
  key: string;
  href: string;
  platformType: StorefrontPlatformMark;
  title: string;
  description: string;
  cta: string;
};

export function StorefrontOfferCompare({
  packages,
  links = [],
  disclaimer = '价格、库存及最终优惠以第三方平台实际页面为准。',
}: {
  packages: StorefrontComparePackage[];
  links?: StorefrontPlatformLinkItem[];
  disclaimer?: string;
}) {
  const empty = !packages.length && !links.length;
  if (empty) return null;
  return (
    <>
      {packages.map((group) => (
        <article className="od-sf-compare" key={group.key}>
          <header>
            <span>门店推荐套餐</span>
            <strong>{group.serviceName}</strong>
            {group.servicePriceLabel ? <small>门店标价 {group.servicePriceLabel}</small> : null}
          </header>
          <div className="od-sf-compare__rows">
            {group.rows.map((item) => (
              <a className="od-sf-compare__row" href={item.href} key={item.key}>
                <span
                  className={`od-sf-platform-mark od-sf-platform-mark--${item.platformType === 'meituan' || item.platformType === 'douyin' ? item.platformType : 'external'}`}
                >
                  {storefrontPlatformGlyph(item.platformType)}
                </span>
                <span className="od-sf-compare__platform">
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </span>
                <b className="od-sf-compare__price">
                  {item.lowest ? <em>当前低价</em> : null}
                  {item.priceLabel}
                </b>
              </a>
            ))}
          </div>
        </article>
      ))}
      {!packages.length && links.length ? (
        <div className="od-sf-platform-links">
          {links.map((item) => (
            <a className="od-sf-platform-link" href={item.href} key={item.key}>
              <span
                className={`od-sf-platform-mark od-sf-platform-mark--${item.platformType === 'meituan' || item.platformType === 'douyin' ? item.platformType : 'external'}`}
              >
                {storefrontPlatformGlyph(item.platformType)}
              </span>
              <span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </span>
              <b>
                {item.cta} <i>›</i>
              </b>
            </a>
          ))}
        </div>
      ) : null}
      {disclaimer ? <p className="od-sf-disclaimer">{disclaimer}</p> : null}
    </>
  );
}

export type StorefrontStoryItem = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  meta?: string;
  imageUrl?: string | null;
  imagePosition?: string;
};

export function StorefrontStoryList({ items }: { items: StorefrontStoryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="od-sf-stories">
      {items.map((item) => (
        <article className="od-sf-story" key={item.id}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
            />
          ) : null}
          <span>
            <em>{item.eyebrow}</em>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            {item.meta ? <small>{item.meta}</small> : null}
          </span>
        </article>
      ))}
    </div>
  );
}

export type StorefrontBenefitItem = {
  key: string;
  badge: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  ctaFallback?: string;
};

export function StorefrontBenefitList({ items }: { items: StorefrontBenefitItem[] }) {
  if (!items.length) return null;
  return (
    <div className="od-sf-benefits">
      {items.map((item) => (
        <article className="od-sf-benefit" key={item.key}>
          <span>{item.badge}</span>
          <strong>{item.title}</strong>
          <p>{item.description}</p>
          {item.href ? (
            <a href={item.href}>{item.ctaLabel ?? '查看使用方式'}</a>
          ) : item.ctaFallback ? (
            <span className="od-sf-benefit__cta">{item.ctaFallback}</span>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export type StorefrontStoreInfoAction = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void | Promise<void>;
};

export function StorefrontStoreInfo({
  address,
  hours,
  actions,
}: {
  address: string;
  hours: string;
  actions: StorefrontStoreInfoAction[];
}) {
  return (
    <section id="store-info" className="od-sf-store-info" data-module="store_info">
      <p>门店位置</p>
      <h2>{address}</h2>
      <span>{hours}</span>
      {actions.length ? (
        <div>
          {actions.map((action) =>
            action.href ? (
              <a href={action.href} key={action.key}>
                {action.label}
              </a>
            ) : (
              <button type="button" onClick={action.onClick} key={action.key}>
                {action.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
