export type MemberAccess = {
  accessId: string;
  access: string;
  memberCode?: string;
};

export type MemberWalletPayload = {
  memberCode: string;
  tier: string;
  joinedAt?: string;
  benefits: { id: string; title: string; description: string | null; balance: number }[];
};

export type MemberProfilePayload = {
  profile: {
    displayName: string;
    identities: { type: string; maskedValue: string }[];
    consent: { status: string; version: string; consentedAt: string; versionNumber: number };
  };
  benefits: { title: string; description: string | null }[];
  history: { orderNumber: string; occurredAt: string; status: string }[];
};

export function memberAccessStorageKey(tenant: string, storeId: string) {
  return `oneday.memberAccess:${tenant}:${storeId}`;
}

export function readMemberAccess(tenant: string, storeId: string): MemberAccess | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(memberAccessStorageKey(tenant, storeId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MemberAccess>;
    if (!parsed.accessId || !parsed.access) return null;
    return {
      accessId: parsed.accessId,
      access: parsed.access,
      memberCode: typeof parsed.memberCode === 'string' ? parsed.memberCode : undefined,
    };
  } catch {
    return null;
  }
}

export function writeMemberAccess(tenant: string, storeId: string, access: MemberAccess) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(memberAccessStorageKey(tenant, storeId), JSON.stringify(access));
}

export function clearMemberAccess(tenant: string, storeId: string) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(memberAccessStorageKey(tenant, storeId));
}

export async function fetchMemberWallet(
  apiBase: string,
  tenant: string,
  access: MemberAccess,
): Promise<{ status: number; data: MemberWalletPayload | null }> {
  const response = await fetch(
    `${apiBase}/api/v1/consumer/memberships/wallet?tenant=${encodeURIComponent(tenant)}&accessId=${encodeURIComponent(access.accessId)}&access=${encodeURIComponent(access.access)}`,
  );
  if (response.status === 404) return { status: 404, data: null };
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: (await response.json()).data as MemberWalletPayload };
}

export async function fetchMemberProfile(
  apiBase: string,
  tenant: string,
  access: MemberAccess,
): Promise<{ status: number; data: MemberProfilePayload | null }> {
  const response = await fetch(
    `${apiBase}/api/v1/consumer/profile/${encodeURIComponent(access.accessId)}?tenant=${encodeURIComponent(tenant)}&access=${encodeURIComponent(access.access)}`,
  );
  if (response.status === 404) return { status: 404, data: null };
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: (await response.json()).data as MemberProfilePayload };
}
