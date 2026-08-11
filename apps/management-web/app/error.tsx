'use client';
import { AppStatePanel, Button } from '@oneday/ui';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="error"
        title="工具数据暂时不可用"
        description="请检查网络后重新加载；已完成的工具操作不会被重复提交。"
        action={<Button onClick={reset}>重新加载</Button>}
      />
    </main>
  );
}
