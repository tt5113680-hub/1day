import { businessLabel } from '@oneday/ui';
import type { ReactNode } from 'react';
import { buildStorefrontRenderPlan, resolveStorefrontModules } from './modules.js';
import type { StorefrontModule } from './types.js';

export type StorefrontModuleOutlineProps = {
  modules: StorefrontModule[] | undefined;
  /** When true, show draft-hidden modules greyed out (Management canvas). */
  includeHidden?: boolean;
  title?: string;
  emptyLabel?: string;
  className?: string;
  /** Optional trailing actions per module (edit controls stay in the host app). */
  renderActions?: (module: StorefrontModule, index: number) => ReactNode;
  renderExtras?: (module: StorefrontModule, index: number) => ReactNode;
};

/**
 * Shared Management/Consumer outline of the storefront render plan.
 * Uses the same visibility + section-batch contract as Consumer paint.
 */
export function StorefrontModuleOutline({
  modules,
  includeHidden = false,
  title = '消费者渲染预览',
  emptyLabel = '暂无可见模块',
  className,
  renderActions,
  renderExtras,
}: StorefrontModuleOutlineProps) {
  const source = includeHidden
    ? [...(modules ?? [])].sort((a, b) => a.position - b.position)
    : resolveStorefrontModules(modules);
  const plan = includeHidden
    ? null
    : buildStorefrontRenderPlan(modules).flatMap((slot) =>
        slot.kind === 'module' ? [slot.module] : slot.modules,
      );
  const rows = includeHidden ? source : (plan ?? []);

  return (
    <section
      className={['od-sf-outline', className].filter(Boolean).join(' ')}
      data-storefront-outline="true"
      aria-label={title}
    >
      <header className="od-sf-outline__head">
        <h3>{title}</h3>
        <p>与 Consumer 使用同一 `@oneday/storefront-renderer` 排序与可见性契约。</p>
      </header>
      {!rows.length ? (
        <p className="od-sf-outline__empty">{emptyLabel}</p>
      ) : (
        <ol className="od-sf-outline__list">
          {rows.map((module, index) => {
            const hidden = module.config.visible === false;
            return (
              <li
                key={module.id}
                className={
                  hidden ? 'od-sf-outline__item od-sf-outline__item--hidden' : 'od-sf-outline__item'
                }
                data-module-type={module.module_type}
                data-module-visible={hidden ? 'false' : 'true'}
              >
                <span className="od-sf-outline__index">{index + 1}</span>
                <div className="od-sf-outline__copy">
                  <strong>{businessLabel(module.module_type)}</strong>
                  <small>{hidden ? '当前草稿隐藏' : '消费者可见模块'}</small>
                </div>
                {renderActions ? (
                  <div className="od-sf-outline__actions">{renderActions(module, index)}</div>
                ) : null}
                {renderExtras ? (
                  <div className="od-sf-outline__extras">{renderExtras(module, index)}</div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
