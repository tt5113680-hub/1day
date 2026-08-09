import { AppStatePanel } from '@oneday/ui';
import styles from './discovery.module.css';

export default function Loading() {
  return (
    <main className={styles.message} aria-busy="true" aria-live="polite">
      <AppStatePanel
        kind="loading"
        title="正在准备发现内容"
        description="渠道推荐、固定商圈和附近商户正在分别加载。"
      />
    </main>
  );
}
