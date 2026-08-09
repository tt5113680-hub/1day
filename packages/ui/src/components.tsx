import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'quiet';
  loading?: boolean;
};

export function Button({
  tone = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={['od-button', `od-button--${tone}`, className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
    >
      {loading ? '处理中…' : children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={['od-card', className].filter(Boolean).join(' ')}>{children}</section>;
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <article className="od-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="od-page-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <span>{description}</span> : null}
      </div>
      {actions ? <div className="od-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: ReactNode;
}) {
  return <span className={`od-status-badge od-status-badge--${tone}`}>{children}</span>;
}

export function AppStatePanel({
  kind,
  title,
  description,
  action,
}: {
  kind: 'loading' | 'empty' | 'error' | 'forbidden' | 'offline';
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const marks = { loading: '◌', empty: '○', error: '!', forbidden: '⌁', offline: '≈' };
  return (
    <section className={`od-state od-state--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{marks[kind]}</span>
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {action ? <div className="od-state__action">{action}</div> : null}
      </div>
    </section>
  );
}

export function MobileShell({
  children,
  controls,
  mode = 'consumer',
}: {
  children: ReactNode;
  controls?: ReactNode;
  mode?: 'consumer' | 'employee';
}) {
  return (
    <div className={`od-mobile-shell od-mobile-shell--${mode}`}>
      {controls ? <div className="od-mobile-shell__controls">{controls}</div> : null}
      {children}
    </div>
  );
}

export type AdminNavItem = { href: string; label: string; group?: string };

export function AdminShell({
  product,
  context,
  navigation,
  activeHref,
  controls,
  children,
}: {
  product: string;
  context: string;
  navigation: AdminNavItem[];
  activeHref?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  const isActive = (href: string) =>
    activeHref === href || (href !== '/' && activeHref?.startsWith(`${href}/`));
  return (
    <div className="od-admin-shell">
      <aside className="od-admin-shell__sidebar" aria-label={`${product} 主导航`}>
        <a className="od-admin-shell__brand" href={navigation[0]?.href ?? '/'}>
          <span>O</span>
          <b>ONEDAY</b>
        </a>
        <p className="od-admin-shell__product">{product}</p>
        <nav>
          {navigation.map((item) => (
            <a
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={isActive(item.href) ? 'od-admin-shell__nav-link--active' : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <p className="od-admin-shell__context">{context}</p>
      </aside>
      <div className="od-admin-shell__main">
        <header className="od-admin-shell__topbar">
          <span>{context}</span>
          <div className="od-admin-shell__topbar-end">
            <span>ONEDAY 经营系统</span>
            {controls}
          </div>
        </header>
        <div className="od-admin-shell__content">{children}</div>
      </div>
    </div>
  );
}
