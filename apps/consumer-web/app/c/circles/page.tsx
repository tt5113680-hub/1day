import CirclesHome, { CirclesState } from './circles-home';

export const dynamic = 'force-dynamic';

type ApiResponse = {
  data: {
    tenant: { slug: string; name: string };
    locationRequired: boolean;
    items: {
      id: string;
      name: string;
      description: string | null;
      industryTag: string | null;
      address: string | null;
      publicVisible: boolean;
      ownedByViewer: boolean;
      owner: { slug: string; name: string };
      merchantCount: number;
      distanceKm: number | null;
      entryUrl: string;
    }[];
  };
};

export default async function CirclesPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; latitude?: string; longitude?: string }>;
}) {
  const { tenant, latitude, longitude } = await searchParams;
  if (!tenant) return <CirclesState kind="forbidden" />;
  try {
    const query = new URLSearchParams({ tenant });
    if (latitude && longitude) {
      query.set('latitude', latitude);
      query.set('longitude', longitude);
    }
    const response = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/consumer/circles?${query}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <CirclesState kind="forbidden" />;
    if (!response.ok) return <CirclesState kind="error" />;
    const payload = (await response.json()) as ApiResponse;
    return <CirclesHome data={payload.data} />;
  } catch {
    return <CirclesState kind="error" />;
  }
}
