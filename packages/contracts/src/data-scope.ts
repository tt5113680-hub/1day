import type { MenuScopeDto } from './menu';

export type DataScopeType = 'store' | 'organization' | 'channel' | 'circle' | 'tenant' | 'system';

export type DataScopeRecord = {
  type: DataScopeType;
  id: string;
  label?: string;
};

const MENU_SCOPE_TYPES = new Set<MenuScopeDto['type']>([
  'store',
  'channel',
  'circle',
  'tenant',
  'system',
]);

export function toMenuScope(record: DataScopeRecord): MenuScopeDto | null {
  if (!MENU_SCOPE_TYPES.has(record.type as MenuScopeDto['type'])) return null;
  return {
    type: record.type as MenuScopeDto['type'],
    id: record.id,
    label: record.label ?? record.id,
  };
}

/** Empty store-scope list means no store restriction from data_scopes (caller may still use other rules). */
export function storeScopeAllows(
  scopes: Array<Pick<DataScopeRecord, 'type' | 'id'>>,
  storeId: string,
): boolean {
  const storeScopes = scopes.filter((scope) => scope.type === 'store');
  if (storeScopes.length === 0) return false;
  return storeScopes.some((scope) => scope.id === storeId);
}

/**
 * Write-path: tenant owners unrestricted; unscoped employees unrestricted;
 * scoped operators must match the target store.
 */
export function storeWriteAllows(
  scopes: Array<Pick<DataScopeRecord, 'type' | 'id'>>,
  storeId: string,
  hasTenantManage: boolean,
): boolean {
  if (hasTenantManage) return true;
  const storeScopes = scopes.filter((scope) => scope.type === 'store');
  if (storeScopes.length === 0) return true;
  return storeScopes.some((scope) => scope.id === storeId);
}

export function mergeStoreScopes(
  primary: MenuScopeDto[],
  secondary: MenuScopeDto[],
): MenuScopeDto[] {
  const byId = new Map<string, MenuScopeDto>();
  for (const scope of [...primary, ...secondary]) {
    if (scope.type !== 'store') continue;
    const existing = byId.get(scope.id);
    if (!existing || (existing.label === existing.id && scope.label !== scope.id)) {
      byId.set(scope.id, scope);
    }
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

export type NetworkScopeType = 'channel' | 'circle';

/** Read/list: typed scopes must include the target id. */
export function networkScopeAllows(
  scopes: Array<Pick<DataScopeRecord, 'type' | 'id'>>,
  type: NetworkScopeType,
  id: string,
): boolean {
  const typed = scopes.filter((scope) => scope.type === type);
  if (typed.length === 0) return false;
  return typed.some((scope) => scope.id === id);
}

/**
 * Channel/circle write-path: platform.manage unrestricted; unscoped operators
 * unrestricted (legacy platform/circle admins); scoped operators must match.
 */
export function networkWriteAllows(
  scopes: Array<Pick<DataScopeRecord, 'type' | 'id'>>,
  type: NetworkScopeType,
  id: string,
  hasPlatformManage: boolean,
): boolean {
  if (hasPlatformManage) return true;
  const typed = scopes.filter((scope) => scope.type === type);
  if (typed.length === 0) return true;
  return typed.some((scope) => scope.id === id);
}

/**
 * null = unrestricted list; string[] = filter to these ids.
 * platform.manage always unrestricted; otherwise typed scopes restrict when present.
 */
export function networkListFilter(
  scopes: Array<Pick<DataScopeRecord, 'type' | 'id'>>,
  type: NetworkScopeType,
  hasPlatformManage: boolean,
): string[] | null {
  if (hasPlatformManage) return null;
  const typed = scopes.filter((scope) => scope.type === type).map((scope) => scope.id);
  return typed.length ? typed : null;
}

export function mergeNetworkScopes(
  type: NetworkScopeType,
  primary: MenuScopeDto[],
  secondary: MenuScopeDto[] = [],
): MenuScopeDto[] {
  const byId = new Map<string, MenuScopeDto>();
  for (const scope of [...primary, ...secondary]) {
    if (scope.type !== type) continue;
    const existing = byId.get(scope.id);
    if (!existing || (existing.label === existing.id && scope.label !== scope.id)) {
      byId.set(scope.id, scope);
    }
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}
