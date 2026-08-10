import { describe, expect, it } from 'vitest';
import {
  EMPLOYEE_MENU_CATALOG,
  MANAGEMENT_MENU_CATALOG,
  PLATFORM_MENU_CATALOG,
  PLATFORM_PRODUCT_HOMES,
  STORE_MANAGER_MENU_ITEM,
  STORE_MANAGER_PACKAGE_ACTIONS,
  defaultHomeHref,
  filterMenuCatalog,
  menuCatalogFor,
  resolveAvailableProducts,
  resolveMenuProduct,
  resolvePlatformShellAccess,
  shellModeAllows,
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
      'external-actions',
      'offers',
      'memberships',
      'content',
      'page-builder',
      'organization',
      'employee-performance',
      'ai-suggestions',
      'connectors',
      'permission-audit',
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

  it('exposes external-actions catalog for tenant.manage and action.read', () => {
    expect(
      filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']).map((item) => item.key),
    ).toContain('external-actions');
    expect(
      filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['action.read']).map((item) => item.key),
    ).toEqual(['external-actions']);
    expect(
      filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.read']).map((item) => item.key),
    ).not.toContain('external-actions');
  });

  it('surfaces former Management orphan pages for tenant.manage only', () => {
    const keys = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']).map(
      (item) => item.key,
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'employee-performance',
        'ai-suggestions',
        'connectors',
        'permission-audit',
      ]),
    );
    expect(
      filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.read']).map((item) => item.key),
    ).not.toEqual(expect.arrayContaining(['connectors', 'ai-suggestions', 'permission-audit']));
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

  it('exposes store-manager package actions and platform product homes (SYS-27)', () => {
    expect(STORE_MANAGER_PACKAGE_ACTIONS.map((item) => item.key)).toEqual([
      'tasks',
      'leads',
      'redeem',
      'share',
    ]);
    expect(STORE_MANAGER_PACKAGE_ACTIONS.find((item) => item.key === 'redeem')?.href).toBe(
      '/e/workbench#membership-redeem',
    );
    expect(PLATFORM_PRODUCT_HOMES.platform.homeHref).toBe('/p/dashboard');
    expect(PLATFORM_PRODUCT_HOMES.channel.homeHref).toBe('/ch/dashboard');
    expect(PLATFORM_PRODUCT_HOMES.circle.homeHref).toBe('/bc/dashboard');
  });

  it('isolates channel-only and circle-only shell modes from platform (SYS-28)', () => {
    const channelOnly = resolvePlatformShellAccess(['channel.read', 'channel.manage']);
    expect(channelOnly.allowed).toEqual(['channel']);
    expect(channelOnly.preferred).toBe('channel');
    expect(channelOnly.homeHref).toBe('/ch/dashboard');
    expect(shellModeAllows('platform', ['channel.read'])).toBe(false);
    expect(shellModeAllows('channel', ['channel.read'])).toBe(true);

    const circleOnly = resolvePlatformShellAccess(['circle.manage']);
    expect(circleOnly.allowed).toEqual(['circle']);
    expect(circleOnly.homeHref).toBe('/bc/dashboard');
    expect(shellModeAllows('platform', ['circle.manage'])).toBe(false);

    const platformAdmin = resolvePlatformShellAccess(['platform.read', 'platform.manage']);
    expect(platformAdmin.allowed).toEqual(['platform', 'channel', 'circle']);
    expect(platformAdmin.preferred).toBe('platform');
  });
});
