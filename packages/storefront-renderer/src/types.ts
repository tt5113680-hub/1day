/** Canonical storefront module types after alias normalization. */
export const NORMALIZED_MODULE_TYPES = [
  'store_hero',
  'banner_carousel',
  'operating_channels',
  'quick_actions',
  'member_entry',
  'member_wallet',
  'service_catalog',
  'offer_compare',
  'content_feed',
  'store_info',
  'discovery_entry',
] as const;

export type NormalizedModuleType = (typeof NORMALIZED_MODULE_TYPES)[number];

/** Modules that Consumer groups into the desktop section grid. */
export const SECTION_MODULE_TYPES = new Set<NormalizedModuleType>([
  'service_catalog',
  'offer_compare',
  'content_feed',
  'member_entry',
  'member_wallet',
]);

/** Shell-only modules never paint an in-page section. */
export const SHELL_ONLY_MODULE_TYPES = new Set<NormalizedModuleType>(['operating_channels']);

export type StorefrontModule = {
  id: string;
  module_type: string;
  position: number;
  config: Record<string, unknown>;
};

export type ResolvedStorefrontModule = StorefrontModule & {
  normalizedType: NormalizedModuleType | string;
  visible: boolean;
};

export type ConsumerNavTab = {
  key: string;
  label: string;
  icon: string;
  path: string;
};
