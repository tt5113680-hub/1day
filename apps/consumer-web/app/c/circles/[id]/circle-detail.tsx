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
  return (
    <MobileShell>
      <FunnelPageBeacon
        tenantSlug={data.tenant.slug}
        surface="circle"
        moduleKey="circle_detail"
        scene="circle_detail"
      />
      <main className={styles.page}>
        <div className={styles.shell}>
          <a className={styles.back} href={listHref}>
            返回商圈
          </a>
          <section className={styles.detailHero}>
            <p className={styles.eyebrow}>
              {data.circle.owner.name} · {data.circle.industryTag ?? '商家联盟'}
            </p>
            <h1 className={styles.title}>{data.circle.name}</h1>
            <p className={styles.intro}>
              {data.circle.description ?? '圈内商家互助引流；进店后可跳转第三方平台。'}
            </p>
            {data.circle.address ? <p className={styles.meta}>{data.circle.address}</p> : null}
          </section>
          <section className={styles.merchants} aria-label="圈内商家">
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
                    {merchant.name}
                    <span>进店 ›</span>
                  </a>
                ) : (
                  <div className={styles.merchant} key={merchant.id}>
                    {merchant.name}
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
