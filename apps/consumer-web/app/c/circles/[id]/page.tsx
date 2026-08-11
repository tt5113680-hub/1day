import CircleDetail, { CircleDetailState } from './circle-detail';

export const dynamic = 'force-dynamic';

type ApiResponse = {
  data: {
    tenant: { slug: string; name: string };
    circle: {
      id: string;
      name: string;
      description: string | null;
      industryTag: string | null;
      address: string | null;
      publicVisible: boolean;
      ownedByViewer: boolean;
      owner: { slug: string; name: string };
    };
    merchants: { id: string; name: string; entryUrl: string | null }[];
  };
};

export default async function CircleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenant?: string }>;
}) {
  const { id } = await params;
  const { tenant } = await searchParams;
  if (!tenant) return <CircleDetailState kind="forbidden" />;
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/consumer/circles/${encodeURIComponent(id)}?tenant=${encodeURIComponent(tenant)}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <CircleDetailState kind="forbidden" />;
    if (!response.ok) return <CircleDetailState kind="error" />;
    const payload = (await response.json()) as ApiResponse;
    return <CircleDetail data={payload.data} />;
  } catch {
    return <CircleDetailState kind="error" />;
  }
}
