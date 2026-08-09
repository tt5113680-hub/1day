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

export default function ChannelMerchantOnboardingPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [channels, setChannels] = useState<Channel[]>([]),
    [items, setItems] = useState<Onboarding[]>([]),
    [form, setForm] = useState<Form>(empty),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false);
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const [channelResponse, onboardingResponse] = await Promise.all([
        sessionApi.request(`${api}/api/v1/platform/channels`, { headers: headers() }),
        sessionApi.request(`${api}/api/v1/channel/merchant-onboardings`, { headers: headers() }),
      ]);
      if (
        [401, 403].includes(channelResponse.status) ||
        [401, 403].includes(onboardingResponse.status)
      )
        return setState('forbidden');
      if (!channelResponse.ok || !onboardingResponse.ok) throw Error();
      setChannels((await channelResponse.json()).data.channels);
      setItems((await onboardingResponse.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const update = (key: keyof Form, value: string) => setForm({ ...form, [key]: value });
  const create = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/channel/merchant-onboardings`, {
        method: 'POST',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(form),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 400)
        return setNote('请检查渠道、商户资料、邀请邮箱以及所选模板或套餐。');
      if (response.status === 409) return setNote('商户标识或管理员邮箱已存在。');
      if (!response.ok) throw Error();
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
            ...headers(),
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
      if (response.status === 409)
        return setNote('交付状态已在其他位置变化，请刷新后按最新状态重试。');
      if (!response.ok) throw Error();
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
  if (state !== 'ready')
    return (
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
    );
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 渠道商户开通"
        title="邀请、初始化与交付商户"
        description="初始化在事务内完成；邀请仅记录为已准备，交付必须由渠道人员明确确认或恢复。"
        actions={<Button onClick={() => void load()}>刷新数据</Button>}
      />
      {note && (
        <p className={styles.note} role="status">
          {note}
        </p>
      )}
      <section className={styles.layout}>
        <Card className={styles.panel}>
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
          {[
            ['slug', '商户标识'],
            ['tenantName', '商户名称'],
            ['organizationName', '组织名称'],
            ['storeName', '首家门店'],
            ['adminName', '管理员姓名'],
            ['adminEmail', '邀请邮箱'],
            ['adminPassword', '初始密码'],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                aria-label={label}
                type={
                  key === 'adminPassword' ? 'password' : key === 'adminEmail' ? 'email' : 'text'
                }
                minLength={key === 'adminPassword' ? 12 : undefined}
                value={form[key as keyof Form]}
                onChange={(event) => update(key as keyof Form, event.target.value)}
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
        </Card>
        <Card className={styles.panel}>
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
                    {item.template === 'starter' ? '基础门店模板' : '服务行业模板'}；套餐：
                    {item.plan === 'starter'
                      ? '基础版'
                      : item.plan === 'growth'
                        ? '成长版'
                        : '企业版'}
                  </small>
                  <small>
                    <StatusBadge tone={item.deliveryStatus === 'delivered' ? 'success' : 'warning'}>
                      交付：
                      {item.deliveryStatus === 'delivered'
                        ? '已交付'
                        : item.deliveryStatus === 'failed'
                          ? '需恢复'
                          : '待确认'}
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
        </Card>
      </section>
    </main>
  );
}
