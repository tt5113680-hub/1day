import styles from './discovery.module.css';

export default function Loading() {
  return (
    <main className={styles.message} aria-busy="true" aria-live="polite">
      <section className={styles.messageCard}>
        <h1>正在准备发现内容</h1>
        <p>渠道推荐、固定商圈和附近商户正在分别加载。</p>
      </section>
    </main>
  );
}
