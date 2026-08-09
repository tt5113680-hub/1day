import StoreChannel from './channel';
import { type ConsumerTab } from '../../consumer-shell';
import { StoreState, type StoreDetail } from './store';

type Channel = Exclude<ConsumerTab, 'home'>;
type Search = { tenant?: string; source?: string; scene?: string; shareCode?: string };

export async function StoreChannelPage({
  id,
  search,
  channel,
}: {
  id: string;
  search: Search;
  channel: Channel;
}) {
  if (!search.tenant) return <StoreState kind="forbidden" />;
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/consumer/stores/${id}?tenant=${encodeURIComponent(search.tenant)}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <StoreState kind="forbidden" />;
    if (!response.ok) return <StoreState kind="error" />;
    return (
      <StoreChannel
        channel={channel}
        context={{
          tenant: search.tenant,
          storeId: id,
          source: search.source,
          scene: search.scene,
          shareCode: search.shareCode,
        }}
        data={((await response.json()) as { data: StoreDetail }).data}
      />
    );
  } catch {
    return <StoreState kind="error" />;
  }
}
