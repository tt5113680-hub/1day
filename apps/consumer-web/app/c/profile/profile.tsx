'use client';
import { AppStatePanel, Button } from '@oneday/ui';
import { useMemo, useState } from 'react';
import styles from './profile.module.css';
export type ProfileData = {
  profile: {
    displayName: string;
    identities: { type: string; maskedValue: string }[];
    consent: { status: string; version: string; consentedAt: string; versionNumber: number };
  };
  benefits: { title: string; description: string | null }[];
  history: { orderNumber: string; occurredAt: string; status: string }[];
};
const date = (x: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(x));
const countBy = (rows: string[]) => {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const label = row || '未分类';
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};
const barWidth = (total: number, value: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);
const historyStatusLabel = (status: string) =>
  status === 'completed'
    ? '已完成'
    : status === 'pending'
      ? '待处理'
      : status === 'cancelled'
        ? '已取消'
        : status || '未分类';
export function ProfileState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy: readonly [string, string] =
    kind === 'forbidden'
      ? ['资料暂不可访问', '请使用商家发送的专属资料链接。']
      : ['资料加载失败', '网络连接不稳定，请稍后重试。'];
  return (
    <main className={styles.message}>
      <AppStatePanel
        kind={kind}
        title={copy[0]}
        description={copy[1]}
        action={
          kind === 'error' ? (
            <Button onClick={() => window.location.reload()}>重新加载</Button>
          ) : undefined
        }
      />
    </main>
  );
}
export function ProfilePage({
  profileId,
  tenant,
  access,
  data,
}: {
  profileId: string;
  tenant: string;
  access: string;
  data: ProfileData;
}) {
  const [state, setState] = useState<'ready' | 'confirm' | 'done' | 'error'>('ready');
  const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
  const revoke = async () => {
    setState('confirm');
    try {
      const r = await fetch(
        `${api}/api/v1/consumer/profile/${encodeURIComponent(profileId)}/consent/revoke?tenant=${encodeURIComponent(tenant)}&access=${encodeURIComponent(access)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({ version: data.profile.consent.versionNumber }),
        },
      );
      if (!r.ok) throw Error();
      setState('done');
    } catch {
      setState('error');
    }
  };
  const identityDist = useMemo(
    () =>
      countBy(
        data.profile.identities.map((item) =>
          item.type === 'phone' ? '手机号' : item.type === 'email' ? '邮箱' : item.type || '未分类',
        ),
      ),
    [data.profile.identities],
  );
  const benefitDist = useMemo(
    () =>
      data.benefits.map((benefit) => ({
        label: benefit.title || '未命名权益',
        value: 1,
      })),
    [data.benefits],
  );
  const historyStatusDist = useMemo(
    () => countBy(data.history.map((item) => historyStatusLabel(item.status))),
    [data.history],
  );
  const historyTimeDist = useMemo(
    () =>
      countBy(
        data.history.map((item) => {
          const parsed = new Date(item.occurredAt);
          return Number.isNaN(parsed.getTime())
            ? '未知时间'
            : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        }),
      ),
    [data.history],
  );
  const identityTotal = data.profile.identities.length;
  const historyTotal = data.history.length;

  return (
    <main id="top" className={`${styles.page} od-sf-theme`}>
      <div className={styles.shell}>
        <h1 className={styles.visuallyHidden}>{data.profile.displayName}</h1>
        <header className={styles.topBar}>
          <span className={styles.topTitle}>我的会员资料</span>
          <span className={styles.topMark}>推广员工具</span>
        </header>

        <section className={styles.heroCard} aria-label="我的会员概况">
          <header className={styles.heroHead}>
            <span>推广员工具 · 我的会员资料</span>
            <h2>{data.profile.displayName}</h2>
            <p role="note">
              按真实会员档案汇总：绑定身份、可用权益与门店服务痕迹，仅供入口分流参考。
            </p>
          </header>
          <div className={styles.summaryStrip} aria-label="我的会员数据概况">
            <dl>
              <dt>绑定身份</dt>
              <dd>{identityTotal}</dd>
            </dl>
            <dl>
              <dt>在册权益</dt>
              <dd>{data.benefits.length}</dd>
            </dl>
            <dl>
              <dt>服务记录</dt>
              <dd>{historyTotal}</dd>
            </dl>
          </div>
        </section>

        <section className={styles.distribution} aria-label="我的会员分布">
          <header className={styles.panelHead}>
            <h3>我的会员分布</h3>
            <p>分布由已抓取会员档案行现场推导 · 仅统计身份/权益与门店服务痕迹，不涉及成交</p>
          </header>
          <div className={styles.panelBlock}>
            <span className={styles.barLabel}>绑定身份分布</span>
            <div className={styles.bars} role="list">
              {identityDist.length ? (
                identityDist.map((bar) => (
                  <div className={styles.barRow} role="listitem" key={bar.label}>
                    <span>{bar.label}</span>
                    <b>
                      <i style={{ width: `${barWidth(identityTotal, bar.value)}%` }} />
                    </b>
                    <em>{bar.value}</em>
                  </div>
                ))
              ) : (
                <span className={styles.barEmpty}>暂无绑定身份</span>
              )}
            </div>
          </div>
          <div className={styles.panelBlock}>
            <span className={styles.barLabel}>权益分布</span>
            <div className={styles.bars} role="list">
              {benefitDist.length ? (
                benefitDist.map((bar, index) => (
                  <div className={styles.barRow} role="listitem" key={`${bar.label}-${index}`}>
                    <span>{bar.label}</span>
                    <b>
                      <i style={{ width: `${barWidth(data.benefits.length, bar.value)}%` }} />
                    </b>
                    <em>{bar.value}</em>
                  </div>
                ))
              ) : (
                <span className={styles.barEmpty}>暂无权益</span>
              )}
            </div>
          </div>
          <div className={styles.panelBlock}>
            <span className={styles.barLabel}>服务历史状态分布</span>
            <div className={styles.bars} role="list">
              {historyStatusDist.length ? (
                historyStatusDist.map((bar) => (
                  <div className={styles.barRow} role="listitem" key={bar.label}>
                    <span>{bar.label}</span>
                    <b>
                      <i style={{ width: `${barWidth(historyTotal, bar.value)}%` }} />
                    </b>
                    <em>{bar.value}</em>
                  </div>
                ))
              ) : (
                <span className={styles.barEmpty}>暂无服务记录</span>
              )}
            </div>
          </div>
          <div className={styles.panelBlock}>
            <span className={styles.barLabel}>服务历史时间分布</span>
            <div className={styles.bars} role="list">
              {historyTimeDist.length ? (
                historyTimeDist.map((bar) => (
                  <div className={styles.barRow} role="listitem" key={bar.label}>
                    <span>{bar.label}</span>
                    <b>
                      <i style={{ width: `${barWidth(historyTotal, bar.value)}%` }} />
                    </b>
                    <em>{bar.value}</em>
                  </div>
                ))
              ) : (
                <span className={styles.barEmpty}>暂无服务记录</span>
              )}
            </div>
          </div>
        </section>

        <p className={styles.honest} role="note">
          以上分布全部由已抓取会员档案行现场推导，源 source=local；
          权益与门店服务痕迹不代表美团/抖音/扫呗等第三方订单，非本平台下单。 不在此下单。
        </p>

        <section className={styles.card}>
          <h2>已绑定身份</h2>
          {data.profile.identities.map((x) => (
            <p key={`${x.type}-${x.maskedValue}`}>
              <strong>{x.type}</strong>
              <span>{x.maskedValue}</span>
            </p>
          ))}
        </section>
        <section className={styles.card}>
          <h2>可用权益</h2>
          {data.benefits.length ? (
            data.benefits.map((x) => (
              <p key={x.title}>
                <strong>{x.title}</strong>
                <span>{x.description ?? '到店后咨询顾问使用条件'}</span>
              </p>
            ))
          ) : (
            <p>暂无已发布权益</p>
          )}
        </section>
        <section className={styles.card}>
          <h2>服务历史</h2>
          {data.history.length ? (
            data.history.map((x) => (
              <p key={x.orderNumber}>
                <strong>{x.orderNumber}</strong>
                <span>
                  {date(x.occurredAt)} · {x.status}
                </span>
              </p>
            ))
          ) : (
            <p>暂无服务记录</p>
          )}
        </section>
        <section className={styles.privacy}>
          <h2>隐私与授权</h2>
          <p>你已同意 {data.profile.consent.version} 隐私授权。撤回后，此链接将立即失效。</p>
          {state === 'done' ? (
            <strong>授权已撤回</strong>
          ) : (
            <button onClick={revoke}>{state === 'confirm' ? '正在撤回…' : '撤回授权'}</button>
          )}
          {state === 'error' && <em>撤回失败，请稍后重试。</em>}
        </section>
      </div>
    </main>
  );
}
