'use client';

import { useCallback, useEffect, useState } from 'react';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button } from '@oneday/ui';
import styles from './membership-redeem.module.css';

type Benefit = { id: string; title: string };

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export function MembershipRedeem() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [memberCode, setMemberCode] = useState('');
  const [benefitId, setBenefitId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) {
      setState('forbidden');
      return;
    }
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/memberships/benefits`, {
        headers: { 'content-type': 'application/json' },
      });
      if ([401, 403].includes(response.status)) {
        setState('forbidden');
        return;
      }
      if (!response.ok) throw new Error('LOAD');
      setBenefits((await response.json()).data as Benefit[]);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const redeem = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/memberships/redeem`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ memberCode, benefitId }),
      });
      setMessage(
        response.ok ? '会员权益已核销，余额已实时更新。' : '核销未完成，请核对会员码与权益编号。',
      );
      if (response.ok) {
        setMemberCode('');
        setBenefitId('');
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载会员核销"
          description="读取门店已发放的可核销权益。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="需要员工登录"
          description="请使用已授权员工账号登录后再核销会员权益。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="会员核销暂不可用"
          description="未能加载可核销权益列表。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page} data-testid="employee-membership-redeem">
      <header className={styles.header}>
        <p className={styles.eyebrow}>ONEDAY / 会员核销</p>
        <h1>会员权益核销</h1>
        <p>使用既有 `POST /api/v1/employee/memberships/redeem`；仅核销门店已发放权益。</p>
      </header>
      {message ? (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      ) : null}
      <section className={styles.panel} aria-label="核销表单">
        <label>
          会员码
          <input
            aria-label="会员码"
            value={memberCode}
            onChange={(event) => setMemberCode(event.target.value.toUpperCase())}
            placeholder="12 位会员码"
            autoComplete="off"
          />
        </label>
        <label>
          权益
          <select
            aria-label="核销权益"
            value={benefitId}
            onChange={(event) => setBenefitId(event.target.value)}
          >
            <option value="">选择已发放权益</option>
            {benefits.map((benefit) => (
              <option key={benefit.id} value={benefit.id}>
                {benefit.title}
              </option>
            ))}
          </select>
        </label>
        {benefits.length === 0 ? (
          <p className={styles.note}>当前没有可核销权益；请先由经营管理发放门店权益。</p>
        ) : null}
        <Button
          loading={busy}
          disabled={busy || !memberCode.trim() || !benefitId}
          onClick={() => void redeem()}
        >
          确认核销
        </Button>
      </section>
      <p className={styles.note}>
        工作台保留入口链接；店长能力包「会员核销」直达本页。不伪造第三方投放或短信验证。
      </p>
    </main>
  );
}
