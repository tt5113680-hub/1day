'use client';

import { AppStatePanel, Button, MobileShell } from '@oneday/ui';
import { FunnelPageBeacon } from '../../funnel-page-beacon';
import { trackFunnelEvent } from '../../entry-funnel-client';
import styles from '../circles.module.css';

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
              {data.merchants.length} 家入驻 · {withStore} 家可进店
            </p>
            <p className={styles.disclaimer} role="note">
              进店后的团购/收银跳转由第三方完成；本页只统计入口痕迹，不在此下单，也不含支付金额。
            </p>
          </section>
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
