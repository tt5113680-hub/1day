import { describe, expect, it } from 'vitest';
import { designTokens } from '../packages/design-tokens/src/index.js';
describe('design tokens', () => {
  it('provides the shared visual contract', () => {
    expect(designTokens.color.brand).toMatch(/^#/);
    expect(designTokens.space.md).toBeGreaterThan(0);
  });
});
