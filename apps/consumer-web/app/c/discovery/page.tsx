import DiscoveryPage, { DiscoveryState, type Discovery } from './discovery';

export const dynamic = 'force-dynamic';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; latitude?: string; longitude?: string }>;
}) {
  const { tenant = 'system', latitude, longitude } = await searchParams;
  const query = new URLSearchParams({ tenant });
  if (latitude) query.set('latitude', latitude);
  if (longitude) query.set('longitude', longitude);
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/consumer/discovery?${query}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <DiscoveryState kind="forbidden" />;
    if (!response.ok) return <DiscoveryState kind="error" />;
    const payload = (await response.json()) as { data: Discovery };
    return <DiscoveryPage data={payload.data} />;
  } catch {
    return <DiscoveryState kind="error" />;
  }
}
