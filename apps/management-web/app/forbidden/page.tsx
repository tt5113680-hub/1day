import { AppStatePanel } from '@oneday/ui';

export default function Forbidden() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="forbidden"
        title="当前角色没有工具访问权限"
        description="请返回推广员工具工作台，或由租户管理员调整你的角色范围。"
      />
    </main>
  );
}
