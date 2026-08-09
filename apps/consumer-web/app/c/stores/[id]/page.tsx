import StorePage, { StoreState, type StoreDetail } from './store';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenant?: string; source?: string; scene?: string; shareCode?: string }>;
}) {
  const [{ id }, { tenant, source, scene, shareCode }] = await Promise.all([params, searchParams]);
  if (!tenant) return <StoreState kind="forbidden" />;
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/consumer/stores/${id}?tenant=${encodeURIComponent(tenant)}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <StoreState kind="forbidden" />;
    if (!response.ok) return <StoreState kind="error" />;
    return (
      <StorePage
        data={((await response.json()) as { data: StoreDetail }).data}
        source={source ?? null}
        shareCode={shareCode ?? null}
        scene={scene ?? null}
      />
    );
  } catch {
    return <StoreState kind="error" />;
  }
}
