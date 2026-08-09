'use client';
import { AppStatePanel, Button } from '@oneday/ui';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="error"
        title="工作台暂时无法连接"
        description="请检查网络后重新加载，未提交的动作不会被重复执行。"
        action={<Button onClick={reset}>重新加载</Button>}
      />
    </main>
  );
}
