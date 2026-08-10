import { describe, expect, it } from 'vitest';
import {
  filterMenuCatalog,
  MANAGEMENT_MENU_CATALOG,
  resolveMenuProduct,
} from '../packages/contracts/src/menu';

describe('menu DTO catalog filter', () => {
  it('returns full management catalog for tenant.manage', () => {
    const items = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']);
    expect(items.map((item) => item.key)).toEqual(MANAGEMENT_MENU_CATALOG.map((item) => item.key));
  });

  it('hides owner-only settings when caller only has customer.read', () => {
    const items = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['customer.read']);
    expect(items.map((item) => item.key)).toEqual(['overview', 'customers']);
  });

  it('defaults unknown product to management', () => {
    expect(resolveMenuProduct(undefined)).toBe('management');
    expect(resolveMenuProduct('channel')).toBe('channel');
  });
});
