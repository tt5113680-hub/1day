'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from '../_commerce.module.css';

type ReviewRow = {
  id: string;
  store_id: string;
  store_name: string;
  rating: number;
  content: string;
  reviewer_label: string;
  source: string;
  status: string;
  created_at: string;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const fmt = (iso: string) => new Date(iso).toLocaleString('zh-CN', { hour12: false });
const stars = (rating: number) => `★`.repeat(rating) + `☆`.repeat(Math.max(0, 5 - rating));

export default function CommerceReviewsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/commerce/reviews`);
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setReviews((await response.json()).data as ReviewRow[]);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载评价管理" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看评价管理" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="评价数据暂不可用"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = reviews.length ? (sum / reviews.length).toFixed(1) : '0';
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 评价档案"
        title="评价管理"
        description="本地试点评价记录与平均分（租户隔离）。来源如实标注；不接第三方评价流，不伪造评分。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新
          </Button>
        }
      />
      <section className={styles.summaryStrip} aria-label="评价概况">
        <div>
          <span>评价数</span>
          <strong>{reviews.length}</strong>
        </div>
        <div>
          <span>平均分</span>
          <strong>{avg}</strong>
        </div>
        <div>
          <span>好评(≥4)</span>
          <strong>{reviews.filter((r) => r.rating >= 4).length}</strong>
        </div>
        <div>
          <span>门店</span>
          <strong>{new Set(reviews.map((r) => r.store_id)).size}</strong>
        </div>
      </section>
      <p className={styles.honest}>
        评价骨架为本地试点数据（source=local）。推广员工具只做档案与回复痕迹；不接美团评价接口，不伪造第三方评价分。
      </p>
      <section className={styles.grid}>
        {reviews.map((review) => (
          <article className={styles.row} key={review.id}>
            <div className={styles.rowHead}>
              <div>
                <h2>
                  <span className={styles.rating}>{stars(review.rating)}</span>{' '}
                  {review.reviewer_label}
                </h2>
                <p>
                  {review.store_name} · {fmt(review.created_at)}
                </p>
              </div>
              <StatusBadge tone={review.status === 'active' ? 'success' : 'neutral'}>
                {review.status === 'active' ? '展示中' : '已隐藏'}
              </StatusBadge>
            </div>
            <p style={{ color: 'var(--od-ink)', margin: '12px 0 0' }}>{review.content}</p>
          </article>
        ))}
        {!reviews.length && (
          <AppStatePanel
            kind="empty"
            title="暂无评价"
            description="本地试点评价为空。接入渠道评价源后可在此聚合与回复。"
          />
        )}
      </section>
    </main>
  );
}
