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
