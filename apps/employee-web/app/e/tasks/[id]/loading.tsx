import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在加载任务详情"
        description="正在核验任务与客户的当前授权范围。"
      />
    </main>
  );
}
