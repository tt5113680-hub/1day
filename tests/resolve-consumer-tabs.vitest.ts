import { describe, expect, it } from 'vitest';
import {
  FALLBACK_CONSUMER_TABS,
  resolveConsumerTabs,
} from '../apps/consumer-web/app/c/resolve-consumer-tabs';

describe('resolveConsumerTabs', () => {
  it('falls back to fixed five tabs when channels are absent', () => {
    expect(resolveConsumerTabs([], null)).toEqual(FALLBACK_CONSUMER_TABS);
  });

  it('maps beauty operating_channels onto ≤5 shell tabs with industry labels', () => {
    const tabs = resolveConsumerTabs(
      [
        {
          module_type: 'operating_channels',
          config: {
            channels: [
              { code: 'services', label: '服务' },
              { code: 'cases', label: '案例' },
              { code: 'membership', label: '会员' },
            ],
          },
        },
      ],
      null,
    );
    expect(tabs.map((item) => item.label)).toEqual(['首页', '服务', '案例', '会员', '我的']);
    expect(tabs.map((item) => item.path)).toEqual([
      '',
      '/menu',
      '/group-buy',
      '/membership',
      '/profile',
    ]);
  });

  it('uses industry.channels when module is missing', () => {
    const tabs = resolveConsumerTabs(null, ['courses', 'events', 'membership']);
    expect(tabs.map((item) => item.label)).toEqual(['首页', '课程', '活动', '会员', '我的']);
  });
});
