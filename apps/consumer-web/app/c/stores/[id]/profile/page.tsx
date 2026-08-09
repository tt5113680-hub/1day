import { StoreChannelPage } from '../channel-page';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenant?: string; source?: string; scene?: string; shareCode?: string }>;
}) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  return <StoreChannelPage id={id} search={search} channel="profile" />;
}
