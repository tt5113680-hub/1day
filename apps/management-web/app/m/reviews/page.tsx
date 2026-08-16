'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from '../_commerce.module.css';
import { ManagementEarlyMeetingKpi } from '../management-early-meeting-kpi';

type ReviewRow = {
  id: string;
  store_id: string;
  store_name: string;
  rating: number;
  content: string;
  reviewer_label: string;
  source: string;
  sourceLabel?: string;
  status: string;
  reply_text: string | null;
  replied_at: string | null;
  replied_by_name: string | null;
  reply_status: 'pending' | 'replied';
  created_at: string;
};

type ReviewQueue = {
  total: number;
  pending: number;
  replied: number;
  replyRate: number;
  avgRating: number;
  byRating: { rating: number; total: number; pending: number }[];
  pendingQueue: ReviewRow[];
};

type ReviewInsights = {
  days: number;
  bySource: { source: string; label: string; total: number; pending: number; avgRating: number }[];
  ratingTrend: { day: string; count: number; avgRating: number }[];
  knownSources: { source: string; label: string }[];
  disclaimer: string;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const fmt = (iso: string) => new Date(iso).toLocaleString('zh-CN', { hour12: false });
const stars = (rating: number) => `★`.repeat(rating) + `☆`.repeat(Math.max(0, 5 - rating));
const sourceLabel = (review: ReviewRow) => review.sourceLabel ?? review.source;

const REPLY_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待回复' },
  { key: 'replied', label: '已回复' },
] as const;

const TREND_DAYS = [7, 14, 30, 90] as const;

