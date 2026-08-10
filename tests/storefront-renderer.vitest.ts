import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildStorefrontRenderPlan,
  effectiveStorefrontModules,
  normalizeModuleType,
  storefrontActionIcon,
  storefrontTokens,
  visibleStorefrontModules,
} from '../packages/storefront-renderer/src/index';
import { designTokenCssVars, designTokens } from '../packages/design-tokens/src/index';

describe('storefront-renderer module contract', () => {
  const modules = [
    { id: 'b', module_type: 'content', position: 2, config: { visible: false } },
    { id: 'a', module_type: 'hero', position: 1, config: {} },
    { id: 'c', module_type: 'service_catalog', position: 3, config: {} },
    { id: 'd', module_type: 'operating_channels', position: 4, config: { channels: ['menu'] } },
    { id: 'e', module_type: 'offer_compare', position: 5, config: {} },
  ];

  it('normalizes legacy aliases', () => {
    expect(normalizeModuleType('hero')).toBe('store_hero');
    expect(normalizeModuleType('action_grid')).toBe('quick_actions');
    expect(normalizeModuleType('content')).toBe('content_feed');
  });

  it('filters hidden modules and sorts by position', () => {
    expect(visibleStorefrontModules(modules).map((item) => item.id)).toEqual(['a', 'c', 'd', 'e']);
  });

  it('falls back to hero+info when nothing visible', () => {
    const fallback = effectiveStorefrontModules([
      { id: 'x', module_type: 'banner_carousel', position: 1, config: { visible: false } },
    ]);
    expect(fallback.map((item) => item.module_type)).toEqual(['store_hero', 'store_info']);
  });

  it('builds the same section-batch plan Consumer uses', () => {
    const plan = buildStorefrontRenderPlan(modules);
    expect(plan.map((slot) => slot.kind)).toEqual(['module', 'section-batch']);
    const batch = plan[1];
    expect(batch?.kind).toBe('section-batch');
    if (batch?.kind === 'section-batch') {
      expect(batch.modules.map((item) => item.id)).toEqual(['c', 'e']);
    }
  });
});

describe('design token completeness', () => {
  it('exposes brand-50 and mirrored CSS var names', () => {
    expect(designTokens.color.brand50).toBe('#f3f8f4');
    expect(designTokenCssVars.brand50).toBe('--od-brand-50');
    expect(designTokens.font.display).toContain('Avenir Next');
  });
});

describe('storefront visual tokens', () => {
  it('publishes restaurant palette and industry accents', () => {
    expect(storefrontTokens.accent).toBe('#b54935');
    expect(storefrontTokens.industries.beauty.accent).toBe('#7d405f');
    expect(storefrontActionIcon(0)).toBe('◌');
  });

  it('keeps Consumer store module CSS free of raw hex', () => {
    const css = readFileSync(
      new URL('../apps/consumer-web/app/c/stores/[id]/store.module.css', import.meta.url),
      'utf8',
    );
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).toContain('var(--od-sf-ink)');
    const theme = readFileSync(
      new URL('../packages/storefront-renderer/storefront.css', import.meta.url),
      'utf8',
    );
    expect(theme).toContain('--od-sf-accent:');
    expect(theme).toContain(".od-sf-theme[data-industry='beauty']");
    expect(theme).toContain('.od-sf-banner');
    expect(theme).toContain('.od-sf-shortcuts');
  });
});
