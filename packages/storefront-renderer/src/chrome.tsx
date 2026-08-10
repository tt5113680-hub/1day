import type { ReactNode } from 'react';

export const STOREFRONT_ACTION_ICONS = ['◌', '▦', '✦', '♧', '◈', '⌁', '◍', '⌖', '↗', '⋯'] as const;

export function storefrontActionIcon(index: number): string {
  return STOREFRONT_ACTION_ICONS[index] ?? '•';
}

export function StorefrontSection({
  title,
  hint,
  anchor,
  children,
  moduleType,
}: {
  title: string;
  hint: string;
  anchor: string;
  children: ReactNode;
  moduleType?: string;
}) {
  return (
    <section id={anchor} className="od-sf-section" data-module={moduleType}>
      <div className="od-sf-section__head">
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

export function StorefrontEmpty({ children }: { children: ReactNode }) {
  return <div className="od-sf-empty">{children}</div>;
}
