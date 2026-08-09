import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在准备经营工作台"
        description="正在同步你的任务、客户与提醒。"
      />
    </main>
  );
}
