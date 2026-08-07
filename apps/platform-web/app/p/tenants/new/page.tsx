'use client';
import { useState } from 'react';
import styles from './page.module.css';
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
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
    const token = sessionStorage.getItem('oneday.accessToken');
    if (!token) return setState('forbidden');
    setSaving(true);
    try {
      const r = await fetch(`${api}/api/v1/platform/onboarding`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'x-request-id': crypto.randomUUID(),
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
        <section>
          <h1>无权开通租户</h1>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <p>ONEDAY / 租户开通向导</p>
        <h1>一次提交完成主体、门店、管理员与模板初始化</h1>
        <span>所有资源在同一事务中创建；失败不会留下半开通数据。</span>
      </header>
      <section className={styles.form}>
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
            <option value="starter">starter</option>
            <option value="service">service</option>
          </select>
        </label>
        <button disabled={saving} onClick={() => void submit()}>
          {saving ? '正在开通…' : '提交并初始化'}
        </button>
        {note && <p role="status">{note}</p>}
      </section>
    </main>
  );
}
