import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ConsumerStorefrontNav, storefrontTokens } from '../packages/storefront-renderer/src/index';

describe('@oneday/storefront-renderer P1-B consumer shell tokens', () => {
  it('exports a shared ConsumerStorefrontNav chrome primitive', () => {
    expect(ConsumerStorefrontNav).toBeTypeOf('function');
  });

  it('defines a token-driven nav palette with no raw-hex app-level copies', () => {
    const nav = storefrontTokens.nav;
    expect(nav.inactive).toBeTruthy();
    expect(nav.accent).toBeTruthy();
    expect(nav.activeIconBg).toBe(nav.accent);
    expect(nav.invertText).toBeTruthy();
  });

  it('projects .od-consumer-nav* primitives into the shared storefront stylesheet via tokens', () => {
    const css = readFileSync(
      new URL('../packages/storefront-renderer/storefront.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain('.od-consumer-nav--bottom');
    expect(css).toContain('.od-consumer-nav--desktop');
    expect(css).toContain('.od-consumer-nav__link--active');
    // Nav chrome stays on the storefront token system — no raw hex in the new primitives.
    const navCss = css.split('.od-consumer-nav {').pop() ?? '';
    expect(navCss).toContain('.od-consumer-nav--bottom');
    expect(navCss).toContain('.od-consumer-nav--desktop');
    expect(navCss).toContain('var(--od-sf-');
    expect(navCss).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});
