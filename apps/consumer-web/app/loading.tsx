import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="loading"
        title="正在打开数字门店"
        description="正在准备公开的门店与服务内容。"
      />
    </main>
  );
}
