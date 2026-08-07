'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Member = {
  id: string;
  circleId: string;
  circleCode: string;
  circleName: string;
  merchantTenantId: string;
  name: string;
  slug: string;
  benefits: string[];
  invitationStatus: string;
  invitationNote: string;
  circleApprovalStatus: string;
  platformApprovalStatus: string;
  displayConfig: { visible: boolean; sortOrder: number; headline?: string | null };
  exitReason?: string;
  version: number;
};
type Data = { members: Member[]; merchantPool: { tenantId: string; name: string; slug: string }[] };
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const headers = () => ({
  authorization: `Bearer ${sessionStorage.getItem('oneday.accessToken')}`,
  'x-request-id': crypto.randomUUID(),
});

export default function BusinessCircleMerchants() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!sessionStorage.getItem('oneday.accessToken')) return setState('forbidden');
    setState('loading');
    try {
      const response = await fetch(`${api}/api/v1/circle/merchants`, { headers: headers() });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const mutate = async (path: string, method: 'POST' | 'PUT', body: object) => {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`${api}/api/v1/circle/merchants${path}`, {
        method,
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw Error();
      setNotice('Saved with an auditable state transition.');
      await load();
    } catch {
      setNotice('The change was not saved. Refresh and check the current approval version.');
    } finally {
      setBusy(false);
    }
  };
  const invite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void mutate('/invitations', 'POST', {
      circleId: form.get('circleId'),
      merchantTenantId: form.get('merchantTenantId'),
      benefits: String(form.get('benefits'))
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      invitationNote: form.get('invitationNote'),
      displayConfig: {
        visible: form.get('visible') === 'on',
        sortOrder: Number(form.get('sortOrder')),
        headline: form.get('headline'),
      },
    });
  };
  if (state === 'loading')
    return <main className={styles.centered}>Loading merchant governance…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>Business-circle merchant management is restricted</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>Merchant governance is temporarily unavailable</h1>
          <button onClick={() => void load()}>Retry</button>
        </section>
      </main>
    );
  const circles = Array.from(
    new Map(data?.members.map((member) => [member.circleId, member]) ?? []).values(),
  );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>ONEDAY / FIXED BUSINESS CIRCLES</p>
          <h1>Invite, review and display approved merchants</h1>
          <span>
            Invitation delivery is prepared only. A member reaches the dashboard only after separate
            circle and platform approvals.
          </span>
        </div>
        <button onClick={() => void load()}>Refresh</button>
      </header>
      <section className={styles.invite}>
        <h2>Prepare a merchant invitation</h2>
        {circles.length && data?.merchantPool.length ? (
          <form onSubmit={invite}>
            <label>
              Fixed circle
              <select name="circleId" required>
                {circles.map((circle) => (
                  <option key={circle.circleId} value={circle.circleId}>
                    {circle.circleName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Merchant
              <select name="merchantTenantId" required>
                {data.merchantPool.map((merchant) => (
                  <option key={merchant.tenantId} value={merchant.tenantId}>
                    {merchant.name} · {merchant.slug}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Benefits
              <input name="benefits" required placeholder="e.g. joint voucher, member rate" />
            </label>
            <label>
              Invitation note
              <input name="invitationNote" required placeholder="Why this merchant is invited" />
            </label>
            <label>
              Dashboard headline
              <input name="headline" placeholder="Optional approved-display label" />
            </label>
            <label>
              Sort order
              <input name="sortOrder" type="number" min="0" max="999" defaultValue="0" required />
            </label>
            <label className={styles.checkbox}>
              <input name="visible" type="checkbox" defaultChecked />
              Show after approval
            </label>
            <button disabled={busy}>Prepare invitation</button>
          </form>
        ) : (
          <p className={styles.empty}>
            A fixed circle and an eligible merchant are required before an invitation can be
            prepared.
          </p>
        )}
      </section>
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      <section className={styles.panel}>
        <h2>Merchant review queue</h2>
        {data?.members.length ? (
          <div className={styles.members}>
            {data.members.map((member) => (
              <article key={member.id}>
                <header>
                  <div>
                    <b>{member.name}</b>
                    <span>
                      {member.circleName} · {member.slug}
                    </span>
                  </div>
                  <small>{member.platformApprovalStatus}</small>
                </header>
                <p>{member.benefits.join(' · ')}</p>
                <dl>
                  <div>
                    <dt>Invitation</dt>
                    <dd>{member.invitationStatus}</dd>
                  </div>
                  <div>
                    <dt>Circle review</dt>
                    <dd>{member.circleApprovalStatus}</dd>
                  </div>
                  <div>
                    <dt>Platform review</dt>
                    <dd>{member.platformApprovalStatus}</dd>
                  </div>
                  <div>
                    <dt>Visibility</dt>
                    <dd>
                      {member.displayConfig.visible ? 'Visible' : 'Hidden'} /{' '}
                      {member.displayConfig.sortOrder}
                    </dd>
                  </div>
                </dl>
                {member.exitReason ? (
                  <p className={styles.exit}>Exited: {member.exitReason}</p>
                ) : null}
                <footer>
                  {member.circleApprovalStatus === 'pending' ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void mutate(`/${member.id}/circle-approve`, 'POST', {
                          version: member.version,
                        })
                      }
                    >
                      Approve for circle
                    </button>
                  ) : null}
                  {member.circleApprovalStatus === 'approved' &&
                  member.platformApprovalStatus === 'pending' ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void mutate(`/${member.id}/platform-approve`, 'POST', {
                          version: member.version,
                        })
                      }
                    >
                      Approve for platform
                    </button>
                  ) : null}
                  {member.platformApprovalStatus === 'approved' ? (
                    <>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void mutate(`/${member.id}/display`, 'PUT', {
                            version: member.version,
                            displayConfig: {
                              ...member.displayConfig,
                              visible: !member.displayConfig.visible,
                            },
                          })
                        }
                      >
                        {member.displayConfig.visible ? 'Hide from dashboard' : 'Show on dashboard'}
                      </button>
                      <button
                        className={styles.danger}
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt('Exit reason');
                          if (reason)
                            void mutate(`/${member.id}/exit`, 'POST', {
                              version: member.version,
                              reason,
                            });
                        }}
                      >
                        Exit circle
                      </button>
                    </>
                  ) : null}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            No merchant invitations or memberships are present for this business circle.
          </p>
        )}
      </section>
    </main>
  );
}
