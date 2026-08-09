import { AppStatePanel } from '@oneday/ui';

export default function NotFound() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="empty"
        title="没有找到经营页面"
        description="请从左侧导航返回当前租户可用的经营功能。"
      />
    </main>
  );
}
