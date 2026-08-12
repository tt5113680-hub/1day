import styles from '../page.module.css';

export type QueueDisposition =
  | {
      kind: 'anomaly';
      type: string;
      label: string;
      title: string;
      occurredAt: string;
      id: string;
      disposition: 'pending' | 'handled' | 'ignored';
    }
  | {
      kind: 'consult';
      label: string;
      title: string;
      occurredAt: string;
      id: string;
      disposition: 'pending' | 'handled' | 'ignored';
    }
  | {
      kind: 'lead';
      label: string;
      title: string;
      status: string;
      occurredAt: string;
      id: string;
      disposition: 'pending' | 'handled' | 'ignored';
    };

const queueTypeOf = (item: QueueDisposition) => {
  if (item.kind === 'anomaly') return item.type;
  return item.kind;
};

const formatDate = (value: string, withTime: boolean) => {
  const date = new Date(value);
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
};

export function QueueRow({
  item,
  deepLink,
  busy,
  dispose,
}: {
  item: QueueDisposition;
  deepLink: string;
  busy: string | null;
  dispose: (
    type: string,
    sourceId: string,
    action: 'handled' | 'ignored',
    title: string,
    deepLink: string,
  ) => void;
}) {
  const statusLabel =
    item.disposition === 'handled' ? '已处理' : item.disposition === 'ignored' ? '已忽略' : null;
  const timeLabel =
    item.kind === 'consult'
      ? formatDate(item.occurredAt, true)
      : formatDate(item.occurredAt, false);
  const copy =
    item.kind === 'lead'
      ? `${item.title}${item.status === 'open' ? ' · 待认领' : ' · 已认领'} · ${timeLabel}`
      : `${item.title} · ${timeLabel}`;
  return (
    <article className={styles.queueRow} key={item.id}>
      <div className={styles.queueCopy}>
        <strong>{item.label}</strong>
        <span>{copy}</span>
      </div>
      <div className={styles.queueActions}>
        <a className={styles.queueLink} href={deepLink}>
          打开 →
        </a>
        {statusLabel ? (
          <span
            className={
              item.disposition === 'handled' ? styles.queueHandledText : styles.queueIgnoredText
            }
          >
            {statusLabel}
          </span>
        ) : (
          <>
            <button
              className={`${styles.queueButton} ${styles.queueHandled}`}
              type="button"
              disabled={busy !== null}
              onClick={() => dispose(queueTypeOf(item), item.id, 'handled', item.title, deepLink)}
            >
              已处理
            </button>
            <button
              className={`${styles.queueButton} ${styles.queueIgnored}`}
              type="button"
              disabled={busy !== null}
              onClick={() => dispose(queueTypeOf(item), item.id, 'ignored', item.title, deepLink)}
            >
              忽略
            </button>
          </>
        )}
      </div>
    </article>
  );
}
