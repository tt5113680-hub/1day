import { AppStatePanel } from '@oneday/ui';

export default function Forbidden() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="forbidden"
        title="暂无访问权限"
        description="请返回可公开访问的页面，或使用已获授权的账号继续。"
      />
    </main>
  );
}
