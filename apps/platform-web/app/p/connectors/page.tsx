'use client';
import { SessionApiClient } from '@oneday/session-client';

import { useCallback, useEffect, useState } from 'react';
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
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
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
  if (state === 'loading') return <main className={styles.centered}>正在加载平台连接器…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看平台连接器</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>平台连接器暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 平台连接器</p>
          <h1>定义、租户授权、健康、限流与日志</h1>
          <span>密钥不在平台页面读取；状态来自持久化授权与可审计观察，外部调用必须另行授权。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
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
              <option value="api_key">api_key</option>
              <option value="oauth">oauth</option>
              <option value="manual">manual</option>
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
          <button disabled={saving} onClick={() => void create()}>
            {saving ? '正在保存…' : '保存连接器定义'}
          </button>
        </section>
        <section className={styles.panel}>
          <h2>已定义连接器</h2>
          {items.length ? (
            items.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.code} · {item.auth_mode} · {item.rate_limit_per_minute}/min
                  </span>
                  <small>
                    健康：{item.health_status}；租户授权：
                    {item.authorizations.map((x) => `${x.status} ${x.count}`).join('，') || '暂无'}
                    ；日志：{item.logs[0]?.message || '暂无观察'}
                  </small>
                </div>
                <button disabled={saving} onClick={() => void observe(item)}>
                  记录健康观察
                </button>
              </article>
            ))
          ) : (
            <p>暂无平台连接器。</p>
          )}
        </section>
      </section>
    </main>
  );
}
