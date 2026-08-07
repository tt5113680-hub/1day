'use client';

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

export default function ChannelMerchantOnboardingPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [channels, setChannels] = useState<Channel[]>([]),
    [items, setItems] = useState<Onboarding[]>([]),
    [form, setForm] = useState<Form>(empty),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false);
  const headers = () => ({
    authorization: `Bearer ${sessionStorage.getItem('oneday.accessToken')}`,
    'x-request-id': crypto.randomUUID(),
  });
  const load = useCallback(async () => {
    if (!sessionStorage.getItem('oneday.accessToken')) return setState('forbidden');
    setState('loading');
    try {
      const [channelResponse, onboardingResponse] = await Promise.all([
        fetch(`${api}/api/v1/platform/channels`, { headers: headers() }),
        fetch(`${api}/api/v1/channel/merchant-onboardings`, { headers: headers() }),
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
      const response = await fetch(`${api}/api/v1/channel/merchant-onboardings`, {
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
        return setNote(
          'Check the channel, merchant details, invitation email and selected template or plan.',
        );
      if (response.status === 409)
        return setNote('The merchant slug or administrator email already exists.');
      if (!response.ok) throw Error();
      setNote('Onboarding created. Invitation is prepared; no external email delivery is claimed.');
      setForm(empty);
      await load();
    } catch {
      setNote('Onboarding could not be created. The transaction was rolled back safely.');
    } finally {
      setSaving(false);
    }
  };
  const updateDelivery = async (item: Onboarding, status: 'delivered' | 'failed') => {
    setSaving(true);
    setNote('');
    try {
      const response = await fetch(
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
        return setNote('Delivery changed elsewhere. Refresh and retry with the latest status.');
      if (!response.ok) throw Error();
      setNote(
        status === 'delivered'
          ? 'Delivery completed and merchant is activated.'
          : 'Delivery failure recorded for safe recovery.',
      );
      await load();
    } catch {
      setNote('Delivery status could not be saved.');
    } finally {
      setSaving(false);
    }
  };
  if (state === 'loading')
    return <main className={styles.centered}>Loading merchant onboarding…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>Channel merchant onboarding access is restricted</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>Merchant onboarding is temporarily unavailable</h1>
          <button onClick={() => void load()}>Retry</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / CHANNEL MERCHANT ONBOARDING</p>
          <h1>Invite, provision and deliver merchant onboarding</h1>
          <span>
            Provisioning is transactional. Invitation is recorded as prepared; delivery must be
            explicitly confirmed or recovered.
          </span>
        </div>
        <button onClick={() => void load()}>Refresh</button>
      </header>
      {note && (
        <p className={styles.note} role="status">
          {note}
        </p>
      )}
      <section className={styles.layout}>
        <section className={styles.panel}>
          <h2>Merchant invitation and setup</h2>
          <label>
            First-level channel
            <select
              aria-label="First-level channel"
              value={form.channelId}
              onChange={(event) => update('channelId', event.target.value)}
            >
              <option value="">Select channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name} ({channel.code})
                </option>
              ))}
            </select>
          </label>
          {[
            ['slug', 'Merchant slug'],
            ['tenantName', 'Merchant name'],
            ['organizationName', 'Organization name'],
            ['storeName', 'First store'],
            ['adminName', 'Administrator name'],
            ['adminEmail', 'Invitation email'],
            ['adminPassword', 'Initial password'],
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
            Initial template
            <select
              aria-label="Initial template"
              value={form.template}
              onChange={(event) => update('template', event.target.value)}
            >
              <option value="starter">starter</option>
              <option value="service">service</option>
            </select>
          </label>
          <label>
            Commercial plan
            <select
              aria-label="Commercial plan"
              value={form.plan}
              onChange={(event) => update('plan', event.target.value)}
            >
              <option value="starter">starter</option>
              <option value="growth">growth</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
          <button disabled={saving || !channels.length} onClick={() => void create()}>
            {saving ? 'Saving…' : 'Create onboarding'}
          </button>
        </section>
        <section className={styles.panel}>
          <h2>Delivery queue</h2>
          {items.length ? (
            items.map((item) => (
              <article className={styles.item} key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.channelName} · {item.slug}
                  </span>
                  <small>
                    Invitation: {item.invitationStatus}; template: {item.template}; plan:{' '}
                    {item.plan}
                  </small>
                  <small>
                    Delivery: {item.deliveryStatus}
                    {item.deliveryNote ? ` — ${item.deliveryNote}` : ''}
                  </small>
                </div>
                <div className={styles.actions}>
                  <button
                    disabled={saving || item.deliveryStatus === 'delivered'}
                    onClick={() => void updateDelivery(item, 'delivered')}
                  >
                    Confirm delivery
                  </button>
                  <button
                    disabled={saving}
                    className={styles.secondary}
                    onClick={() => void updateDelivery(item, 'failed')}
                  >
                    Record follow-up
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className={styles.empty}>No channel merchant onboarding records yet.</p>
          )}
        </section>
      </section>
    </main>
  );
}
