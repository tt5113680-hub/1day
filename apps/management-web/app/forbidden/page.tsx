import { AppStatePanel } from '@oneday/ui';

export default function Forbidden() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="forbidden"
        title="当前角色没有经营权限"
        description="请返回经营总览，或由租户管理员调整你的角色范围。"
      />
    </main>
  );
}
