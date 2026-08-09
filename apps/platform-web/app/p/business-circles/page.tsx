'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  Button,
  Card,
  StatusBadge,
  businessLabel,
} from '@oneday/ui';

import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Merchant = {
  tenantId: string;
  name: string;
  slug: string;
  benefits?: string[];
  recommendationReason?: string;
  approvalStatus?: string;
  version?: number;
};
type Circle = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  merchants: Merchant[];
};
type Data = { circles: Circle[]; merchantPool: Merchant[] };
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function BusinessCirclesPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data>({ circles: [], merchantPool: [] });
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    merchantTenantId: '',
    benefits: '',
    recommendationReason: '',
  });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/business-circles`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const create = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/business-circles`, {
        method: 'POST',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          ...form,
          benefits: form.benefits
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean),
        }),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('商圈编码已存在。');
      if (response.status === 400)
        return setNote('请填写有效商圈、推荐理由、至少一项权益并选择商户。');
      if (!response.ok) throw Error();
      setForm({
        code: '',
        name: '',
        description: '',
        merchantTenantId: '',
        benefits: '',
        recommendationReason: '',
      });
      setNote('商圈已建立，商户已作为待审批推荐记录保存。');
      await load();
    } catch {
      setNote('创建失败，事务已回滚，可修正输入后重试。');
    } finally {
      setSaving(false);
    }
  };
  const approve = async (circle: Circle, merchant: Merchant) => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/platform/business-circles/${circle.id}/merchants/${merchant.tenantId}/approve`,
        {
          method: 'POST',
          headers: {
            ...headers(),
            'content-type': 'application/json',
            'idempotency-key': crypto.randomUUID(),
          },
          body: JSON.stringify({ version: merchant.version }),
        },
      );
      if (response.status === 409) return setNote('该推荐已被更新，请刷新后重试。');
      if (!response.ok) throw Error();
      setNote('商户已获批准进入固定商圈。');
      await load();
    } catch {
      setNote('审批失败，请检查平台权限后重试。');
    } finally {
      setSaving(false);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载固定商圈"
          description="正在汇总商圈、推荐商户与平台审批记录。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看固定商圈管理" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="固定商圈管理暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 平台固定商圈"
        title="显式推荐、权益配置与平台审批"
        description="附近商户不会自动进入固定商圈，所有加入均需持久化推荐和批准。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新
          </Button>
        }
      />
      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <Card className={styles.panel}>
          <h2>创建商圈与推荐商户</h2>
          <label>
            商圈编码
            <input
              aria-label="商圈编码"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="north-district"
            />
          </label>
          <label>
            商圈名称
            <input
              aria-label="商圈名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            商圈说明
            <input
              aria-label="商圈说明"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label>
            推荐商户
            <select
              aria-label="推荐商户"
              value={form.merchantTenantId}
              onChange={(e) => setForm({ ...form, merchantTenantId: e.target.value })}
            >
              <option value="">选择已开通商户</option>
              {data.merchantPool.map((merchant) => (
                <option key={merchant.tenantId} value={merchant.tenantId}>
                  {merchant.name} ({merchant.slug})
                </option>
              ))}
            </select>
          </label>
          <label>
            商户权益（每行一项）
            <textarea
              aria-label="商户权益"
              value={form.benefits}
              onChange={(e) => setForm({ ...form, benefits: e.target.value })}
            />
          </label>
          <label>
            推荐理由
            <textarea
              aria-label="推荐理由"
              value={form.recommendationReason}
              onChange={(e) => setForm({ ...form, recommendationReason: e.target.value })}
            />
          </label>
          <Button
            disabled={!data.merchantPool.length}
            loading={saving}
            onClick={() => void create()}
          >
            建立商圈并提交推荐
          </Button>
        </Card>
        <Card className={styles.panel}>
          <h2>可推荐商户池</h2>
          {data.merchantPool.length ? (
            data.merchantPool.map((m) => (
              <article className={styles.pool} key={m.tenantId}>
                <strong>{m.name}</strong>
                <span>{m.slug}</span>
              </article>
            ))
          ) : (
            <p>暂无可推荐商户。</p>
          )}
        </Card>
      </section>
      <Card className={styles.circles}>
        <h2>固定商圈与审批队列</h2>
        {data.circles.length ? (
          data.circles.map((circle) => (
            <article key={circle.id}>
              <header>
                <div>
                  <strong>{circle.name}</strong>
                  <span>
                    {circle.code} · {circle.description}
                  </span>
                </div>
              </header>
              {circle.merchants.map((m) => (
                <section className={styles.member} key={m.tenantId}>
                  <div>
                    <b>{m.name}</b>
                    <span>
                      {m.slug} · {businessLabel(m.approvalStatus ?? '')}
                    </span>
                    <small>
                      权益：{m.benefits?.join('、')}；推荐：{m.recommendationReason}
                    </small>
                  </div>
                  {m.approvalStatus === 'pending' && (
                    <Button loading={saving} onClick={() => void approve(circle, m)}>
                      批准加入
                    </Button>
                  )}
                  {m.approvalStatus !== 'pending' && (
                    <StatusBadge tone={m.approvalStatus === 'approved' ? 'success' : 'neutral'}>
                      {businessLabel(m.approvalStatus ?? '')}
                    </StatusBadge>
                  )}
                </section>
              ))}
            </article>
          ))
        ) : (
          <p className={styles.empty}>尚未创建固定商圈。</p>
        )}
      </Card>
    </main>
  );
}
