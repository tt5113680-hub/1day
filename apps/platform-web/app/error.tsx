'use client';
import { AppStatePanel, Button } from '@oneday/ui';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="error"
        title="治理数据暂时不可用"
        description="请检查网络后重新加载；平台命令仍受现有权限与审计约束。"
        action={<Button onClick={reset}>重新加载</Button>}
      />
    </main>
  );
}
