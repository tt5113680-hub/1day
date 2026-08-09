import { AppStatePanel } from '@oneday/ui';

export default function Forbidden() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="forbidden"
        title="此任务不在你的工作范围内"
        description="请切换到获授权的门店或联系管理员确认岗位权限。"
      />
    </main>
  );
}
