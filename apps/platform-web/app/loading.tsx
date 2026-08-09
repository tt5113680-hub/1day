import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在加载治理控制台"
        description="正在同步租户、渠道与商圈治理数据。"
      />
    </main>
  );
}
