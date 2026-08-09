import { AppStatePanel } from '@oneday/ui';

export default function NotFound() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="empty"
        title="没有找到这项工作内容"
        description="它可能已完成、被重新分配，或不在你的门店范围内。"
      />
    </main>
  );
}