export default function CommerceReviewsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [insights, setInsights] = useState<ReviewInsights | null>(null);
  const [reply, setReply] = useState<'all' | 'pending' | 'replied'>('all');
  const [source, setSource] = useState<string>('all');
  const [trendDays, setTrendDays] = useState<(typeof TREND_DAYS)[number]>(30);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyMessage, setReplyMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const sourceQuery = source === 'all' ? '' : `&source=${encodeURIComponent(source)}`;
      const [listResponse, queueResponse, insightsResponse] = await Promise.all([
        sessionApi.request(
          `${api}/api/v1/management/commerce/reviews?reply=${reply}${sourceQuery}`,
        ),
        sessionApi.request(`${api}/api/v1/management/commerce/reviews/queue`),
        sessionApi.request(
          `${api}/api/v1/management/commerce/reviews/insights?days=${trendDays}`,
        ),
      ]);
      if (
        [401, 403].includes(listResponse.status) ||
        [401, 403].includes(queueResponse.status) ||
        [401, 403].includes(insightsResponse.status)
      )
        return setState('forbidden');
      if (!listResponse.ok || !queueResponse.ok || !insightsResponse.ok) throw Error();
      setReviews((await listResponse.json()).data as ReviewRow[]);
      setQueue((await queueResponse.json()).data as ReviewQueue);
      setInsights((await insightsResponse.json()).data as ReviewInsights);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [reply, source, trendDays]);

  useEffect(() => void load(), [load]);

  const submitReply = async (reviewId: string) => {
    const text = replyDraft.trim();
    if (!text) return;
    setReplyBusy(true);
    setReplyMessage(null);
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/commerce/reviews/${reviewId}/reply`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': `reply-${reviewId}-${Date.now()}`,
          },
          body: JSON.stringify({ replyText: text }),
        },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setReplyMessage('回复已保存为本地评价档案痕迹。');
      setReplyingId(null);
      setReplyDraft('');
      await load();
    } catch {
      setReplyMessage('回复保存失败，请重试。');
    } finally {
      setReplyBusy(false);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载评价档案" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看评价档案" />
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
  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    key: `${star} 星`,
    value: reviews.filter((r) => r.rating === star).length,
  }));
  const reviewScope = new Map<string, number>();
  for (const r of reviews) reviewScope.set(r.store_name, (reviewScope.get(r.store_name) ?? 0) + 1);
  const byReviewStore = [...reviewScope.entries()].map(([name, value]) => ({ key: name, value }));
  const pendingList = queue?.pendingQueue ?? reviews.filter((r) => r.reply_status === 'pending');
  const replyRate = queue ? Math.round((queue.replied / Math.max(1, queue.total)) * 100) : 0;

  return (
    <main className={styles.page} data-testid="management-reviews">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 评价档案</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="评价档案说明">
        <h1>评价档案</h1>
        <p>
          本地试点评价记录、多平台档案标签、评分趋势与待回复队列（租户隔离）。来源如实标注；不接第三方评价流，不伪造第三方评价分。
        </p>
      </section>

      <ManagementEarlyMeetingKpi page="reviews" />

      <p className={styles.honest} role="status">
        评价与回复均为本地试点档案（含 source=local 及导入标签）；source
        为导入/登记标签（本地/美团导入/点评导入/抖音导入/人工补录），推广员工具只做档案与回复痕迹；不接美团评价接口，不代第三方回写，不伪造第三方评价分，不包含本平台收款，非本平台下单。
      </p>

      <section className={styles.summaryStrip} aria-label="评价概况">
        <div>
          <span>评价数</span>
          <strong>{queue?.total ?? reviews.length}</strong>
        </div>
        <div>
          <span>平均分</span>
          <strong>{queue ? queue.avgRating : avg}</strong>
        </div>
        <div>
          <span>待回复</span>
          <strong>{queue?.pending ?? 0}</strong>
        </div>
        <div>
          <span>已回复</span>
          <strong>{queue?.replied ?? 0}</strong>
        </div>
        <div>
          <span>回复率</span>
          <strong>{replyRate}%</strong>
        </div>
        <div>
          <span>来源标签</span>
          <strong>{insights?.bySource.length ?? 0}</strong>
        </div>
      </section>

      <section className={styles.panel} aria-label="多平台标签与评分趋势">
        <div className={styles.panelBlock}>
          <h2>多平台标签</h2>
          <p className={styles.panelMeta}>近 {insights?.days ?? trendDays} 天档案来源分布（非实时流）。</p>
          <ul className={styles.bars}>
            {(insights?.bySource ?? []).map((b) => (
              <li key={b.source} className={styles.barRow}>
                <span className={styles.barLabel}>{b.label}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${
                        insights && insights.bySource.length
                          ? (b.total / Math.max(1, insights.bySource.reduce((a, x) => a + x.total, 0))) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>
                  {b.total}/{b.avgRating}
                </span>
              </li>
            ))}
            {!insights?.bySource.length && <li className={styles.barEmpty}>窗口内暂无评价</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>评分趋势</h2>
          <p className={styles.panelMeta}>按日均分与条数（本地档案）。</p>
          <div className={styles.chips}>
            {TREND_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.chip} ${trendDays === d ? styles.chipActive : ''}`}
                onClick={() => setTrendDays(d)}
              >
                {d} 天
              </button>
            ))}
          </div>
          <ul className={styles.trendList}>
            {(insights?.ratingTrend ?? []).map((point) => (
              <li key={point.day} className={styles.trendRow}>
                <span className={styles.trendDay}>{point.day.slice(5)}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${(point.avgRating / 5) * 100}%` }}
                  />
                </span>
                <span className={styles.barValue}>
                  {point.avgRating} · {point.count}
                </span>
              </li>
            ))}
            {!insights?.ratingTrend.length && <li className={styles.barEmpty}>窗口内暂无趋势点</li>}
          </ul>
        </div>
      </section>

      <section className={styles.panel} aria-label="评价分布">
        <div className={styles.panelBlock}>
          <h2>评分分布</h2>
          <ul className={styles.bars}>
            {ratingBuckets.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${reviews.length ? (b.value / reviews.length) * 100 : 0}%` }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!reviews.length && <li className={styles.barEmpty}>暂无评价</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>待回复评分分布</h2>
          <ul className={styles.bars}>
            {(queue?.byRating ?? []).map((b) => (
              <li key={b.rating} className={styles.barRow}>
                <span className={styles.barLabel}>{b.rating} 星</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${queue && queue.pending ? (b.pending / queue.pending) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.pending} 待</span>
              </li>
            ))}
            {!queue?.pending && <li className={styles.barEmpty}>暂无待回复评价</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>门店分布</h2>
          <ul className={styles.bars}>
            {byReviewStore.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${reviews.length ? (b.value / reviews.length) * 100 : 0}%` }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!reviews.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <section className={styles.panel} aria-label="评价待回复队列">
        <button
          className={styles.replyReset}
          type="button"
          onClick={() => {
            setReplyingId(null);
            setReplyDraft('');
            setReplyMessage(null);
          }}
        >
          收起回复
        </button>
        <div className={styles.panelBlock}>
          <h2>待回复队列</h2>
          <p className={styles.panelMeta}>真实评价档案中尚未登记回复的记录。</p>
          <div className={styles.queueList}>
            {pendingList.map((review) => (
              <div className={styles.queueItem} key={review.id}>
                <div className={styles.rowHead}>
                  <div>
                    <h3>
                      <span className={styles.rating}>{stars(review.rating)}</span>{' '}
                      {review.reviewer_label}
                    </h3>
                    <p>
                      {review.store_name} · {fmt(review.created_at)} ·{' '}
                      <span className={styles.sourceTagInline}>{sourceLabel(review)}</span>
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setReplyingId(review.id);
                      setReplyDraft(review.reply_text ?? '');
                      setReplyMessage(null);
                    }}
                    disabled={replyBusy && replyingId === review.id}
                  >
                    回复
                  </Button>
                </div>
                <p className={styles.reviewContent}>{review.content}</p>
                {replyingId === review.id && (
                  <div className={styles.replyBox}>
                    <textarea
                      className={styles.replyTextarea}
                      value={replyDraft}
                      onChange={(event) => setReplyDraft(event.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="输入对这条评价的回复（仅登记为本地档案痕迹）。"
                    />
                    <div className={styles.replyActions}>
                      <Button
                        onClick={() => void submitReply(review.id)}
                        disabled={replyBusy || !replyDraft.trim()}
                      >
                        {replyBusy ? '保存中…' : '保存回复'}
                      </Button>
                      <Button
                        tone="quiet"
                        onClick={() => {
                          setReplyingId(null);
                          setReplyDraft('');
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!pendingList.length && (
              <p className={styles.barEmpty}>暂无待回复评价，全部已登记回复痕迹。</p>
            )}
          </div>
        </div>
        <div className={styles.panelBlock}>
          <h2>回复状态筛选</h2>
          <p className={styles.panelMeta}>对下方评价列表按回复状态过滤。</p>
          <div className={styles.chips}>
            {REPLY_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`${styles.chip} ${reply === filter.key ? styles.chipActive : ''}`}
                onClick={() => setReply(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.panelBlock}>
          <h2>来源标签筛选</h2>
          <p className={styles.panelMeta}>多平台档案标签（非实时评价流）。</p>
          <div className={styles.chips}>
            <button
              type="button"
              className={`${styles.chip} ${source === 'all' ? styles.chipActive : ''}`}
              onClick={() => setSource('all')}
            >
              全部来源
            </button>
            {(insights?.knownSources ?? []).map((item) => (
              <button
                key={item.source}
                type="button"
                className={`${styles.chip} ${source === item.source ? styles.chipActive : ''}`}
                onClick={() => setSource(item.source)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {replyMessage && (
        <p className={styles.notice} role="status">
          {replyMessage}
        </p>
      )}

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
              <div className={styles.rowBadges}>
                <span className={styles.sourceTag}>{sourceLabel(review)}</span>
                <StatusBadge tone={review.status === 'active' ? 'success' : 'neutral'}>
                  {review.status === 'active' ? '展示中' : '已隐藏'}
                </StatusBadge>
              </div>
            </div>
            <p className={styles.reviewContent}>{review.content}</p>
            {review.reply_status === 'replied' ? (
              <div className={styles.replyCard}>
                <span className={styles.replyLabel}>
                  已回复{review.replied_at ? ` · ${fmt(review.replied_at)}` : ''}
                  {review.replied_by_name ? ` · ${review.replied_by_name}` : ''}
                </span>
                <p>{review.reply_text}</p>
              </div>
            ) : (
              <button
                type="button"
                className={styles.replyInline}
                onClick={() => {
                  setReplyingId(review.id);
                  setReplyDraft('');
                  setReplyMessage(null);
                }}
              >
                写回复
              </button>
            )}
            {replyingId === review.id && review.reply_status !== 'replied' && (
              <div className={styles.replyBox}>
                <textarea
                  className={styles.replyTextarea}
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="输入对这条评价的回复（仅登记为本地档案痕迹）。"
                />
                <div className={styles.replyActions}>
                  <Button
                    onClick={() => void submitReply(review.id)}
                    disabled={replyBusy || !replyDraft.trim()}
                  >
                    {replyBusy ? '保存中…' : '保存回复'}
                  </Button>
                  <Button
                    tone="quiet"
                    onClick={() => {
                      setReplyingId(null);
                      setReplyDraft('');
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
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
