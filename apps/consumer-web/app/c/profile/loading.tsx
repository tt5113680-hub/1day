import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="consumer-loading" aria-busy="true" aria-live="polite">
      <AppStatePanel
        kind="loading"
        title="正在读取会员资料"
        description="会员身份、权益与服务记录正在安全加载。"
      />
    </main>
  );
}
