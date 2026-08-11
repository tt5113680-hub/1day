'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

const approvalLabel = (value: string | undefined) =>
  ({ pending: '待审批', approved: '已批准', exited: '已退出' })[value ?? ''] ?? value ?? '';
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

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
  const allMerchants = useMemo(
    () => data.circles.flatMap((circle) => circle.merchants),
    [data.circles],
  );
  const totalRecalls = useMemo(
    () => data.circles.reduce((sum, circle) => sum + circle.merchants.length, 0),
    [data.circles],
  );
  const circleScaleCounts = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const c of data.circles) {
      const n = c.merchants.length;
      const key =
        n <= 0 ? '未收拢 0' : n <= 5 ? '小规模 1-5' : n <= 15 ? '中规模 6-15' : '规模商圈 16+';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([key, value]) => ({ key, value }));
  }, [data.circles]);
  const approvalCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of allMerchants) {
      const key = approvalLabel(m.approvalStatus);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [allMerchants]);
  const memberCircleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data.circles)
      for (const m of c.merchants) {
        const key = m.name;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [data.circles]);
  const benefitScaleCounts = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const m of allMerchants) {
      const n = m.benefits?.length ?? 0;
      const key = n <= 0 ? '未配置权益 0' : n <= 4 ? '基础权益 1-4' : '丰富权益 5+';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([key, value]) => ({ key, value }));
  }, [allMerchants]);
  const pendingCount = useMemo(
    () => allMerchants.filter((m) => m.approvalStatus === 'pending').length,
    [allMerchants],
  );
  const approvedCount = useMemo(
    () => allMerchants.filter((m) => m.approvalStatus === 'approved').length,
    [allMerchants],
  );
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
    <main className={styles.page} data-testid="platform-business-circles">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 平台商圈管理</span>
        <span className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </span>
      </header>

      <section className={styles.heroCard} aria-label="平台商圈管理说明">
        <h1>固定商圈、推荐商户与平台审批</h1>
        <p>
          商圈是商家联盟入口；附近商户不会自动进入固定商圈，所有加入均需持久化推荐和平台批准。商圈是工具开通与整合网络，不涉及本平台收款、非本平台下单。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="平台商圈概况">
        <div>
          <span>固定商圈</span>
          <strong>{data.circles.length}</strong>
        </div>
        <div>
          <span>推荐商户</span>
          <strong>{totalRecalls}</strong>
        </div>
        <div>
          <span>已批准</span>
          <strong>{approvedCount}</strong>
        </div>
        <div>
          <span>待审批</span>
          <strong>{pendingCount}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="商圈运营分布">
        <div className={styles.panelBlock}>
          <h2>商圈规模分布</h2>
          <ul className={styles.bars}>
            {circleScaleCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(data.circles.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.circles.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>推荐审批状态分布</h2>
          <ul className={styles.bars}>
            {approvalCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(totalRecalls, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!totalRecalls && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>商圈覆盖商户分布</h2>
          <ul className={styles.bars}>
            {memberCircleCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(totalRecalls, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!totalRecalls && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>推荐权益分布</h2>
          <ul className={styles.bars}>
            {benefitScaleCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(totalRecalls, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!totalRecalls && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取平台商圈档案行现场推导（source=local）：商圈规模、推荐审批状态、商圈覆盖商户与推荐权益；
        商圈是商家联盟整合网络，不包含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据。
      </p>

      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <section className={styles.panel}>
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
        </section>
        <section className={styles.panel}>
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
        </section>
      </section>
      <section className={styles.circles}>
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
                      {m.slug} · {approvalLabel(m.approvalStatus)}
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
                      {approvalLabel(m.approvalStatus)}
                    </StatusBadge>
                  )}
                </section>
              ))}
            </article>
          ))
        ) : (
          <p className={styles.empty}>尚未创建固定商圈。</p>
        )}
      </section>
    </main>
  );
}
