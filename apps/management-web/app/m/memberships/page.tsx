'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const client = new SessionApiClient(api);
type Data = {
  enrollments: {
    id: string;
    member_code: string;
    display_name: string;
    store_name: string;
    joined_at: string;
  }[];
  benefits: { id: string; title: string }[];
};
export default function MembershipsPage() {
  const [data, setData] = useState<Data | null>(null),
    [note, setNote] = useState('');
  const load = useCallback(async () => {
    if (!(await client.context())) return setData(null);
    const response = await client.request(`${api}/api/v1/management/memberships`);
    if (response.ok) setData((await response.json()).data);
  }, []);
  useEffect(() => void load(), [load]);
  const grant = async (id: string, benefitId: string) => {
    const response = await client.request(`${api}/api/v1/management/memberships/${id}/grants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({ benefitId, quantity: 1 }),
    });
    setNote(response.ok ? '权益已发放，员工可按会员码核销。' : '权益发放未完成，请刷新后重试。');
  };
  if (!data)
    return (
      <main style={{ padding: 40 }}>
        <AppStatePanel kind="loading" title="正在加载会员与权益" />
      </main>
    );
  return (
    <main style={{ padding: 40, maxWidth: 1280, margin: '0 auto' }}>
      <AdminPageHeader
        eyebrow="ONEDAY / MEMBER OPERATIONS"
        title="会员与权益"
        description="权益仅按已入会会员发放，并由员工按会员码核销。"
      />
      {note && <p role="status">{note}</p>}
      <section style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {data.enrollments.length ? (
          data.enrollments.map((item) => (
            <Card key={item.id}>
              <h2>
                {item.display_name} · {item.member_code}
              </h2>
              <p>
                {item.store_name ?? '未绑定门店'} · 入会于{' '}
                {new Date(item.joined_at).toLocaleString('zh-CN')}
              </p>
              {data.benefits.map((benefit) => (
                <Button
                  key={benefit.id}
                  tone="secondary"
                  onClick={() => void grant(item.id, benefit.id)}
                >
                  发放：{benefit.title}
                </Button>
              ))}
            </Card>
          ))
        ) : (
          <AppStatePanel
            kind="empty"
            title="暂无会员"
            description="Consumer 完成授权入会后会出现在这里。"
          />
        )}
      </section>
    </main>
  );
}
