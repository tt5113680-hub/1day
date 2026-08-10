import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AdminShell } from '../packages/ui/src/index';

describe('@oneday/ui P1-B admin shell tokens', () => {
  it('exports a shared AdminShell chrome primitive', () => {
    expect(AdminShell).toBeTypeOf('function');
  });

  it('projects .od-admin-shell* primitives into the shared design-token stylesheet via tokens', () => {
    const css = readFileSync(
      new URL('../packages/design-tokens/foundation.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain('.od-admin-shell');
    expect(css).toContain('.od-admin-shell__sidebar');
    expect(css).toContain('.od-admin-shell__nav-link--active');
    expect(css).toContain('.od-admin-shell__topbar');
    // Shared Management/Platform AdminShell chrome derives all colour from foundation
    // tokens / color-mix — no raw hex in the chrome block (CHARTER §1.2, §6).
    const start = css.indexOf('.od-admin-shell {');
    const end = css.indexOf('.od-route-state,');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const shellCss = css.slice(start, end);
    expect(shellCss).toMatch(/var\(--od-/);
    expect(shellCss).toContain('color-mix');
    expect(shellCss).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});
