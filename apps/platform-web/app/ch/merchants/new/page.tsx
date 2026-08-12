'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, businessLabel, Button, StatusBadge } from '@oneday/ui';
import { PlatformProductHome } from '../../../platform-product-home';
import styles from './page.module.css';

type Channel = { id: string; code: string; name: string };
type Onboarding = {
  id: string;
  channelName: string;
  name: string;
  slug: string;
  invitationStatus: string;
  template: string;
  plan: string;
  deliveryStatus: string;
  deliveryNote: string | null;
  version: number;
};
type Form = {
  channelId: string;
  slug: string;
  tenantName: string;
  organizationName: string;
  storeName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  template: string;
  plan: string;
};
type Bucket = { label: string; value: number };

const empty: Form = {
  channelId: '',
  slug: '',
  tenantName: '',
  organizationName: '',
  storeName: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  template: 'starter',
  plan: 'starter',
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};

const planLabel = (plan: string) =>
  ({ starter: '基础版', growth: '成长版', enterprise: '企业版' })[plan] ?? plan;
const templateLabel = (template: string) =>
  ({ starter: '基础门店模板', service: '服务行业模板' })[template] ?? template;
const deliveryLabel = (status: string) =>
  ({ delivered: '已交付', failed: '需恢复', pending: '待确认' })[status] ??
  (status ? status : '待确认');

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

export default function ChannelMerchantOnboardingPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [items, setItems] = useState<Onboarding[]>([]);
  const [form, setForm] = useState<Form>(empty);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const [channelResponse, onboardingResponse] = await Promise.all([
        sessionApi.request(`${api}/api/v1/platform/channels`, { headers: {} }),
        sessionApi.request(`${api}/api/v1/channel/merchant-onboardings`, { headers: {} }),
      ]);
      if (
        [401, 403].includes(channelResponse.status) ||
        [401, 403].includes(onboardingResponse.status)
      ) {
        setState('forbidden');
        return;
      }
      if (!channelResponse.ok || !onboardingResponse.ok) throw new Error('LOAD');
      setChannels((await channelResponse.json()).data.channels);
      setItems((await onboardingResponse.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const invitationDist = useMemo(
    () => countBy(items.map((row) => businessLabel(row.invitationStatus))),
    [items],
  );
  const deliveryDist = useMemo(
    () => countBy(items.map((row) => deliveryLabel(row.deliveryStatus))),
    [items],
  );
  const planDist = useMemo(() => countBy(items.map((row) => planLabel(row.plan))), [items]);
  const templateDist = useMemo(
    () => countBy(items.map((row) => templateLabel(row.template))),
    [items],
  );
  const channelDist = useMemo(
    () => countBy(items.map((row) => row.channelName || '未归属渠道')),
    [items],
  );

  const update = (key: keyof Form, value: string) => setForm({ ...form, [key]: value });

  const create = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/channel/merchant-onboardings`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(form),
      });
      if ([401, 403].includes(response.status)) {
        setState('forbidden');
        return;
      }
      if (response.status === 400) {
        setNote('请检查渠道、商户资料、邀请邮箱以及所选模板或套餐。');
        return;
      }
      if (response.status === 409) {
        setNote('商户标识或管理员邮箱已存在。');
        return;
      }
      if (!response.ok) throw new Error('CREATE');
      setNote('开通记录已创建，邀请已准备；当前不代表外部邮件已送达。');
      setForm(empty);
      await load();
    } catch {
      setNote('未能创建开通记录，事务已安全回滚。');
    } finally {
      setSaving(false);
    }
  };

  const updateDelivery = async (item: Onboarding, status: 'delivered' | 'failed') => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/channel/merchant-onboardings/${item.id}/delivery`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            status,
            note:
              status === 'delivered'
                ? 'Delivery completed by channel operator.'
                : 'Delivery needs follow-up.',
            version: item.version,
          }),
        },
      );
      if (response.status === 409) {
        setNote('交付状态已在其他位置变化，请刷新后按最新状态重试。');
        return;
      }
      if (!response.ok) throw new Error('DELIVERY');
      setNote(
        status === 'delivered' ? '交付已确认，商户已激活。' : '交付失败已记录，可继续安全恢复。',
      );
      await load();
    } catch {
      setNote('交付状态未能保存。');
    } finally {
      setSaving(false);
    }
  };

  if (state !== 'ready') {
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind={state}
          title={
            state === 'loading'
              ? '正在读取渠道开通队列'
              : state === 'forbidden'
                ? '当前账号无商户开通权限'
                : '商户开通队列暂时不可用'
          }
          description="开通记录只对授权渠道范围可见。"
          action={
            state === 'error' ? <Button onClick={() => void load()}>重新加载</Button> : undefined
          }
        />
      </main>
    );
  }

  return (
    <main className={styles.page} data-testid="channel-merchant-onboarding">
      <PlatformProductHome mode="channel" />
      <header className={styles.topBar}>
          <span className={styles.topBarTitle}>推广员工具 · 渠道商户开通</span>
          <div className={styles.topBarActions}>
            <a className={styles.topBarLink} href="/ch/dashboard">
              渠道代理
            </a>
            <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
              刷新
            </button>
          </div>
        </header>

        <section className={styles.heroCard} aria-label="商户开通概览">
          <h1>邀请、初始化与交付商户</h1>
          <p>
            初始化在事务内完成；邀请仅记录为已准备，交付必须由渠道人员明确确认或恢复。不含本平台收款，非本平台下单。
          </p>
        </section>

        {note ? (
          <p className={styles.feedback} role="status">
            {note}
          </p>
        ) : null}

        <section className={styles.panel} aria-label="开通概况">
          <div className={styles.summaryStrip}>
            <div>
              <span>开通记录</span>
              <strong>{items.length}</strong>
            </div>
            <div>
              <span>已交付</span>
              <strong>{items.filter((row) => row.deliveryStatus === 'delivered').length}</strong>
            </div>
            <div>
              <span>待确认</span>
              <strong>
                {
                  items.filter(
                    (row) => row.deliveryStatus !== 'delivered' && row.deliveryStatus !== 'failed',
                  ).length
                }
              </strong>
            </div>
            <div>
              <span>可用渠道</span>
              <strong>{channels.length}</strong>
            </div>
          </div>
        </section>

        <section className={styles.panel} aria-label="商户开通分布">
          <div className={styles.panelHead}>
            <h2>商户开通分布</h2>
            <span className={styles.panelMeta}>由开通档案行推导</span>
          </div>
          <div className={styles.distribution}>
            <div className={styles.panelBlock}>
              <h3>邀请状态分布</h3>
              <Bars items={invitationDist} total={items.length} />
            </div>
            <div className={styles.panelBlock}>
              <h3>交付状态分布</h3>
              <Bars items={deliveryDist} total={items.length} />
            </div>
            <div className={styles.panelBlock}>
              <h3>套餐分布</h3>
              <Bars items={planDist} total={items.length} />
            </div>
            <div className={styles.panelBlock}>
              <h3>模板分布</h3>
              <Bars items={templateDist} total={items.length} />
            </div>
            <div className={styles.panelBlock}>
              <h3>归属渠道分布</h3>
              <Bars items={channelDist} total={items.length} />
            </div>
          </div>
        </section>

        <section className={styles.layout}>
          <section className={styles.panel} aria-label="商户邀请与基础设置">
            <h2>商户邀请与基础设置</h2>
            <label>
              一级渠道
              <select
                aria-label="一级渠道"
                value={form.channelId}
                onChange={(event) => update('channelId', event.target.value)}
              >
                <option value="">请选择渠道</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} ({channel.code})
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ['slug', '商户标识'],
                ['tenantName', '商户名称'],
                ['organizationName', '组织名称'],
                ['storeName', '首家门店'],
                ['adminName', '管理员姓名'],
                ['adminEmail', '邀请邮箱'],
                ['adminPassword', '初始密码'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  aria-label={label}
                  type={
                    key === 'adminPassword' ? 'password' : key === 'adminEmail' ? 'email' : 'text'
                  }
                  minLength={key === 'adminPassword' ? 12 : undefined}
                  value={form[key]}
                  onChange={(event) => update(key, event.target.value)}
                />
              </label>
            ))}
            <label>
              初始模板
              <select
                aria-label="初始模板"
                value={form.template}
                onChange={(event) => update('template', event.target.value)}
              >
                <option value="starter">基础门店模板</option>
                <option value="service">服务行业模板</option>
              </select>
            </label>
            <label>
              商业套餐
              <select
                aria-label="商业套餐"
                value={form.plan}
                onChange={(event) => update('plan', event.target.value)}
              >
                <option value="starter">基础版</option>
                <option value="growth">成长版</option>
                <option value="enterprise">企业版</option>
              </select>
            </label>
            <Button loading={saving} disabled={!channels.length} onClick={() => void create()}>
              创建开通记录
            </Button>
          </section>

          <section className={styles.panel} aria-label="交付队列">
            <h2>交付队列</h2>
            {items.length ? (
              items.map((item) => (
                <article className={styles.item} key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.channelName} · {item.slug}
                    </span>
                    <small>
                      邀请：{businessLabel(item.invitationStatus)}；模板：
                      {templateLabel(item.template)}；套餐：{planLabel(item.plan)}
                    </small>
                    <small>
                      <StatusBadge
                        tone={item.deliveryStatus === 'delivered' ? 'success' : 'warning'}
                      >
                        交付：{deliveryLabel(item.deliveryStatus)}
                      </StatusBadge>
                      {item.deliveryNote ? ` — ${item.deliveryNote}` : ''}
                    </small>
                  </div>
                  <div className={styles.actions}>
                    <Button
                      disabled={saving || item.deliveryStatus === 'delivered'}
                      onClick={() => void updateDelivery(item, 'delivered')}
                    >
                      确认交付
                    </Button>
                    <Button
                      disabled={saving}
                      tone="secondary"
                      onClick={() => void updateDelivery(item, 'failed')}
                    >
                      记录待跟进
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <p className={styles.empty}>当前尚无渠道商户开通记录。</p>
            )}
          </section>
        </section>

      <p className={styles.honest} role="note">
        以上分布全部由已抓取渠道商户开通档案行现场推导(source=local)：邀请状态/交付状态/套餐/模板/归属渠道均由真实
        merchant-onboardings 行统计。渠道是工具开通与整合网络，不含本平台收款，非本平台下单；本地试点记录，未接美团实时商户数据。
      </p>
    </main>
  );
}
