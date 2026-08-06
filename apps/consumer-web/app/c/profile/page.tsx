import { ProfilePage, ProfileState, type ProfileData } from './profile';
type Props = { searchParams: Promise<{ tenant?: string; profile?: string; access?: string }> };
export default async function Page({ searchParams }: Props) {
  const query = await searchParams;
  const api = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
  try {
    const response = await fetch(
      `${api}/api/v1/consumer/profile/${encodeURIComponent(query.profile ?? '')}?tenant=${encodeURIComponent(query.tenant ?? '')}&access=${encodeURIComponent(query.access ?? '')}`,
      { cache: 'no-store' },
    );
    if (response.status === 404) return <ProfileState kind="forbidden" />;
    if (!response.ok) return <ProfileState kind="error" />;
    return (
      <ProfilePage
        profileId={query.profile ?? ''}
        tenant={query.tenant ?? ''}
        access={query.access ?? ''}
        data={((await response.json()) as { data: ProfileData }).data}
      />
    );
  } catch {
    return <ProfileState kind="error" />;
  }
}
