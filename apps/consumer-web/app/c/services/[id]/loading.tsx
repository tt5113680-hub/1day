import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在打开服务详情"
        description="正在准备可预约的服务与权益说明。"
      />
    </main>
  );
}
