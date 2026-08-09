import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在整理经营数据"
        description="正在加载当前租户和门店范围内的经营信息。"
      />
    </main>
  );
}
