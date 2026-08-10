import { describe, expect, it } from 'vitest';
import {
  mergeNetworkScopes,
  mergeStoreScopes,
  networkListFilter,
  networkScopeAllows,
  networkWriteAllows,
  storeScopeAllows,
  storeWriteAllows,
} from '../packages/contracts/src/data-scope';

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
      [
        { type: 'store', id: 'a', label: '国贸店' },
        { type: 'store', id: 'b', label: '中关村店' },
      ],
    );
    expect(merged).toEqual([
      { type: 'store', id: 'a', label: '国贸店' },
      { type: 'store', id: 'b', label: '中关村店' },
    ]);
  });

  it('write-path allows unscoped employees and restricts scoped operators', () => {
    expect(storeWriteAllows([], 'a', false)).toBe(true);
    expect(storeWriteAllows([{ type: 'store', id: 'a' }], 'a', false)).toBe(true);
    expect(storeWriteAllows([{ type: 'store', id: 'a' }], 'b', false)).toBe(false);
    expect(storeWriteAllows([{ type: 'store', id: 'a' }], 'b', true)).toBe(true);
  });

  it('network packs filter and write like store scopes', () => {
    expect(networkScopeAllows([{ type: 'channel', id: 'ch-a' }], 'channel', 'ch-a')).toBe(true);
    expect(networkScopeAllows([{ type: 'channel', id: 'ch-a' }], 'channel', 'ch-b')).toBe(false);
    expect(networkWriteAllows([], 'circle', 'c1', false)).toBe(true);
    expect(networkWriteAllows([{ type: 'circle', id: 'c1' }], 'circle', 'c2', false)).toBe(false);
    expect(networkWriteAllows([{ type: 'circle', id: 'c1' }], 'circle', 'c2', true)).toBe(true);
    expect(networkListFilter([], 'channel', false)).toBeNull();
    expect(networkListFilter([{ type: 'channel', id: 'ch-a' }], 'channel', false)).toEqual([
      'ch-a',
    ]);
    expect(networkListFilter([{ type: 'channel', id: 'ch-a' }], 'channel', true)).toBeNull();
    expect(
      mergeNetworkScopes('circle', [{ type: 'circle', id: 'c1', label: 'c1' }], [
        { type: 'circle', id: 'c1', label: '国贸商圈' },
        { type: 'channel', id: 'ch', label: 'ignored' },
      ]),
    ).toEqual([{ type: 'circle', id: 'c1', label: '国贸商圈' }]);
  });
});
