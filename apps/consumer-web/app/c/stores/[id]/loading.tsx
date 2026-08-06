import styles from './store.module.css';
export default function Loading() {
  return (
    <main className={styles.message} aria-busy="true">
      <section className={styles.messageCard}>
        <h1>正在准备门店详情</h1>
        <p>服务、权益和咨询入口正在加载。</p>
      </section>
    </main>
  );
}
