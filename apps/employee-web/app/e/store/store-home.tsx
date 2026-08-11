'use client';

import { useEffect, useState } from 'react';
import {
  STORE_MANAGER_PACKAGE_ACTIONS,
  type MenuItemDto,
  type MenuScopeDto,
} from '@oneday/contracts';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Card, StatusBadge } from '@oneday/ui';
import styles from './store-home.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

type ManagedStore = { id: string; name: string };
type MenuPayload = {
  context?: string;
  roleCodes?: string[];
  scopes?: MenuScopeDto[];
  items?: MenuItemDto[];
};

export function StoreHome() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'empty' | 'error'>(
    'loading',
  );
  const [context, setContext] = useState('店长工作台');
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!(await sessionApi.context())) {
          if (!cancelled) setState('forbidden');
          return;
        }
        const [menuResponse, storesResponse] = await Promise.all([
          sessionApi.request(`${api}/api/v1/me/menu?product=employee`),
          sessionApi.request(`${api}/api/v1/employee/managed-stores`, {
            headers: { 'content-type': 'application/json' },
          }),
        ]);
        if (
          [menuResponse.status, storesResponse.status].some((status) =>
            [401, 403].includes(status),
          )
        ) {
          if (!cancelled) setState('forbidden');
          return;
        }
        if (!menuResponse.ok || !storesResponse.ok) throw new Error('LOAD');
        const menu = (await menuResponse.json()).data as MenuPayload;
        const managed = (await storesResponse.json()).data as {
          stores?: ManagedStore[];
        };
        if (cancelled) return;
        const storeList = managed.stores ?? [];
        setContext(menu.context ?? '店长工作台');
        setRoles(menu.roleCodes ?? []);
        setStores(storeList);
        setState(storeList.length ? 'ready' : 'empty');
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
          description="当前账号没有 data_scopes / store_managers 门店范围。店长入口能力需要门店任命后才会出现。"
          action={<a href="/e/workbench">返回工作台</a>}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>推广员工具 · 店长模式</p>
        <h1>门店入口首页</h1>
        <p>
          {context} · 统一入口与工作流；不碰钱、不碰销售、不代履约第三方订单。
        </p>
        <div className={styles.meta}>
          {roles.map((role) => (
            <StatusBadge key={role} tone="neutral">
              {role}
            </StatusBadge>
          ))}
        </div>
      </header>

      <section className={styles.package} aria-label="店长入口能力包">
        <h2>店长能力包</h2>
        <p>
          任务、线索、核销与分享复用员工端既有路由；写动作仍由服务端 scope 校验。本页不含支付金额。
        </p>
        <div className={styles.actions}>
          {STORE_MANAGER_PACKAGE_ACTIONS.map((action) => (
            <a className={styles.action} href={action.href} key={action.key}>
              {action.label}
            </a>
          ))}
        </div>
      </section>

      <section className={styles.grid} aria-label="授权门店">
        {stores.map((store) => (
          <Card key={store.id}>
            <h2>{store.name}</h2>
            <p>门店范围来自 data_scopes 与 store_managers 合并解析。</p>
            <p className={styles.id}>scope: store:{store.id}</p>
            <div className={styles.storeActions}>
              {STORE_MANAGER_PACKAGE_ACTIONS.map((action) => (
                <a href={action.href} key={`${store.id}-${action.key}`}>
                  {action.label}
                </a>
              ))}
            </div>
          </Card>
        ))}
      </section>
      <p className={styles.note}>
        推广员工具店长 chrome：桌面侧栏 + 门店首页能力包。不宣称完整九角色矩阵、全部商用或本平台下单。
      </p>
    </main>
  );
}
