'use client';

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
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>推广员工具 · 门店服务过程</p>
      <h1>服务进度查询</h1>
      <p className={styles.disclaimer} role="note">
        本页仅展示门店侧服务痕迹与咨询进度；不是美团/抖音/扫呗等第三方订单履约，也不含支付金额。
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
