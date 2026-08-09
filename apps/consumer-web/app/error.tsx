'use client';
import { AppStatePanel, Button } from '@oneday/ui';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="od-route-state">
      <AppStatePanel
        kind="error"
        title="门店内容暂时无法加载"
        description="请检查网络后重新尝试。"
        action={<Button onClick={reset}>重新加载</Button>}
      />
    </main>
  );
}
