'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  STORE_MANAGER_PACKAGE_ACTIONS,
  type MenuItemDto,
  type MenuScopeDto,
} from '@oneday/contracts';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
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
type Bucket = { label: string; value: number };

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const scopeTypeLabel = (type: MenuScopeDto['type']) =>
  ({
    store: '门店范围',
    channel: '渠道范围',
    circle: '商圈范围',
    tenant: '租户范围',
    system: '系统范围',
  })[type] ?? type;

function Bars({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <div className={styles.bars}>
      {items.map((item) => (
        <div className={styles.barRow} key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </div>
          <span className={styles.barValue}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StoreHome() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'empty' | 'error'>(
    'loading',
  );
  const [context, setContext] = useState('店长工作台');
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [scopes, setScopes] = useState<MenuScopeDto[]>([]);

  const load = useCallback(async () => {
    try {
      if (!(await sessionApi.context())) {
        setState('forbidden');
        return;
      }
      setState('loading');
      const [menuResponse, storesResponse] = await Promise.all([
        sessionApi.request(`${api}/api/v1/me/menu?product=employee`),
        sessionApi.request(`${api}/api/v1/employee/managed-stores`, {
          headers: { 'content-type': 'application/json' },
        }),
      ]);
      if (
        [menuResponse.status, storesResponse.status].some((status) => [401, 403].includes(status))
      ) {
        setState('forbidden');
        return;
      }
      if (!menuResponse.ok || !storesResponse.ok) throw new Error('LOAD');
      const menu = (await menuResponse.json()).data as MenuPayload;
      const managed = (await storesResponse.json()).data as {
        stores?: ManagedStore[];
      };
      const storeList = managed.stores ?? [];
      setContext(menu.context ?? '店长工作台');
      setRoles(menu.roleCodes ?? []);
      setScopes(menu.scopes ?? []);
      setStores(storeList);
      setState(storeList.length ? 'ready' : 'empty');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const storeDist = useMemo(
    () => countBy(stores.map((store) => store.name || '未命名门店')),
    [stores],
  );
  const scopeTypeDist = useMemo(
    () => countBy(scopes.map((scope) => scopeTypeLabel(scope.type))),
    [scopes],
  );
  const roleDist = useMemo(
    () => countBy(roles.map((role) => role || '未标注角色')),
    [roles],
  );
  const scopeLabelDist = useMemo(
    () => countBy(scopes.map((scope) => scope.label || `${scope.type}:${scope.id.slice(0, 8)}`)),
    [scopes],
  );

  if (state === 'loading') {
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载门店工作台" />
      </main>
    );
  }
  if (state === 'forbidden') {
    return (
      <main className={styles.centered}>
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
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="门店工作台暂时不可用"
          description="请稍后重试，或回到执行工作台继续处理任务。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  }

  return (
    <main className={styles.page} data-testid="employee-store-home">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 店长模式</span>
        <div className={styles.topBarActions}>
          <a className={styles.topBarLink} href="/e/workbench">
            工作台
          </a>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </div>
      </header>

      <section className={styles.heroCard} aria-label="门店入口概览">
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
      </section>

      {state === 'empty' ? (
        <section className={styles.section}>
          <AppStatePanel
            kind="empty"
            title="尚未任命门店"
            description="当前账号没有 data_scopes / store_managers 门店范围。店长入口能力需要门店任命后才会出现。"
            action={<a href="/e/workbench">返回工作台</a>}
          />
        </section>
      ) : (
        <>
          <section className={styles.panel} aria-label="门店概况">
            <div className={styles.summaryStrip}>
              <div>
                <span>授权门店</span>
                <strong>{stores.length}</strong>
              </div>
              <div>
                <span>数据范围</span>
                <strong>{scopes.length}</strong>
              </div>
              <div>
                <span>会话角色</span>
                <strong>{roles.length}</strong>
              </div>
              <div>
                <span>能力入口</span>
                <strong>{STORE_MANAGER_PACKAGE_ACTIONS.length}</strong>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-label="门店授权分布">
            <div className={styles.panelHead}>
              <h2>门店授权分布</h2>
              <span className={styles.panelMeta}>由授权门店与菜单范围真实行推导</span>
            </div>
            <div className={styles.distribution}>
              <div className={styles.panelBlock}>
                <h3>授权门店分布</h3>
                <Bars items={storeDist} total={stores.length} />
              </div>
              <div className={styles.panelBlock}>
                <h3>数据范围类型分布</h3>
                <Bars items={scopeTypeDist} total={scopes.length} />
              </div>
              <div className={styles.panelBlock}>
                <h3>会话角色分布</h3>
                <Bars items={roleDist} total={roles.length} />
              </div>
              <div className={styles.panelBlock}>
                <h3>数据范围标签分布</h3>
                <Bars items={scopeLabelDist} total={scopes.length} />
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-label="店长入口能力包">
            <div className={styles.panelHead}>
              <h2>店长能力包</h2>
              <span className={styles.panelMeta}>{STORE_MANAGER_PACKAGE_ACTIONS.length} 项入口</span>
            </div>
            <p className={styles.panelCopy}>
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

          <section className={styles.section} aria-label="授权门店">
            <div className={styles.sectionHead}>
              <h2>授权门店</h2>
              <span>{stores.length} 家</span>
            </div>
            {stores.map((store) => (
              <article className={styles.storeCard} key={store.id}>
                <h3>{store.name}</h3>
                <p>门店范围来自 data_scopes 与 store_managers 合并解析。</p>
                <p className={styles.id}>scope: store:{store.id}</p>
                <div className={styles.storeActions}>
                  {STORE_MANAGER_PACKAGE_ACTIONS.map((action) => (
                    <a href={action.href} key={`${store.id}-${action.key}`}>
                      {action.label}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      <p className={styles.honest} role="note">
        以上分布全部由已抓取店长授权档案行现场推导(source=local)：授权门店、数据范围类型、会话角色与范围标签均由真实
        managed-stores 与 me/menu scopes 行统计。推广员工具店长模式不碰钱、不含支付金额，非本平台下单。
      </p>
      <p className={styles.note}>
        推广员工具店长 chrome：桌面侧栏 + 门店首页能力包。不宣称完整九角色矩阵、全部商用或本平台下单。
      </p>
    </main>
  );
}
