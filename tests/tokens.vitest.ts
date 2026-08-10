import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { designTokens } from '../packages/design-tokens/src/index.js';
describe('design tokens', () => {
  it('provides the canonical visual contract and its CSS projection', () => {
    const css = readFileSync(
      new URL('../packages/design-tokens/foundation.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain(`--od-brand-700: ${designTokens.color.brand};`);
    expect(css).toContain(`--od-brand-800: ${designTokens.color.brandStrong};`);
    expect(css).toContain(`--od-brand-50: ${designTokens.color.brand50};`);
    expect(css).toContain(`--od-background: ${designTokens.color.canvas};`);
    expect(css).toContain(`--od-radius-card: ${designTokens.radius.card}px;`);
    expect(designTokens.space.md).toBeGreaterThan(0);
  });
});
