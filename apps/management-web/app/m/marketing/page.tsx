'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from '../_commerce.module.css';

type CampaignRow = {
  id: string;
  store_id: string;
  store_name: string;
  offer_id: string | null;
  campaign_type: string;
  title: string;
  description: string | null;
  delivery_channel: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const fmt = (iso: string) => new Date(iso).toLocaleDateString('zh-CN');
const typeCopy: Record<string, string> = {
  coupon: '优惠券',
  offer: '套餐/Offer',
  content: '内容投放',
};
const statusTone: Record<string, 'success' | 'warning' | 'neutral'> = {
  live: 'success',
  draft: 'neutral',
  ended: 'warning',
  paused: 'warning',
};
const statusCopy: Record<string, string> = {
  live: '投放中',
  draft: '草稿',
  ended: '已结束',
  paused: '已暂停',
};

export default function CommerceMarketingPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/commerce/marketing`);
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setCampaigns((await response.json()).data as CampaignRow[]);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载营销中心" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看营销中心" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="营销数据暂不可用"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  const live = campaigns.filter((c) => c.status === 'live').length;
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 营销档案"
        title="营销中心"
        description="本地营销活动档案（券/活动/内容窗口）。投放渠道如实标注；不宣称已投第三方渠道，不含支付金额。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新
          </Button>
        }
      />
      <section className={styles.summaryStrip} aria-label="营销概况">
        <div>
          <span>活动数</span>
          <strong>{campaigns.length}</strong>
        </div>
        <div>
          <span>投放中</span>
          <strong>{live}</strong>
        </div>
        <div>
          <span>草稿</span>
          <strong>{campaigns.filter((c) => c.status === 'draft').length}</strong>
        </div>
        <div>
          <span>门店</span>
          <strong>{new Set(campaigns.map((c) => c.store_id)).size}</strong>
        </div>
      </section>
      <p className={styles.honest}>
        营销骨架为本地试点数据（delivery=local）。推广员工具只登记档案与发布时间窗；不接美团/抖音实时投放，非本平台成交。
      </p>
      <section className={styles.grid}>
        {campaigns.map((campaign) => (
          <article className={styles.row} key={campaign.id}>
            <div className={styles.rowHead}>
              <div>
                <h2>{campaign.title}</h2>
                <p>
                  {typeCopy[campaign.campaign_type] ?? campaign.campaign_type} · {campaign.store_name}
                </p>
              </div>
              <StatusBadge tone={statusTone[campaign.status] ?? 'neutral'}>
                {statusCopy[campaign.status] ?? campaign.status}
              </StatusBadge>
            </div>
            <dl className={styles.dl}>
              <div>
                <dt>投放渠道</dt>
                <dd>{campaign.delivery_channel}</dd>
              </div>
              <div>
                <dt>开始</dt>
                <dd>{fmt(campaign.starts_at)}</dd>
              </div>
              <div>
                <dt>结束</dt>
                <dd>{fmt(campaign.ends_at)}</dd>
              </div>
              <div>
                <dt>说明</dt>
                <dd>{campaign.description ?? '—'}</dd>
              </div>
            </dl>
          </article>
        ))}
        {!campaigns.length && (
          <AppStatePanel
            kind="empty"
            title="暂无营销活动"
            description="本地试点活动为空。可在此登记券/活动档案与投放窗口。"
          />
        )}
      </section>
    </main>
  );
}
