import { describe, expect, it } from 'vitest';
import {
  EMPLOYEE_MENU_CATALOG,
  MANAGEMENT_MENU_CATALOG,
  PLATFORM_MENU_CATALOG,
  STORE_MANAGER_MENU_ITEM,
  defaultHomeHref,
  filterMenuCatalog,
  menuCatalogFor,
  resolveAvailableProducts,
  resolveMenuProduct,
} from '../packages/contracts/src/menu';

describe('menu DTO catalog filter', () => {
  it('returns owner management catalog when tenant.manage and organization.manage', () => {
    const items = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, [
      'tenant.manage',
      'organization.manage',
    ]);
    expect(items.map((item) => item.key)).toEqual(MANAGEMENT_MENU_CATALOG.map((item) => item.key));
  });

  it('hides Owner-only roles/settings for Tenant Manager tenant.manage without organization.manage', () => {
    const items = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']);
    expect(items.map((item) => item.key)).toEqual([
      'overview',
      'customers',
      'attribution',
      'workflows',
      'stores',
      'offers',
      'memberships',
      'content',
      'page-builder',
      'organization',
    ]);
  });

  it('exposes attribution for tenant.manage and hides it from tenant.read store-manager chrome', () => {
    expect(
      filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']).map((item) => item.key),
    ).toContain('attribution');
    expect(
      filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.read']).map((item) => item.key),
    ).not.toContain('attribution');
    const attribution = MANAGEMENT_MENU_CATALOG.find((item) => item.key === 'attribution');
    expect(attribution?.href).toBe('/m/attribution');
    expect(attribution?.label).toBe('来源归因');
  });

  it('exposes overview for customer.read without Management CRM entry', () => {
    const items = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['customer.read']);
    expect(items.map((item) => item.key)).toEqual(['overview']);
  });

  it('exposes store nav for tenant.read store-manager mode', () => {
    expect(filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.read']).map((item) => item.key)).toEqual(
      ['overview', 'stores', 'offers', 'memberships', 'content'],
    );
  });

  it('defaults unknown product to management and resolves known products', () => {
    expect(resolveMenuProduct(undefined)).toBe('management');
    expect(resolveMenuProduct('channel')).toBe('channel');
    expect(menuCatalogFor('platform')).toBe(PLATFORM_MENU_CATALOG);
    expect(menuCatalogFor('employee')).toBe(EMPLOYEE_MENU_CATALOG);
  });

  it('filters platform outbox for platform.read and exposes available products', () => {
    const items = filterMenuCatalog(PLATFORM_MENU_CATALOG, ['platform.read']);
    expect(items.map((item) => item.key)).toContain('outbox');
    expect(items.map((item) => item.key)).not.toContain('onboarding');
    const available = resolveAvailableProducts(['platform.read', 'task.read']);
    expect(available.map((item) => item.product)).toEqual(
      expect.arrayContaining(['platform', 'channel', 'circle', 'employee']),
    );
  });

  it('separates channel-only and circle-only products from platform chrome', () => {
    expect(resolveAvailableProducts(['channel.read', 'channel.manage']).map((item) => item.product)).toEqual([
      'channel',
    ]);
    expect(resolveAvailableProducts(['circle.manage']).map((item) => item.product)).toEqual(['circle']);
    expect(
      filterMenuCatalog(menuCatalogFor('channel'), ['channel.read']).map((item) => item.key),
    ).toEqual(['channel-dashboard', 'channel-onboarding']);
    expect(filterMenuCatalog(menuCatalogFor('platform'), ['channel.read']).map((item) => item.key)).toEqual(
      [],
    );
  });

  it('defaults employee home and store-manager item href', () => {
    expect(
      defaultHomeHref('employee', filterMenuCatalog(EMPLOYEE_MENU_CATALOG, ['task.read'])),
    ).toBe('/e/workbench');
    expect(STORE_MANAGER_MENU_ITEM.href).toBe('/e/store');
  });
});
