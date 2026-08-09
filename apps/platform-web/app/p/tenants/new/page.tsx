'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';
import { useState } from 'react';
import styles from './page.module.css';
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
export default function Onboarding() {
  const [form, setForm] = useState({
      slug: '',
      tenantName: '',
      organizationName: '',
      storeName: '',
      adminEmail: '',
      adminName: '',
      adminPassword: '',
      template: 'starter',
    }),
    [state, setState] = useState<'ready' | 'forbidden' | 'done' | 'error'>('ready'),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false);
  const update = (key: string, value: string) => setForm({ ...form, [key]: value });
  const submit = async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setSaving(true);
    try {
      const r = await sessionApi.request(`${api}/api/v1/platform/onboarding`, {
        method: 'POST',
        headers: {
          'idempotency-key': crypto.randomUUID(),
          'content-type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (r.status === 409) return setNote('租户 slug 或管理员邮箱已存在，请更正后重试。');
      if (!r.ok) throw Error();
      setState('done');
      setNote(`开通完成：${(await r.json()).data.slug}`);
    } catch {
      setState('error');
      setNote('开通失败；事务已回滚，可修正输入后安全重试。');
    } finally {
      setSaving(false);
    }
  };
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权开通租户" />
      </main>
    );
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 平台租户开通"
        title="一次提交完成主体、门店、管理员与模板初始化"
        description="所有资源在同一事务中创建；失败不会留下半开通数据。当前阶段仅声明基础初始化完成，不提前宣称商业 READY。"
      />
      <Card className={styles.form}>
        <label>
          租户 slug
          <input
            aria-label="租户 slug"
            value={form.slug}
            onChange={(e) => update('slug', e.target.value)}
            placeholder="demo-merchant"
          />
        </label>
        <label>
          租户名称
          <input
            aria-label="租户名称"
            value={form.tenantName}
            onChange={(e) => update('tenantName', e.target.value)}
          />
        </label>
        <label>
          组织名称
          <input
            aria-label="组织名称"
            value={form.organizationName}
            onChange={(e) => update('organizationName', e.target.value)}
          />
        </label>
        <label>
          首店名称
          <input
            aria-label="首店名称"
            value={form.storeName}
            onChange={(e) => update('storeName', e.target.value)}
          />
        </label>
        <label>
          管理员姓名
          <input
            aria-label="管理员姓名"
            value={form.adminName}
            onChange={(e) => update('adminName', e.target.value)}
          />
        </label>
        <label>
          管理员邮箱
          <input
            aria-label="管理员邮箱"
            type="email"
            value={form.adminEmail}
            onChange={(e) => update('adminEmail', e.target.value)}
          />
        </label>
        <label>
          管理员初始密码
          <input
            aria-label="管理员初始密码"
            type="password"
            minLength={12}
            value={form.adminPassword}
            onChange={(e) => update('adminPassword', e.target.value)}
          />
        </label>
        <label>
          初始化模板
          <select
            aria-label="初始化模板"
            value={form.template}
            onChange={(e) => update('template', e.target.value)}
          >
            <option value="starter">通用起步模板</option>
            <option value="service">服务行业模板</option>
          </select>
        </label>
        <Button className={styles.submit} loading={saving} onClick={() => void submit()}>
          提交并初始化
        </Button>
        {note && (
          <p className={styles.note} role="status">
            <StatusBadge tone={state === 'done' ? 'success' : 'danger'}>
              {state === 'done' ? '基础初始化完成' : '需要处理'}
            </StatusBadge>
            <span>{note}</span>
          </p>
        )}
      </Card>
    </main>
  );
}
