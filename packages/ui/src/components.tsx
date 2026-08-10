import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

/** Dense, scannable admin table column (CHARTER §2 data density; maps to UI-01/UI-02). */
export type TableColumn<T> = {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  render?: (row: T) => ReactNode;
};

export type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  'data-testid'?: string;
};

/** Shared dense list/table for Management/Platform so dense views converge on the design system. */
export function Table<T>({ columns, rows, rowKey, empty, ...rest }: TableProps<T>) {
  const cell = (row: T, col: TableColumn<T>) =>
    col.render ? col.render(row) : (row as Record<string, ReactNode>)[col.key];
  return (
    <div className="od-table" {...rest}>
      <table className="od-table__grid">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                className={`od-table__head od-table__head--${col.align ?? 'left'}`}
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                scope="col"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td
                  className={`od-table__cell od-table__cell--${col.align ?? 'left'}`}
                  key={col.key}
                >
                  {cell(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && empty ? <div className="od-table__empty">{empty}</div> : null}
    </div>
  );
}

/** A single Employee menu link consumed by the shared work-nav chrome (menu DTO driven, CHARTER §7.1). */
export type EmployeeNavItem = {
  key: string;
  href: string;
  label: string;
  group?: string;
};

/**
 * Shared Employee navigation chrome (mobile bottom tabs + desktop sidebar).
 * Driven entirely by `var(--od-*)` foundation tokens via `.od-employee-nav*`
 * primitives so the Employee Work shell draws from ONE design-token palette and
 * does not carry per-page raw hex (CHARTER §1.2 no page-level hex patches, §6 tokens + shared kit).
 */
export function EmployeeWorkNav({
  items,
  activeKey,
  context,
  mode = '员工工作台',
  storeManagerMode = false,
  ariaLabelMobile = '员工工作导航',
  ariaLabelDesktop = '员工桌面导航',
}: {
  items: EmployeeNavItem[];
  activeKey?: string;
  context?: string;
  mode?: string;
  storeManagerMode?: boolean;
  ariaLabelMobile?: string;
  ariaLabelDesktop?: string;
}) {
  const renderLinks = (surface: 'mobile' | 'desktop') =>
    items.map((item) => (
      <a
        aria-current={item.key === activeKey ? 'page' : undefined}
        className={
          item.key === activeKey
            ? `od-employee-nav__link od-employee-nav__link--active od-employee-nav__link--${surface}`
            : `od-employee-nav__link od-employee-nav__link--${surface}`
        }
        href={item.href}
        key={`${surface}-${item.key}`}
      >
        {item.label}
      </a>
    ));

  return (
    <>
      <nav className="od-employee-nav od-employee-nav--bottom" aria-label={ariaLabelMobile}>
        {renderLinks('mobile')}
      </nav>
      <aside className="od-employee-nav od-employee-nav--desktop" aria-label={ariaLabelDesktop}>
        <p className="od-employee-nav__brand">ONEDAY 员工</p>
        <p className="od-employee-nav__mode">
          {storeManagerMode ? '店长模式' : mode}
        </p>
        <nav className="od-employee-nav__list">{renderLinks('desktop')}</nav>
        {context ? <p className="od-employee-nav__context">{context}</p> : null}
      </aside>
    </>
  );
}

export type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  'data-testid'?: string;
};

/** Accessible confirmation/detail dialog for write feedback (CHARTER §2 feedback; maps to UI-03). */
export function Modal({ open, title, onClose, children, footer, ...rest }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="od-modal__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="od-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="od-modal-title"
        {...rest}
      >
        <header className="od-modal__header">
          <h2 id="od-modal-title">{title}</h2>
          <button type="button" className="od-modal__close" aria-label="关闭弹窗" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="od-modal__body">{children}</div>
        {footer ? <footer className="od-modal__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

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

export function FormField({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="od-field" htmlFor={htmlFor}>
      <span className="od-field__label">{label}</span>
      {children}
      {hint && !error ? <small className="od-field__hint">{hint}</small> : null}
      {error ? (
        <small className="od-field__error" role="alert">
          {error}
        </small>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={['od-input', className].filter(Boolean).join(' ')} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={['od-select', className].filter(Boolean).join(' ')}>
      {children}
    </select>
  );
}

export function Skeleton({
  width = '100%',
  height = 16,
  className,
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
}) {
  return (
    <span
      className={['od-skeleton', className].filter(Boolean).join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
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
  const groups: Array<{ key: string; label: string | null; items: AdminNavItem[] }> = [];
  for (const item of navigation) {
    const key = item.group ?? '';
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
      continue;
    }
    groups.push({
      key,
      label: key || null,
      items: [item],
    });
  }
  const groupTitle = (key: string) => {
    const labels: Record<string, string> = {
      operate: '经营运营',
      commerce: '门店与商品',
      people: '组织与权限',
      intents: '能力边界',
      govern: '平台治理',
      network: '渠道与商圈',
      store_manager: '店长经营',
    };
    return labels[key] ?? key;
  };
  return (
    <div className="od-admin-shell">
      <aside className="od-admin-shell__sidebar" aria-label={`${product} 主导航`}>
        <a className="od-admin-shell__brand" href={navigation[0]?.href ?? '/'}>
          <span>O</span>
          <b>ONEDAY</b>
        </a>
        <p className="od-admin-shell__product">{product}</p>
        <nav>
          {groups.map((group) => (
            <div className="od-admin-shell__nav-group" key={`${group.key}-${group.items[0]?.href}`}>
              {group.label ? (
                <p className="od-admin-shell__nav-group-label">{groupTitle(group.key)}</p>
              ) : null}
              {group.items.map((item) => (
                <a
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={isActive(item.href) ? 'od-admin-shell__nav-link--active' : undefined}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
            </div>
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
