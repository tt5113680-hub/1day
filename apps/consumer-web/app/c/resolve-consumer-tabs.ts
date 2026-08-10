export type ConsumerNavTab = {
  key: string;
  label: string;
  icon: string;
  path: string;
};

export const FALLBACK_CONSUMER_TABS: ConsumerNavTab[] = [
  { key: 'home', label: '首页', icon: '⌂', path: '' },
  { key: 'group-buy', label: '团购', icon: '券', path: '/group-buy' },
  { key: 'menu', label: '菜单', icon: '单', path: '/menu' },
  { key: 'membership', label: '会员', icon: '会', path: '/membership' },
  { key: 'profile', label: '我的', icon: '我', path: '/profile' },
];

/** Map published operating_channels codes onto existing store routes (≤3 mid tabs). */
const channelDefaults: Record<string, Omit<ConsumerNavTab, 'key'> & { key?: string }> = {
  'group-buy': { key: 'group-buy', label: '团购', icon: '券', path: '/group-buy' },
  menu: { key: 'menu', label: '菜单', icon: '单', path: '/menu' },
  membership: { key: 'membership', label: '会员', icon: '会', path: '/membership' },
  services: { key: 'menu', label: '服务', icon: '务', path: '/menu' },
  cases: { key: 'group-buy', label: '案例', icon: '例', path: '/group-buy' },
  courses: { key: 'menu', label: '课程', icon: '课', path: '/menu' },
  events: { key: 'group-buy', label: '活动', icon: '活', path: '/group-buy' },
  catalog: { key: 'menu', label: '选品', icon: '选', path: '/menu' },
};

export const OPERATING_CHANNEL_CODES = Object.keys(channelDefaults);

export function resolveConsumerTabs(
  modules?: { module_type: string; config: Record<string, unknown> }[] | null,
  industryChannels?: string[] | null,
): ConsumerNavTab[] {
  const channelModule = modules?.find((item) => item.module_type === 'operating_channels');
  const configured = channelModule?.config?.channels;
  const labelByCode = new Map<string, string>();
  const codes: string[] = [];
  if (Array.isArray(configured)) {
    for (const item of configured) {
      if (typeof item === 'string') {
        codes.push(item);
        continue;
      }
      if (item && typeof item === 'object') {
        const code = (item as { code?: string }).code;
        if (typeof code !== 'string' || !code) continue;
        codes.push(code);
        if (typeof (item as { label?: string }).label === 'string') {
          labelByCode.set(code, (item as { label: string }).label);
        }
      }
    }
  } else if (Array.isArray(industryChannels)) {
    codes.push(...industryChannels);
  }

  const mid: ConsumerNavTab[] = [];
  for (const code of codes.slice(0, 3)) {
    const preset = channelDefaults[code];
    if (!preset) continue;
    if (mid.some((item) => item.path === preset.path)) continue;
    mid.push({
      key: preset.key ?? code,
      label: labelByCode.get(code) ?? preset.label,
      icon: preset.icon,
      path: preset.path,
    });
  }

  if (!mid.length) return FALLBACK_CONSUMER_TABS;
  return [
    { key: 'home', label: '首页', icon: '⌂', path: '' },
    ...mid,
    { key: 'profile', label: '我的', icon: '我', path: '/profile' },
  ].slice(0, 5);
}

export function memberAccessStorageKey(tenant: string, storeId: string) {
  return `oneday.memberAccess:${tenant}:${storeId}`;
}
