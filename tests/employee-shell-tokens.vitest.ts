import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EmployeeWorkNav } from '../packages/ui/src/index';

describe('@oneday/ui P1-B employee shell tokens', () => {
  it('exports a shared EmployeeWorkNav chrome primitive', () => {
    expect(EmployeeWorkNav).toBeTypeOf('function');
  });

  it('projects .od-employee-nav* primitives into the shared design-token stylesheet via tokens', () => {
    const css = readFileSync(
      new URL('../packages/design-tokens/foundation.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain('.od-employee-nav--bottom');
    expect(css).toContain('.od-employee-nav--desktop');
    expect(css).toContain('.od-employee-nav__link--active');
    expect(css).toContain('.od-employee-nav__context');
    // New employee-nav chrome derives all colour from foundation tokens — no raw hex.
    const navCss = css.split('.od-employee-nav--bottom {')[1];
    expect(navCss).toBeTruthy();
    expect(navCss).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});
