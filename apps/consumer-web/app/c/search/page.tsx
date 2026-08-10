import SearchPage, { SearchState, type SearchData } from './search';

export const dynamic = 'force-dynamic';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; q?: string }>;
}) {
  const { tenant, q } = await searchParams;
  if (!tenant) return <SearchState kind="forbidden" />;
  if (!q || !q.trim()) {
    // First visit to the search page: no term yet — render the search box with an empty query.
    return (
      <SearchPage
        data={{
          tenant: { slug: tenant, name: '' },
          query: '',
          items: [],
        }}
      />
    );
  }
  const query = new URLSearchParams({ tenant });
  query.set('q', q.trim());
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/consumer/search?${query}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <SearchState kind="forbidden" />;
    if (!response.ok) return <SearchState kind="error" />;
    const payload = (await response.json()) as { data: SearchData };
    return <SearchPage data={payload.data} />;
  } catch {
    return <SearchState kind="error" />;
  }
}
