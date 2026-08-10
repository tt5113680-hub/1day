'use client';

import { useEffect, useState } from 'react';

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
