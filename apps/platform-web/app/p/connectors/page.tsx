'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, businessLabel, Button, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type Connector = {
  id: string;
  code: string;
  name: string;
  auth_mode: string;
  rate_limit_per_minute: number;
  health_status: string;
  health_checked_at: string | null;
  status: string;
  version: number;
  authorizations: { status: string; count: number }[];
  logs: { status: string; message: string; observedAt: string }[];
  capability: {
    definition: string;
    tenantAuthorization: string;
    externalDelivery: string;
  };
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const observationCopy = (value?: string) =>
  value === 'Platform observation recorded; no external call was performed.'
    ? '平台健康观察已记录，未执行外部调用。'
    : value || '暂无观察';
export default function PlatformConnectorsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [items, setItems] = useState<Connector[]>([]);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    authMode: 'api_key',
    rateLimitPerMinute: '120',
  });
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/connectors`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setItems((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const create = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/connectors`, {
        method: 'POST',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ ...form, rateLimitPerMinute: Number(form.rateLimitPerMinute) }),
      });
      if (response.status === 400)
        return setNote('请填写有效连接器编码、名称、授权方式与每分钟限流。');
      if (response.status === 409) return setNote('连接器编码已存在。');
      if (!response.ok) throw Error();
      setForm({ code: '', name: '', authMode: 'api_key', rateLimitPerMinute: '120' });
      setNote('平台连接器定义已保存；租户授权仅汇总已持久化状态。');
      await load();
    } catch {
      setNote('保存失败，事务已回滚。');
    } finally {
      setSaving(false);
    }
  };
  const observe = async (item: Connector) => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/platform/connectors/${item.id}/health-observations`,
        {
          method: 'POST',
          headers: {
            ...headers(),
            'content-type': 'application/json',
            'idempotency-key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            status: item.health_status === 'healthy' ? 'degraded' : 'healthy',
            message: 'Platform observation recorded; no external call was performed.',
            version: item.version,
          }),
        },
      );
      if (response.status === 409) return setNote('健康状态已更新，请刷新后重试。');
      if (!response.ok) throw Error();
      setNote('健康观察已记录到审计、事件和连接器日志；未声称执行外部调用。');
      await load();
    } catch {
      setNote('健康观察保存失败。');
    } finally {
      setSaving(false);
    }
  };

  const authModeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = businessLabel(item.auth_mode || '未分类');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [items]);

  const healthCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = businessLabel(item.health_status || 'unknown');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [items]);

  const authCounts = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const item of items) {
      for (const auth of item.authorizations) {
        const key = businessLabel(auth.status || '未分类');
        total += auth.count;
        map.set(key, (map.get(key) ?? 0) + auth.count);
      }
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return { total, list };
  }, [items]);

  const rateCounts = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const item of items) {
      const n = item.rate_limit_per_minute ?? 0;
      const key = n <= 120 ? '基础带宽 ≤120' : n <= 600 ? '标准带宽 121-600' : '高频带宽 601+';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([key, value]) => ({ key, value }));
  }, [items]);

  const logCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      for (const log of item.logs) {
        const key = businessLabel(log.status || '未分类');
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [items]);

  const totalLogs = items.reduce((acc, item) => acc + item.logs.length, 0);
  const connectedCount = items.filter((item) =>
    item.authorizations.some((a) => a.status === 'authorized'),
  ).length;

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载平台连接器"
          description="正在校验平台权限、租户授权与健康观察。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看平台连接器"
          description="该能力仅向具备平台连接器治理权限的运营人员开放。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="平台连接器暂不可用"
          description="连接器目录未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page} data-testid="platform-connectors">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 平台连接器</span>
        <span className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新目录
          </button>
        </span>
      </header>

      <section className={styles.heroCard} aria-label="平台连接器说明">
        <h1>连接器目录、租户授权与健康观察</h1>
        <p>
          定义、租户授权、健康、限流与日志。密钥不在平台页面读取；状态来自持久化授权与可审计观察。
          当前连接器仅声明意图边界，外部调用必须另行授权；不包含本平台收款、非本平台下单。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="平台连接器概况">
        <div>
          <span>连接器</span>
          <strong>{items.length}</strong>
        </div>
        <div>
          <span>运行正常</span>
          <strong>{items.filter((item) => item.health_status === 'healthy').length}</strong>
        </div>
        <div>
          <span>已授权租户</span>
          <strong>{connectedCount}</strong>
        </div>
        <div>
          <span>健康观察</span>
          <strong>{totalLogs}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="平台连接器分布">
        <div className={styles.panelBlock}>
          <h2>授权方式分布</h2>
          <ul className={styles.bars}>
            {authModeCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>健康状态分布</h2>
          <ul className={styles.bars}>
            {healthCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>租户授权分布</h2>
          <ul className={styles.bars}>
            {authCounts.list.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(authCounts.total, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!authCounts.total && <li className={styles.barEmpty}>暂无授权</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>限流带宽分布</h2>
          <ul className={styles.bars}>
            {rateCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(items.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!items.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>健康日志状态分布</h2>
          <ul className={styles.bars}>
            {logCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(totalLogs, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!totalLogs && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取平台连接器档案行现场推导（source=local）：授权方式、健康状态、租户授权、
        限流带宽与健康日志状态；连接器仅记录意图与健康观察，观察不会调用美团/抖音等外部平台；
        不包含本平台收款、非本平台下单；本地试点记录。
      </p>

      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}

      <section className={styles.layout}>
        <section className={styles.panel}>
          <h2>定义连接器</h2>
          <label>
            连接器编码
            <input
              aria-label="连接器编码"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="wechat"
            />
          </label>
          <label>
            连接器名称
            <input
              aria-label="连接器名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            授权方式
            <select
              aria-label="授权方式"
              value={form.authMode}
              onChange={(e) => setForm({ ...form, authMode: e.target.value })}
            >
              <option value="api_key">API 密钥</option>
              <option value="oauth">OAuth 授权</option>
              <option value="manual">人工授权</option>
            </select>
          </label>
          <label>
            每分钟限流
            <input
              aria-label="每分钟限流"
              type="number"
              value={form.rateLimitPerMinute}
              onChange={(e) => setForm({ ...form, rateLimitPerMinute: e.target.value })}
            />
          </label>
          <Button className={styles.submit} loading={saving} onClick={() => void create()}>
            保存连接器定义
          </Button>
        </section>
        <section className={styles.panel}>
          <div className={styles.head}>
            <h2>已定义连接器</h2>
            <StatusBadge tone={items.length ? 'success' : 'neutral'}>
              {items.length ? `${items.length} 个目录项` : '暂无连接器'}
            </StatusBadge>
          </div>
          {items.length ? (
            items.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.code} · {businessLabel(item.auth_mode)} · 每分钟{' '}
                    {item.rate_limit_per_minute} 次
                  </span>
                  <small>
                    租户授权：
                    {item.authorizations
                      .map((x) => `${businessLabel(x.status)} ${x.count}`)
                      .join('，') || '暂无'}
                    ；日志：{observationCopy(item.logs[0]?.message)}
                  </small>
                </div>
                <div className={styles.actions}>
                  <StatusBadge tone={item.health_status === 'healthy' ? 'success' : 'warning'}>
                    {businessLabel(item.health_status)}
                  </StatusBadge>
                  <small data-testid="connector-delivery-boundary">
                    外部投递：{businessLabel(item.capability.externalDelivery)}
                  </small>
                  <Button tone="secondary" loading={saving} onClick={() => void observe(item)}>
                    记录健康观察
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <AppStatePanel
              kind="empty"
              title="暂无平台连接器"
              description="在左侧登记第一个受控连接器定义。"
            />
          )}
        </section>
      </section>
    </main>
  );
}
