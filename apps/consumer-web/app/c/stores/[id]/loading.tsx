import { AppStatePanel } from '@oneday/ui';

export default function Loading() {
  return (
    <main className="od-route-state">
      <AppStatePanel kind="loading" title="正在打开门店" description="正在准备该门店的公开内容。" />
    </main>
  );
}
