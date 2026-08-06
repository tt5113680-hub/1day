import styles from './service.module.css';
export default function Loading() {
  return (
    <main className={styles.message} aria-busy="true">
      <section className={styles.messageCard}>
        <h1>正在准备服务详情</h1>
        <p>服务说明、适用门店和权益正在加载。</p>
      </section>
    </main>
  );
}
