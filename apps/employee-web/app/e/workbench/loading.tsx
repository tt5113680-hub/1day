import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在准备今日行动"
        description="正在同步你的任务与客户提醒。"
      />
    </main>
  );
}
