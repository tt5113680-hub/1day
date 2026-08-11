'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge, businessLabel } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type Merchant = {
  tenantId: string;
  slug: string;
  name: string;
  status: string;
  onboardingStatus?: string;
  serviceStatus?: string;
};
type Channel = {
  id: string;
  code: string;
  name: string;
  status: string;
  onboardingStatus: string;
  serviceStatus: string;
  version: number;
  merchants: Merchant[];
};
type Data = { channels: Channel[]; merchantPool: Merchant[] };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const channelStatusLabel = (value: string | undefined) =>
  ({ open: '渠道开放' })[value ?? ''] ?? businessLabel(value ?? '');
const onboardingLabel = (value: string | undefined) =>
  ({ invited: '已邀请', onboarding: '开通中', active: '有效', paused: '已暂停' })[value ?? ''] ??
  businessLabel(value ?? '');
const serviceLabel = (value: string | undefined) =>
  ({ pending: '待确认', ready: '已就绪', degraded: '服务降级', blocked: '已阻断' })[value ?? ''] ??
  businessLabel(value ?? '');
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

export default function ChannelsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data>({ channels: [], merchantPool: [] });
  const [form, setForm] = useState({
    code: '',
    name: '',
    merchantTenantId: '',
    onboardingStatus: 'invited',
    serviceStatus: 'pending',
  });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/channels`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setData((await response.json()).data);
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
      const response = await sessionApi.request(`${api}/api/v1/platform/channels`, {
        method: 'POST',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(form),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('渠道编码已存在，请使用新的一级渠道编码。');
      if (response.status === 400) return setNote('请填写有效的渠道信息并选择可开通商户。');
      if (!response.ok) throw Error();
      setNote('渠道与商户池条目已创建，并已记录审计与投递事件。');
      setForm({
        code: '',
        name: '',
        merchantTenantId: '',
        onboardingStatus: 'invited',
        serviceStatus: 'pending',
      });
      await load();
    } catch {
      setNote('渠道创建失败，未完成的事务不会保留，请检查输入后重试。');
    } finally {
      setSaving(false);
    }
  };
  const counts = (fn: (x: Channel) => string) => {
    const map = new Map<string, number>();
    for (const x of data.channels) {
      const key = fn(x);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  };
  const flatCounts = (fn: (m: Merchant) => string) => {
    const map = new Map<string, number>();
    for (const x of data.channels)
      for (const m of x.merchants) {
        const key = fn(m);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  };
  const channelServiceCounts = useMemo(
    () => counts((x) => serviceLabel(x.serviceStatus)).sort((a, b) => b.value - a.value),
    [data.channels],
  );
  const channelStatusCounts = useMemo(
    () => counts((x) => channelStatusLabel(x.status)).sort((a, b) => b.value - a.value),
    [data.channels],
  );
  const merchantOnboardingCounts = useMemo(
    () => flatCounts((m) => onboardingLabel(m.onboardingStatus)).sort((a, b) => b.value - a.value),
    [data.channels],
  );
  const merchantServiceCounts = useMemo(
    () => flatCounts((m) => serviceLabel(m.serviceStatus)).sort((a, b) => b.value - a.value),
    [data.channels],
  );
  const channelScaleCounts = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const x of data.channels) {
      const n = x.merchants.length;
      const key = n <= 0 ? '未挂商户 0' : n <= 3 ? '精简规模 1-3' : '规模渠道 4+';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([key, value]) => ({ key, value }));
  }, [data.channels]);
  const totalMerchants = useMemo(
    () => data.channels.reduce((sum, x) => sum + x.merchants.length, 0),
    [data.channels],
  );
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载渠道经营数据"
          description="正在汇总一级渠道、商户池与服务状态。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看平台渠道管理" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="渠道管理暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page} data-testid="platform-channels">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 平台渠道管理</span>
        <span className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新
          </button>
        </span>
      </header>

      <section className={styles.heroCard} aria-label="平台渠道管理说明">
        <h1>一级渠道、商户池与服务状态</h1>
        <p>
          只管理一级渠道；商户开通进度和服务状态均以持久化记录为准。渠道是工具开通与整合网络，不涉及本平台收款、非本平台下单。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="平台渠道概况">
        <div>
          <span>一级渠道</span>
          <strong>{data.channels.length}</strong>
        </div>
        <div>
          <span>纳入商户</span>
          <strong>{totalMerchants}</strong>
        </div>
        <div>
          <span>已就绪服务</span>
          <strong>{data.channels.filter((x) => x.serviceStatus === 'ready').length}</strong>
        </div>
        <div>
          <span>商户池</span>
          <strong>{data.merchantPool.length}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="渠道运营分布">
        <div className={styles.panelBlock}>
          <h2>渠道服务状态分布</h2>
          <ul className={styles.bars}>
            {channelServiceCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(data.channels.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.channels.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>渠道规模分布</h2>
          <ul className={styles.bars}>
            {channelScaleCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(data.channels.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.channels.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>商户开通状态分布</h2>
          <ul className={styles.bars}>
            {merchantOnboardingCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(totalMerchants, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!totalMerchants && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>商户服务状态分布</h2>
          <ul className={styles.bars}>
            {merchantServiceCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(totalMerchants, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!totalMerchants && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>渠道状态分布</h2>
          <ul className={styles.bars}>
            {channelStatusCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(data.channels.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!data.channels.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取平台渠道档案行现场推导（source=local）：渠道服务状态、渠道规模、商户开通状态、商户服务状态与渠道状态；
        渠道是工具开通与整合网络，不包含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据。
      </p>

      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <section className={styles.panel}>
          <h2>建立一级渠道</h2>
          <label>
            渠道编码
            <input
              aria-label="渠道编码"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="regional-partner"
            />
          </label>
          <label>
            渠道名称
            <input
              aria-label="渠道名称"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            商户池租户
            <select
              aria-label="商户池租户"
              value={form.merchantTenantId}
              onChange={(event) => setForm({ ...form, merchantTenantId: event.target.value })}
            >
              <option value="">选择已开通商户</option>
              {data.merchantPool.map((merchant) => (
                <option key={merchant.tenantId} value={merchant.tenantId}>
                  {merchant.name} ({merchant.slug})
                </option>
              ))}
            </select>
          </label>
          <label>
            开通状态
            <select
              aria-label="开通状态"
              value={form.onboardingStatus}
              onChange={(event) => setForm({ ...form, onboardingStatus: event.target.value })}
            >
              <option value="invited">已邀请</option>
              <option value="onboarding">开通中</option>
              <option value="active">有效</option>
              <option value="paused">已暂停</option>
            </select>
          </label>
          <label>
            服务状态
            <select
              aria-label="服务状态"
              value={form.serviceStatus}
              onChange={(event) => setForm({ ...form, serviceStatus: event.target.value })}
            >
              <option value="pending">待确认</option>
              <option value="ready">已就绪</option>
              <option value="degraded">服务降级</option>
              <option value="blocked">已阻断</option>
            </select>
          </label>
          <Button
            disabled={!data.merchantPool.length}
            loading={saving}
            onClick={() => void create()}
          >
            创建渠道并纳入商户
          </Button>
        </section>
        <section className={styles.panel}>
          <h2>可开通商户池</h2>
          {data.merchantPool.length ? (
            data.merchantPool.map((merchant) => (
              <article className={styles.pool} key={merchant.tenantId}>
                <strong>{merchant.name}</strong>
                <span>{merchant.slug}</span>
                <StatusBadge tone={merchant.status === 'active' ? 'success' : 'warning'}>
                  {businessLabel(merchant.status)}
                </StatusBadge>
              </article>
            ))
          ) : (
            <p>暂无可纳入渠道的已开通商户。</p>
          )}
        </section>
      </section>
      <section className={styles.channels}>
        <h2>已配置渠道</h2>
        {data.channels.length ? (
          data.channels.map((channel) => (
            <article key={channel.id}>
              <header>
                <div>
                  <strong>{channel.name}</strong>
                  <span>
                    {channel.code} · {onboardingLabel(channel.onboardingStatus)}
                  </span>
                </div>
                <StatusBadge tone={channel.serviceStatus === 'ready' ? 'success' : 'warning'}>
                  服务：{serviceLabel(channel.serviceStatus)}
                </StatusBadge>
              </header>
              <div className={styles.merchants}>
                {channel.merchants.map((merchant) => (
                  <p key={merchant.tenantId}>
                    <b>{merchant.name}</b>
                    <span>{merchant.slug}</span>
                    <small>
                      开通 {onboardingLabel(merchant.onboardingStatus)} · 服务{' '}
                      {serviceLabel(merchant.serviceStatus)}
                    </small>
                  </p>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p className={styles.empty}>尚未建立一级渠道。创建后，渠道端可基于真实商户池开展运营。</p>
        )}
      </section>
    </main>
  );
}
