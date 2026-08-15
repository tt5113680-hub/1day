'use client';

import { Button, StatusBadge } from '@oneday/ui';
import { useMemo, useState } from 'react';
import styles from '../p/tenants/new/page.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export default function OwnerActivatePage() {
  const initialCode = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('code') ?? '';
  }, []);
  const [code, setCode] = useState(initialCode);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await fetch(`${api}/api/v1/auth/owner-activate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: code.trim() || undefined,
          token: token.trim() || undefined,
          password,
        }),
      });
      if (!response.ok) {
        setNote(response.status === 404 ? '激活码无效或已使用。' : '激活失败，请检查输入后重试。');
        return;
      }
      const data = await response.json();
      setDone(true);
      setNote(`已激活 ${data.tenantSlug ?? data.email ?? ''}，可使用新密码登录经营后台。`);
    } catch {
      setNote('网络错误，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page} data-testid="owner-activate">
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 老板激活</span>
      </div>
      <section className={styles.heroCard}>
        <h1>设置老板登录密码</h1>
        <p>使用开通交付的激活令牌或老板激活码，一次性设置密码。平台操作员不应代填长期密码。</p>
      </section>
      <section className={styles.panel}>
        <div className={styles.form}>
          <label>
            老板激活码（扫码带入）
            <input
              aria-label="老板激活码"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="ONE-CODE"
            />
          </label>
          <label>
            或粘贴激活令牌
            <input
              aria-label="激活令牌"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <label>
            新登录密码（至少 12 位）
            <input
              aria-label="新登录密码"
              type="password"
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <Button className={styles.submit} loading={saving} onClick={() => void submit()}>
            激活并登录
          </Button>
        </div>
        {note ? (
          <p className={styles.note} role="status" data-testid="owner-activate-note">
            <StatusBadge tone={done ? 'success' : 'danger'}>{done ? '已激活' : '需处理'}</StatusBadge>
            <span>{note}</span>
          </p>
        ) : null}
      </section>
    </main>
  );
}
