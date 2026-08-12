'use client';

import { useMemo } from 'react';
import { AppStatePanel, Button, MobileShell } from '@oneday/ui';
import { FunnelPageBeacon } from '../../funnel-page-beacon';
import { trackFunnelEvent } from '../../entry-funnel-client';
import styles from '../circles.module.css';

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

export type CircleDetailData = {
  tenant: { slug: string; name: string };
  circle: {
    id: string;
    name: string;
    description: string | null;
    industryTag: string | null;
    address: string | null;
    publicVisible: boolean;
    ownedByViewer: boolean;
    owner: { slug: string; name: string };
  };
  merchants: { id: string; name: string; entryUrl: string | null }[];
};

export function CircleDetailState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy: readonly [string, string] =
    kind === 'forbidden'
      ? ['商圈暂不可访问', '请确认链接有效，或返回商圈列表。']
      : ['商圈详情加载失败', '网络连接暂不可用，请稍后重新加载。'];
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

export default function CircleDetail({ data }: { data: CircleDetailData }) {
  const listHref = `/c/circles?tenant=${encodeURIComponent(data.tenant.slug)}`;
  const withStore = data.merchants.filter((m) => m.entryUrl).length;
  const merchantsTotal = data.merchants.length;

  const entranceDist = useMemo(
    () => countBy(data.merchants.map((m) => (m.entryUrl ? '可进店' : '暂无店页'))),
    [data.merchants],
  );
  const identityDist = useMemo(
    () =>
      countBy([
        data.circle.ownedByViewer ? '本店经营' : '消费者视角',
        data.circle.publicVisible ? '公开引流' : '定向可见',
      ]),
    [data.circle.ownedByViewer, data.circle.publicVisible],
  );
  const ownerDist = useMemo(() => countBy(data.merchants.map((m) => m.name)), [data.merchants]);

  return (
    <MobileShell>
      <FunnelPageBeacon
        tenantSlug={data.tenant.slug}
        surface="circle"
        moduleKey="circle_detail"
        scene="circle_detail"
        circleId={data.circle.id}
      />
      <main className={styles.page}>
        <div className={styles.shell}>
          <a className={styles.back} href={listHref}>
            返回商圈
          </a>
          <section className={styles.detailHero}>
            <p className={styles.eyebrow}>
              推广员工具 · 商圈详情 · {data.circle.owner.name} ·{' '}
              {data.circle.industryTag ?? '商家联盟'}
            </p>
            <div className={styles.heroBadges}>
              {data.circle.ownedByViewer ? (
                <span className={styles.roleChip}>本店经营</span>
              ) : (
                <span className={styles.roleChipMuted}>消费者视角</span>
              )}
              {data.circle.publicVisible ? (
                <span className={styles.roleChipMuted}>公开引流</span>
              ) : null}
            </div>
            <h1 className={styles.title}>{data.circle.name}</h1>
            <p className={styles.intro}>
              {data.circle.description ?? '圈内商家互助引流；进店后可跳转第三方平台。'}
            </p>
            {data.circle.address ? <p className={styles.meta}>{data.circle.address}</p> : null}
            <p className={styles.meta}>
              {merchantsTotal} 家入驻 · {withStore} 家可进店
            </p>
            <p className={styles.disclaimer} role="note">
              进店后的团购/收银跳转由第三方完成；本页只统计入口痕迹，不在此下单，也不含支付金额。
            </p>
          </section>

          <section className={styles.heroCard} aria-label="商圈详情概况">
            <header className={styles.heroHead}>
              <span>推广员工具 · 商圈详情 · {data.circle.name}</span>
              <h2>{data.circle.name}</h2>
              <p role="note">
                按真实商圈档案汇总：入驻商户、进店入口与公开可见，仅供入口分流参考。
              </p>
            </header>
            <div className={styles.summaryStrip} aria-label="商圈详情数据概况">
              <dl>
                <dt>入驻商户</dt>
                <dd>{merchantsTotal}</dd>
              </dl>
              <dl>
                <dt>可进店</dt>
                <dd>{withStore}</dd>
              </dl>
              <dl>
                <dt>商圈身份</dt>
                <dd>{data.circle.ownedByViewer ? '本店经营' : '消费者视角'}</dd>
              </dl>
            </div>
          </section>

          <section className={styles.distribution} aria-label="商圈详情分布">
            <header className={styles.panelHead}>
              <h3>商圈详情分布</h3>
              <p>分布由已抓取商圈详情档案行现场推导 · 仅统计入口痕迹与商家发现，不涉及成交</p>
            </header>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>商户可进店分布</span>
              <div className={styles.bars} role="list">
                {entranceDist.length ? (
                  entranceDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(merchantsTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无商户记录</span>
                )}
              </div>
            </div>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>商圈身份分布</span>
              <div className={styles.bars} role="list">
                {identityDist.map((bar) => (
                  <div className={styles.barRow} role="listitem" key={bar.label}>
                    <span>{bar.label}</span>
                    <b>
                      <i style={{ width: `${barWidth(2, bar.value)}%` }} />
                    </b>
                    <em>{bar.value}</em>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.panelBlock}>
              <span className={styles.barLabel}>入驻商户分布</span>
              <div className={styles.bars} role="list">
                {ownerDist.length ? (
                  ownerDist.map((bar) => (
                    <div className={styles.barRow} role="listitem" key={bar.label}>
                      <span>{bar.label}</span>
                      <b>
                        <i style={{ width: `${barWidth(merchantsTotal, bar.value)}%` }} />
                      </b>
                      <em>{bar.value}</em>
                    </div>
                  ))
                ) : (
                  <span className={styles.barEmpty}>暂无商户记录</span>
                )}
              </div>
            </div>
          </section>

          <p className={styles.honest} role="note">
            以上分布全部由已抓取商圈详情档案行现场推导，源 source=local；
            商圈互助是入口引流与商家发现，进店后的团购/收银跳转由美团/抖音/扫呗等外部平台完成；
            仅统计观看/访问/跳转/停留/分享入口痕迹，不含支付金额。不在此下单，非本平台下单。
          </p>

          <section className={styles.merchants} aria-label="圈内商家">
            <h2 className={styles.sectionTitle}>圈内商家</h2>
            {data.merchants.length ? (
              data.merchants.map((merchant) =>
                merchant.entryUrl ? (
                  <a
                    className={styles.merchant}
                    href={merchant.entryUrl}
                    key={merchant.id}
                    onClick={() =>
                      void trackFunnelEvent(data.tenant.slug, {
                        eventCode: 'impression',
                        surface: 'circle',
                        moduleKey: 'circle_merchant_card',
                        circleId: data.circle.id,
                        scene: 'circle_to_store',
                        payload: { merchantName: merchant.name },
                      })
                    }
                  >
                    <span className={styles.merchantName}>{merchant.name}</span>
                    <span>进店 ›</span>
                  </a>
                ) : (
                  <div className={styles.merchant} key={merchant.id}>
                    <span className={styles.merchantName}>{merchant.name}</span>
                    <span>暂无店页</span>
                  </div>
                ),
              )
            ) : (
              <div className={styles.empty}>圈内暂无已入驻商家。</div>
            )}
          </section>
        </div>
      </main>
    </MobileShell>
  );
}
