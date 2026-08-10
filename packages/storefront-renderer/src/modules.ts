import {
  SECTION_MODULE_TYPES,
  SHELL_ONLY_MODULE_TYPES,
  type NormalizedModuleType,
  type ResolvedStorefrontModule,
  type StorefrontModule,
} from './types.js';

const ALIASES: Record<string, NormalizedModuleType> = {
  hero: 'store_hero',
  action_grid: 'quick_actions',
  content: 'content_feed',
};

/** Maps legacy template aliases onto the published storefront contract. */
export function normalizeModuleType(moduleType: string): NormalizedModuleType | string {
  return ALIASES[moduleType] ?? moduleType;
}

export function isModuleVisible(config: Record<string, unknown> | undefined): boolean {
  return (config ?? {}).visible !== false;
}

/** Consumer-visible modules sorted by position (hidden configs omitted). */
export function visibleStorefrontModules(
  modules: StorefrontModule[] | undefined,
): StorefrontModule[] {
  return [...(modules ?? [])]
    .filter((item) => isModuleVisible(item.config))
    .sort((a, b) => a.position - b.position);
}

/**
 * Same visibility + sort as Consumer paint path, with hero/info fallback when
 * a published binding has no visible modules.
 */
export function effectiveStorefrontModules(
  modules: StorefrontModule[] | undefined,
): StorefrontModule[] {
  const visible = visibleStorefrontModules(modules);
  if (visible.length) return visible;
  return [
    { id: 'fallback-hero', module_type: 'store_hero', position: 1, config: {} },
    { id: 'fallback-info', module_type: 'store_info', position: 2, config: {} },
  ];
}

export function resolveStorefrontModules(
  modules: StorefrontModule[] | undefined,
): ResolvedStorefrontModule[] {
  return effectiveStorefrontModules(modules).map((item) => {
    const normalizedType = normalizeModuleType(item.module_type);
    return {
      ...item,
      normalizedType,
      visible: isModuleVisible(item.config),
    };
  });
}

export type StorefrontRenderSlot =
  | { kind: 'module'; module: ResolvedStorefrontModule }
  | { kind: 'section-batch'; key: string; modules: ResolvedStorefrontModule[] };

/**
 * Builds the same module → section-batch plan Consumer uses so Management
 * outline and Consumer paint stay on one contract.
 */
export function buildStorefrontRenderPlan(
  modules: StorefrontModule[] | undefined,
): StorefrontRenderSlot[] {
  const resolved = resolveStorefrontModules(modules);
  const slots: StorefrontRenderSlot[] = [];
  let batch: ResolvedStorefrontModule[] = [];
  const flush = (key: string) => {
    if (!batch.length) return;
    slots.push({ kind: 'section-batch', key, modules: batch });
    batch = [];
  };
  for (const module of resolved) {
    const type = module.normalizedType;
    if (SHELL_ONLY_MODULE_TYPES.has(type as NormalizedModuleType)) continue;
    if (SECTION_MODULE_TYPES.has(type as NormalizedModuleType)) {
      batch.push(module);
      continue;
    }
    flush(`sections-before-${module.id}`);
    slots.push({ kind: 'module', module });
  }
  flush('sections-tail');
  return slots;
}
