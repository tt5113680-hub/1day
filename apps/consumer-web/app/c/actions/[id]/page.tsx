import { ActionPage, ActionState, type ConsumerAction } from './action';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tenant?: string;
    source?: string;
    returnTo?: string;
    shareCode?: string;
    storeId?: string;
    scene?: string;
  }>;
};

export default async function ConsumerActionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const tenant = query.tenant ?? '';
  const api = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
  try {
    const response = await fetch(
      `${api}/api/v1/consumer/actions/${encodeURIComponent(id)}?tenant=${encodeURIComponent(tenant)}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <ActionState kind="forbidden" />;
    if (!response.ok) return <ActionState kind="error" />;
    const payload = (await response.json()) as {
      data: { tenant: { name: string }; action: ConsumerAction };
    };
    return (
      <ActionPage
        tenant={tenant}
        tenantName={payload.data.tenant.name}
        action={payload.data.action}
        source={query.source}
        returnTo={query.returnTo}
        shareCode={query.shareCode}
        storeId={query.storeId}
        scene={query.scene}
      />
    );
  } catch {
    return <ActionState kind="error" />;
  }
}
