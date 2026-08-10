import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AdminShell } from '../packages/ui/src/index';

describe('@oneday/ui P1-B platform shell tokens', () => {
  it('exports the shared AdminShell chrome primitive used by the Platform shell', () => {
    expect(AdminShell).toBeTypeOf('function');
  });

  it('Platform shell chrome draws its palette from foundation tokens — no raw hex', () => {
    const shellCss = readFileSync(
      new URL('../apps/platform-web/app/platform-shell.module.css', import.meta.url),
      'utf8',
    );
    const homeCss = readFileSync(
      new URL('../apps/platform-web/app/platform-product-home.module.css', import.meta.url),
      'utf8',
    );
    // Platform shell product/mode-switcher + product-home chrome stay token-driven
    // (CHARTER §1.2 no page-level hex stack, §6 design tokens + shared kit).
    expect(shellCss).toContain('var(--od-');
    expect(shellCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(homeCss).toContain('var(--od-');
    expect(homeCss).toContain('color-mix');
    expect(homeCss).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});
