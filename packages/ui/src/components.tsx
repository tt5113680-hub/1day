import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'quiet';
  loading?: boolean;
};

export function Button({ tone = 'primary', loading = false, className, children, disabled, ...props }: ButtonProps) {
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

export function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <article className="od-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
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

export function MobileShell({ children, mode = 'consumer' }: { children: ReactNode; mode?: 'consumer' | 'employee' }) {
  return <div className={`od-mobile-shell od-mobile-shell--${mode}`}>{children}</div>;
}

export type AdminNavItem = { href: string; label: string; group?: string };

export function AdminShell({
  product,
  context,
  navigation,
  children,
}: {
  product: string;
  context: string;
  navigation: AdminNavItem[];
  children: ReactNode;
}) {
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
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <p className="od-admin-shell__context">{context}</p>
      </aside>
      <div className="od-admin-shell__main">
        <header className="od-admin-shell__topbar">
          <span>{context}</span>
          <span>ONEDAY 经营系统</span>
        </header>
        <div className="od-admin-shell__content">{children}</div>
      </div>
    </div>
  );
}
