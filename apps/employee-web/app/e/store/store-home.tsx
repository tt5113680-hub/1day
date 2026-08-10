'use client';

import { useEffect, useState } from 'react';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Card, StatusBadge } from '@oneday/ui';
import type { MenuScopeDto } from '@oneday/contracts';
import styles from './store-home.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

type MenuPayload = {
  context?: string;
  roleCodes?: string[];
  scopes?: MenuScopeDto[];
  homeHref?: string;
};

export function StoreHome() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'empty' | 'error'>(
    'loading',
  );
  const [context, setContext] = useState('店长工作台');
  const [stores, setStores] = useState<MenuScopeDto[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) {
          if (!cancelled) setState('forbidden');
          return;
        }
        const response = await sessionApi.request(`${api}/api/v1/me/menu?product=employee`);
        if (response.status === 401 || response.status === 403) {
          if (!cancelled) setState('forbidden');
          return;
        }
        if (!response.ok) throw new Error('LOAD');
        const payload = (await response.json()).data as MenuPayload;
        if (cancelled) return;
        const storeScopes = (payload.scopes ?? []).filter((scope) => scope.type === 'store');
        setContext(payload.context ?? '店长工作台');
        setRoles(payload.roleCodes ?? []);
        setStores(storeScopes);
        setState(storeScopes.length ? 'ready' : 'empty');
      } catch {
        if (!cancelled) setState('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <main className={styles.page}>
        <AppStatePanel kind="loading" title="正在加载门店工作台" />
      </main>
    );
  }
  if (state === 'forbidden') {
    return (
      <main className={styles.page}>
        <AppStatePanel
          kind="forbidden"
          title="无权进入店长工作台"
          description="需要有效的员工会话与门店任命。"
        />
      </main>
    );
  }
  if (state === 'error') {
    return (
      <main className={styles.page}>
        <AppStatePanel
          kind="error"
          title="门店工作台暂时不可用"
          description="请稍后重试，或回到执行工作台继续处理任务。"
          action={<a href="/e/workbench">返回工作台</a>}
        />
      </main>
    );
  }
  if (state === 'empty') {
    return (
      <main className={styles.page}>
        <AppStatePanel
          kind="empty"
          title="尚未任命门店"
          description="当前账号没有 store_managers 任命。店长经营能力需要门店任命后才会出现。"
          action={<a href="/e/workbench">返回工作台</a>}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Store Manager · Role home</p>
        <h1>门店经营首页</h1>
        <p>{context}</p>
        <div className={styles.meta}>
          {roles.map((role) => (
            <StatusBadge key={role} tone="neutral">
              {role}
            </StatusBadge>
          ))}
        </div>
      </header>
      <section className={styles.grid} aria-label="授权门店">
        {stores.map((store) => (
          <Card key={store.id}>
            <h2>{store.label}</h2>
            <p>门店范围已由服务端菜单 DTO 下发，后续排班/核销/门店内容维护将挂在此范围上。</p>
            <p className={styles.id}>scope: store:{store.id}</p>
          </Card>
        ))}
      </section>
      <p className={styles.note}>
        本页是 SYS-6 店长首页骨架：证明 membership → store_managers →
        导航/范围闭环。完整店长经营写能力仍为多周范围，不宣称全部商用。
      </p>
    </main>
  );
}
