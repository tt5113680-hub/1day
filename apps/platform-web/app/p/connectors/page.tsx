'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  businessLabel,
  Button,
  Card,
  StatusBadge,
} from '@oneday/ui';

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
  capability: {
    definition: string;
    tenantAuthorization: string;
    externalDelivery: string;
  };
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
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
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 平台连接器治理"
        title="定义、租户授权、健康、限流与日志"
        description="密钥不在平台页面读取；状态来自持久化授权与可审计观察。当前连接器仅声明意图边界，外部调用必须另行授权。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新目录
          </Button>
        }
      />
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <Card className={styles.panel}>
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
        </Card>
        <Card className={styles.panel}>
          <h2>已定义连接器</h2>
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
        </Card>
      </section>
    </main>
  );
}
