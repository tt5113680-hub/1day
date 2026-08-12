'use client';

import { useMemo } from 'react';
import { AppStatePanel, Button } from '@oneday/ui';
import styles from './process.module.css';

export type ProcessData = {
  process: {
    id: string;
    status: string;
    consultationStatus: string;
    appointmentAt: string | null;
    exceptionFeedback: string | null;
  };
  order: { number: string; occurredAt: string; status: string };
  verification: { status: string; redeemedAt: string | null; expiresAt: string } | null;
  connectorResults: { connectorCode: string; status: string; receivedAt: string }[];
};

const countBy = (rows: string[]) => {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    buckets.set(row, (buckets.get(row) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};
const barWidth = (total: number, value: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

const stamp = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '待商家确认';

export function ProcessState({ kind }: { kind: 'forbidden' | 'error' }) {
  const copy: readonly [string, string] =
    kind === 'forbidden'
      ? ['进度暂不可查看', '请使用商家发送的专属链接，或联系顾问重新获取。']
      : ['进度加载失败', '网络连接不稳定，请稍后重新打开该链接。'];
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

export function ProcessPage({ data }: { data: ProcessData }) {
  const stages = [
    ['服务已登记', data.order.occurredAt],
    ['咨询进度', data.process.consultationStatus === 'completed' ? '已完成' : '顾问处理中'],
    ['预约安排', stamp(data.process.appointmentAt)],
    [
      '核销状态',
      data.verification?.status === 'redeemed'
        ? '已核销'
        : data.verification
          ? '待核销'
          : '暂未生成',
    ],
  ];
  const processStatusDist = useMemo(
    () => countBy([data.process.status || '处理中', data.order.status || '已登记']),
    [data.process.status, data.order.status],
  );
  const consultationDist = useMemo(
    () =>
      countBy([
        data.process.consultationStatus === 'completed' ? '咨询已完成' : '咨询处理中',
        data.process.appointmentAt ? '已预约安排' : '待预约安排',
      ]),
    [data.process.consultationStatus, data.process.appointmentAt],
  );
  const verificationDist = useMemo(
    () =>
      countBy([
        data.verification
          ? data.verification.status === 'redeemed'
            ? '已核销'
            : '待核销'
          : '暂未生成',
        data.process.exceptionFeedback ? '有异常反馈' : '无异常反馈',
      ]),
    [data.verification, data.process.exceptionFeedback],
  );
  const receiptDist = useMemo(
    () =>
      data.connectorResults.length
        ? countBy(data.connectorResults.map((item) => item.status || '未回执'))
        : [],
    [data.connectorResults],
  );

  return (
    <main className={`${styles.page} od-sf-theme`}>
      <header className={styles.topBar}>
        <span className={styles.topTitle}>服务过程</span>
        <span className={styles.topMark}>推广员工具</span>
      </header>

      <section className={styles.heroCard} aria-label="服务过程概况">
        <header className={styles.heroHead}>
          <span>推广员工具 · 门店服务过程</span>
          <h2>服务进度查询</h2>
          <p role="note">
            按真实门店侧服务痕迹汇总：登记、咨询、预约与核销进度，仅供引流与跟进参考。
          </p>
        </header>
        <div className={styles.summaryStrip} aria-label="服务过程数据概况">
          <dl>
            <dt>服务编号</dt>
            <dd>{data.order.number}</dd>
          </dl>
          <dl>
            <dt>当前状态</dt>
            <dd>{data.process.status}</dd>
          </dl>
          <dl>
            <dt>结果回执</dt>
            <dd>{data.connectorResults.length}</dd>
          </dl>
        </div>
      </section>

      <section className={styles.distribution} aria-label="服务过程分布">
        <header className={styles.panelHead}>
          <h3>服务过程分布</h3>
          <p>分布全部由已抓取服务过程档案行现场推导 · 仅统计门店侧痕迹，不涉及成交</p>
        </header>
        <div className={styles.panelBlock}>
          <span className={styles.barLabel}>进度状态分布</span>
          <div className={styles.bars} role="list">
            {processStatusDist.map((bar) => (
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
          <span className={styles.barLabel}>咨询与预约分布</span>
          <div className={styles.bars} role="list">
            {consultationDist.map((bar) => (
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
          <span className={styles.barLabel}>核销与异常分布</span>
          <div className={styles.bars} role="list">
            {verificationDist.map((bar) => (
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
          <span className={styles.barLabel}>结果回执状态分布</span>
          <div className={styles.bars} role="list">
            {receiptDist.length ? (
              receiptDist.map((bar) => (
                <div className={styles.barRow} role="listitem" key={bar.label}>
                  <span>{bar.label}</span>
                  <b>
                    <i style={{ width: `${barWidth(data.connectorResults.length, bar.value)}%` }} />
                  </b>
                  <em>{bar.value}</em>
                </div>
              ))
            ) : (
              <span className={styles.barEmpty}>暂无结果回执</span>
            )}
          </div>
        </div>
      </section>

      <p className={styles.honest} role="note">
        以上分布全部由已抓取服务过程档案行现场推导，源 source=local；
        本页仅展示门店侧服务痕迹与咨询进度；不是美团/抖音/扫呗等第三方订单履约，也不含支付金额。
        不在此下单，非本平台下单。
      </p>

      <section className={styles.hero}>
        <span>门店服务编号</span>
        <strong>{data.order.number}</strong>
        <p>当前状态：{data.process.status}</p>
      </section>
      <section className={styles.section}>
        <h2>处理进度</h2>
        <ol className={styles.timeline}>
          {stages.map(([label, value], index) => (
            <li key={label}>
              <i>{index + 1}</i>
              <div>
                <strong>{label}</strong>
                <p>{value}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      {data.connectorResults.length > 0 && (
        <section className={styles.section}>
          <h2>结果回执</h2>
          {data.connectorResults.map((item) => (
            <div className={styles.receipt} key={`${item.connectorCode}-${item.receivedAt}`}>
              <strong>{item.connectorCode}</strong>
              <span>{item.status}</span>
              <p>{stamp(item.receivedAt)}</p>
            </div>
          ))}
        </section>
      )}
      {data.process.exceptionFeedback && (
        <section className={styles.warning}>
          <h2>异常反馈</h2>
          <p>{data.process.exceptionFeedback}</p>
        </section>
      )}
      <p className={styles.foot}>
        此页面不展示身份信息；请勿转发专属查询链接。非本平台下单，第三方成交结果不在此回写。
      </p>
    </main>
  );
}
