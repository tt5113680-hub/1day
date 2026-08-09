import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在准备服务入口"
        description="正在核验可公开访问的服务信息。"
      />
    </main>
  );
}
