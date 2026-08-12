'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { PlatformProductHome } from '../../platform-product-home';
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
const sessionApi = new SessionApiClient(api);
const headers = () => ({});

const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const statusLabel = (value: string) =>
  value === 'not_required'
    ? '无需审核'
    : ({
        prepared: '已准备',
        accepted: '已接受',
        invited: '已邀请',
        pending: '待审批',
        approved: '已批准',
        exited: '已退出',
      }[value] ?? value);

export default function BusinessCircleMerchants() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/circle/merchants`, {
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
  const mutate = async (path: string, method: 'POST' | 'PUT', body: object) => {
    setBusy(true);
    setNotice('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/circle/merchants${path}`, {
        method,
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw Error();
      setNotice('变更已保存，并记录可审计的状态流转。');
      await load();
    } catch {
      setNotice('变更未保存，请刷新并检查当前审批版本。');
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
  const members = data?.members ?? [];
  const sum = (fn: (member: Member) => boolean) => members.filter(fn).length;
  const platformApprovalCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of members) {
      const key = statusLabel(member.platformApprovalStatus);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [members]);
  const circleApprovalCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of members) {
      const key = statusLabel(member.circleApprovalStatus);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [members]);
  const invitationCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of members) {
      const key = statusLabel(member.invitationStatus);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [members]);
  const displayCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of members) {
      const key = member.displayConfig?.visible ? '在总览展示' : '从总览隐藏';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [members]);
  const circleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of members) {
      const key = member.circleName || '未归属商圈';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }, [members]);
  const benefitDensityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of members) {
      const n = member.benefits?.length ?? 0;
      const key = n <= 0 ? '未配置权益 0' : n <= 4 ? '基础权益 1-4' : '丰富权益 5+';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [members]);
  if (state !== 'ready')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind={state}
          title={
            state === 'loading'
              ? '正在读取商圈成员治理数据'
              : state === 'forbidden'
                ? '当前账号无商圈成员治理权限'
                : '商圈成员治理暂时不可用'
          }
          description="邀请、双重审批、展示与退出均受商圈授权范围约束。"
          action={
            state === 'error' ? <Button onClick={() => void load()}>重新加载</Button> : undefined
          }
        />
      </main>
    );
  const circles = Array.from(
    new Map(data?.members.map((member) => [member.circleId, member]) ?? []).values(),
  );
  return (
    <main className={styles.page}>
      <PlatformProductHome mode="circle" />

      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 商圈成员治理</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="商圈成员治理说明">
        <h1>邀请、双重审批并展示已批准商户</h1>
        <p>
          邀请仅记录为已准备；成员需分别通过商圈与平台审批后，才会进入经营总览。本页只管理商圈成员关系，不处理任何成交。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="商圈成员概况">
        <div>
          <span>成员记录</span>
          <strong>{members.length}</strong>
        </div>
        <div>
          <span>已批准</span>
          <strong>{sum((m) => m.platformApprovalStatus === 'approved')}</strong>
        </div>
        <div>
          <span>待审核</span>
          <strong>
            {sum(
              (m) => m.circleApprovalStatus === 'pending' || m.platformApprovalStatus === 'pending',
            )}
          </strong>
        </div>
        <div>
          <span>覆盖商圈</span>
          <strong>{circles.length}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="商圈成员分布">
        <div className={styles.panelBlock}>
          <h2>平台审核分布</h2>
          <ul className={styles.bars}>
            {platformApprovalCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(members.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!members.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>商圈审核分布</h2>
          <ul className={styles.bars}>
            {circleApprovalCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(members.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!members.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>邀请状态分布</h2>
          <ul className={styles.bars}>
            {invitationCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(members.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!members.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>展示状态分布</h2>
          <ul className={styles.bars}>
            {displayCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(members.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!members.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>商户归属商圈分布</h2>
          <ul className={styles.bars}>
            {circleCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(members.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!members.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>联合权益覆盖分布</h2>
          <ul className={styles.bars}>
            {benefitDensityCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(members.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!members.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取商圈成员档案行现场推导（source=local）：平台审核、商圈审核、邀请状态、
        展示状态、归属商圈与联合权益；商圈是商家联盟整合网络，仅管理成员关系，不包含本平台收款、
        非本平台下单；本地试点记录，未接美团实时商户数据。
      </p>

      <section className={styles.panel} aria-label="商户审核队列">
        <div className={styles.panelHead}>
          <h2>商户审核队列</h2>
          <span className={styles.panelMeta}>{members.length} 条成员记录</span>
        </div>
        {members.length ? (
          <div className={styles.members}>
            {members.map((member) => (
              <article key={member.id}>
                <header>
                  <div>
                    <b>{member.name}</b>
                    <span>
                      {member.circleName} · {member.slug}
                    </span>
                  </div>
                  <StatusBadge
                    tone={member.platformApprovalStatus === 'approved' ? 'success' : 'warning'}
                  >
                    {statusLabel(member.platformApprovalStatus)}
                  </StatusBadge>
                </header>
                <p>{member.benefits.join(' · ')}</p>
                <dl>
                  <div>
                    <dt>邀请</dt>
                    <dd>{statusLabel(member.invitationStatus)}</dd>
                  </div>
                  <div>
                    <dt>商圈审核</dt>
                    <dd>{statusLabel(member.circleApprovalStatus)}</dd>
                  </div>
                  <div>
                    <dt>平台审核</dt>
                    <dd>{statusLabel(member.platformApprovalStatus)}</dd>
                  </div>
                  <div>
                    <dt>展示状态</dt>
                    <dd>
                      {member.displayConfig.visible ? '展示' : '隐藏'} /{' '}
                      {member.displayConfig.sortOrder}
                    </dd>
                  </div>
                </dl>
                {member.exitReason ? (
                  <p className={styles.exit}>已退出：{member.exitReason}</p>
                ) : null}
                <footer>
                  {member.circleApprovalStatus === 'pending' ? (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void mutate(`/${member.id}/circle-approve`, 'POST', {
                          version: member.version,
                        })
                      }
                    >
                      商圈审核通过
                    </Button>
                  ) : null}
                  {member.circleApprovalStatus === 'approved' &&
                  member.platformApprovalStatus === 'pending' ? (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void mutate(`/${member.id}/platform-approve`, 'POST', {
                          version: member.version,
                        })
                      }
                    >
                      平台审核通过
                    </Button>
                  ) : null}
                  {member.platformApprovalStatus === 'approved' ? (
                    <>
                      <Button
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
                        {member.displayConfig.visible ? '从总览隐藏' : '在总览展示'}
                      </Button>
                      <Button
                        tone="danger"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt('请输入退出原因');
                          if (reason)
                            void mutate(`/${member.id}/exit`, 'POST', {
                              version: member.version,
                              reason,
                            });
                        }}
                      >
                        退出商圈
                      </Button>
                    </>
                  ) : null}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>当前商圈尚无商户邀请或成员记录。</p>
        )}
      </section>

      {notice ? <p className={styles.notice}>{notice}</p> : null}
      <section className={styles.panel} aria-label="准备商户邀请">
        <div className={styles.panelHead}>
          <h2>准备商户邀请</h2>
          <span className={styles.panelMeta}>仅记录为已准备，需通过双重审批</span>
        </div>
        {circles.length && data?.merchantPool.length ? (
          <form onSubmit={invite}>
            <label>
              固定商圈
              <select name="circleId" required>
                {circles.map((circle) => (
                  <option key={circle.circleId} value={circle.circleId}>
                    {circle.circleName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              商户
              <select name="merchantTenantId" required>
                {data.merchantPool.map((merchant) => (
                  <option key={merchant.tenantId} value={merchant.tenantId}>
                    {merchant.name} · {merchant.slug}
                  </option>
                ))}
              </select>
            </label>
            <label>
              联合权益
              <input name="benefits" required placeholder="例如：联合券、会员价" />
            </label>
            <label>
              邀请说明
              <input name="invitationNote" required placeholder="说明邀请该商户的原因" />
            </label>
            <label>
              总览展示标题
              <input name="headline" placeholder="可选的批准后展示文案" />
            </label>
            <label>
              展示顺序
              <input name="sortOrder" type="number" min="0" max="999" defaultValue="0" required />
            </label>
            <label className={styles.checkbox}>
              <input name="visible" type="checkbox" defaultChecked />
              审批后展示
            </label>
            <Button loading={busy}>准备邀请</Button>
          </form>
        ) : (
          <p className={styles.empty}>准备邀请前，需要先有固定商圈和符合条件的商户。</p>
        )}
      </section>
    </main>
  );
}
