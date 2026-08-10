import { describe, expect, it } from 'vitest';
import { mergeStoreScopes, storeScopeAllows } from '../packages/contracts/src/data-scope';

describe('data scope helpers', () => {
  it('denies store access when no store scopes are present', () => {
    expect(storeScopeAllows([], 'store-1')).toBe(false);
    expect(storeScopeAllows([{ type: 'tenant', id: 't1' }], 'store-1')).toBe(false);
  });

  it('allows only listed store scopes', () => {
    expect(
      storeScopeAllows(
        [
          { type: 'store', id: 'a' },
          { type: 'store', id: 'b' },
        ],
        'b',
      ),
    ).toBe(true);
    expect(storeScopeAllows([{ type: 'store', id: 'a' }], 'b')).toBe(false);
  });

  it('merges store scopes preferring richer labels', () => {
    const merged = mergeStoreScopes(
      [{ type: 'store', id: 'a', label: 'a' }],
      [{ type: 'store', id: 'a', label: '国贸店' }, { type: 'store', id: 'b', label: '中关村店' }],
    );
    expect(merged).toEqual([
      { type: 'store', id: 'a', label: '国贸店' },
      { type: 'store', id: 'b', label: '中关村店' },
    ]);
  });
});
