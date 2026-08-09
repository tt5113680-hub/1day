import { AppStatePanel } from '@oneday/ui';

export default function Forbidden() {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="forbidden"
        title="需要平台治理权限"
        description="该操作仅向已获授权的平台运营人员开放。"
      />
    </main>
  );
}
