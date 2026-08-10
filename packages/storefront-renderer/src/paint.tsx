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
