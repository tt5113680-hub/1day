import { ProcessPage, ProcessState, type ProcessData } from './process';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenant?: string; access?: string }>;
};

export default async function ConsumerProcessPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const api = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
  try {
    const response = await fetch(
      `${api}/api/v1/consumer/processes/${encodeURIComponent(id)}?tenant=${encodeURIComponent(query.tenant ?? '')}&access=${encodeURIComponent(query.access ?? '')}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <ProcessState kind="forbidden" />;
    if (!response.ok) return <ProcessState kind="error" />;
    const payload = (await response.json()) as { data: ProcessData };
    return <ProcessPage data={payload.data} />;
  } catch {
    return <ProcessState kind="error" />;
  }
}
