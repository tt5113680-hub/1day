import { AppStatePanel } from '@oneday/ui';

export default function NotFound() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="empty"
        title="没有找到治理页面"
        description="请从左侧导航返回当前平台权限范围内的功能。"
      />
    </main>
  );
}
