import { AppStatePanel } from '@oneday/ui';

export default function NotFound() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="empty"
        title="没有找到这个门店页面"
        description="链接可能已失效，或该门店暂未对外开放。"
      />
    </main>
  );
}
