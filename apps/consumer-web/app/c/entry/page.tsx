import ConsumerEntry, {
  EntryState,
  type ConsumerAction,
  type ConsumerModule,
} from './consumer-entry';

export const dynamic = 'force-dynamic';
type ApiResponse = {
  data: {
    tenant: { slug: string; name: string };
    template: { id: string; code: string; name: string } | null;
    modules: ConsumerModule[];
    actions: ConsumerAction[];
  };
};

export default async function ConsumerEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const { tenant = 'system' } = await searchParams;
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/consumer/entry?tenant=${encodeURIComponent(tenant)}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <EntryState kind="forbidden" />;
    if (!response.ok) return <EntryState kind="error" />;
    const payload = (await response.json()) as ApiResponse;
    return <ConsumerEntry entry={payload.data} />;
  } catch {
    return <EntryState kind="error" />;
  }
}
