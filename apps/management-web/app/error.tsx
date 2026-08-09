'use client';
import { AppStatePanel, Button } from '@oneday/ui';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="error"
        title="经营数据暂时不可用"
        description="请检查网络后重新加载；已完成的经营操作不会被重复提交。"
        action={<Button onClick={reset}>重新加载</Button>}
      />
    </main>
  );
}
