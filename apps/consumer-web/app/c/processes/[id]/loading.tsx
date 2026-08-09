import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在读取服务进度"
        description="正在安全加载当前服务的进展信息。"
      />
    </main>
  );
}
