import ServicePage, { ServiceState, type ServiceDetail } from './service';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenant?: string; source?: string }>;
}) {
  const [{ id }, { tenant = 'system', source }] = await Promise.all([params, searchParams]);
  try {
    const r = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/consumer/services/${id}?tenant=${encodeURIComponent(tenant)}`,
      { cache: 'no-store' },
    );
    if (r.status === 404) return <ServiceState kind="forbidden" />;
    if (!r.ok) return <ServiceState kind="error" />;
    return (
      <ServicePage
        data={((await r.json()) as { data: ServiceDetail }).data}
        source={source ?? null}
      />
    );
  } catch {
    return <ServiceState kind="error" />;
  }
}
