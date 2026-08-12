'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, businessLabel, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
type Risk = {
  risk_key: string;
  kind: string;
  label: string;
  severity: string;
  detail: string;
  review_status?: string;
  review_note?: string;
  review_version?: number;
};
type Event = {
  action: string;
  resource_type: string;
  resource_id: string;
  correlation_id: string;
  created_at: string;
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const detailCopy = (value: string) =>
  ({
    'Connector health observation requires review.': '连接器健康观察需要平台复核。',
    'A privileged configuration change is traceable in the audit log.':
      '特权配置变更已保留审计链，需要平台复核。',
    'Tenant connector authorization requires attention.': '租户连接器授权需要平台关注。',
    'Reviewed by platform operator; evidence retained for follow-up.':
      '平台运营已复核，证据保留用于后续跟进。',
    'Reviewed connector degradation.': '连接器服务降级已复核。',
  })[value] ?? value;
const eventCopy = (value: string) =>
  ({
    'platform.security_risk_acknowledged': '风险信号已确认处置',
    'platform.connector_health_observed': '连接器健康观察已记录',
    'platform.connector_defined': '平台连接器定义已创建',
    'platform.tenant_onboarded': '平台租户基础资源已初始化',
    'platform.tenant_updated': '平台租户配置已更新',
    'platform.channel_created': '平台渠道已创建',
    'platform.business_circle_created': '平台商圈已创建',
    'platform.business_circle_merchant_recommended': '商圈商户推荐已记录',
    'platform.business_circle_merchant_approved': '商圈商户推荐已通过',
    'platform.template_created': '平台模板草稿已创建',
    'platform.template_published': '平台模板版本已发布',
    'rbac.role_permissions_updated': '角色权限已更新',
  })[value] ?? value.replaceAll('_', ' ').replaceAll('.', ' / ');
const severityTone = (value: string) =>
  value === 'unavailable' ? 'danger' : value === 'degraded' ? 'warning' : 'info';
export default function SecurityAudit() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [risks, setRisks] = useState<Risk[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/platform/security-audit`, {
        headers: headers(),
      });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      const data = (await r.json()).data;
      setRisks(data.risks);
      setEvents(data.events);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const acknowledge = async (risk: Risk) => {
    setSaving(true);
    setNote('');
    try {
      const r = await sessionApi.request(`${api}/api/v1/platform/security-audit/acknowledgements`, {
        method: 'POST',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          riskKey: risk.risk_key,
          note: 'Reviewed by platform operator; evidence retained for follow-up.',
          version: risk.review_version ?? 1,
        }),
      });
      if (r.status === 409) return setNote('该风险处置已变化，请刷新后重试。');
      if (!r.ok) throw Error();
      setNote('风险信号已处置并保留审计与事件记录。');
      await load();
    } catch {
      setNote('处置保存失败。');
    } finally {
      setSaving(false);
    }
  };
  const severityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of risks) {
      const key = businessLabel(item.severity || '未知');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [risks]);
  const kindCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of risks) {
      const key = businessLabel(item.kind || '未分类');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [risks]);
  const reviewCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of risks) {
      const key = item.review_status ? businessLabel(item.review_status) : '待处置';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [risks]);
  const eventCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      const key = eventCopy(event.action);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [events]);
  const resourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      const key = businessLabel(event.resource_type || '未分类');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [events]);
  const openRisks = risks.filter((r) => !r.review_status).length;
  const acknowledgedRisks = risks.length - openRisks;
  const criticalRisks = risks.filter((r) => r.severity === 'unavailable').length;
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载安全审计"
          description="正在汇总平台风险信号与可追溯安全事件。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看平台安全审计"
          description="该能力仅向具备平台安全治理权限的运营人员开放。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="平台安全审计暂不可用"
          description="风险与事件数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page} data-testid="platform-security-audit">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 平台安全审计</span>
        <span className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新审计
          </button>
        </span>
      </header>

      <section className={styles.heroCard} aria-label="平台安全审计说明">
        <h1>风险信号、越权审计、连接器与安全事件</h1>
        <p>
          风险是可核查信号，不是未经证实的入侵结论。每次处置都会保留责任、理由与事件链； Outbox
          重放与连接器观察不会调用美团/抖音等外部平台。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="平台安全概况">
        <div>
          <span>风险信号</span>
          <strong>{risks.length}</strong>
        </div>
        <div>
          <span>待处置</span>
          <strong>{openRisks}</strong>
        </div>
        <div>
          <span>已确认处置</span>
          <strong>{acknowledgedRisks}</strong>
        </div>
        <div>
          <span>最高风险</span>
          <strong>{criticalRisks}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="平台安全分布">
        <div className={styles.panelBlock}>
          <h2>严重度分布</h2>
          <ul className={styles.bars}>
            {severityCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(risks.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!risks.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>风险类型分布</h2>
          <ul className={styles.bars}>
            {kindCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(risks.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!risks.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>处置状态分布</h2>
          <ul className={styles.bars}>
            {reviewCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(risks.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!risks.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>事件类型分布</h2>
          <ul className={styles.bars}>
            {eventCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(events.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!events.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>资源类型分布</h2>
          <ul className={styles.bars}>
            {resourceCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(events.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!events.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取平台安全审计档案行现场推导（source=local）：风险严重度、风险类型、
        处置状态、安全事件类型与资源类型；处置仅记录本地审计与事件，连接器观察不会调用
        美团/抖音等外部平台；不包含本平台收款、 非本平台下单。
      </p>

      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}

      <section className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.head}>
            <h2>待审查风险信号</h2>
            <StatusBadge tone={risks.length ? 'warning' : 'success'}>
              {risks.length ? `${openRisks} 条待处置` : '当前无风险信号'}
            </StatusBadge>
          </div>
          {risks.length ? (
            risks.map((r) => (
              <article key={r.risk_key}>
                <div>
                  <strong>
                    {businessLabel(r.kind)} · {r.label}
                  </strong>
                  <span>{detailCopy(r.detail)}</span>
                  <small>
                    {r.review_status
                      ? `处置记录：${detailCopy(r.review_note || businessLabel(r.review_status))}`
                      : '尚未处置'}
                  </small>
                </div>
                <div className={styles.actions}>
                  <StatusBadge tone={severityTone(r.severity)}>
                    {businessLabel(r.severity)}
                  </StatusBadge>
                  <Button tone="secondary" loading={saving} onClick={() => void acknowledge(r)}>
                    {r.review_status ? '更新处置' : '确认处置'}
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <AppStatePanel
              kind="empty"
              title="当前没有待审查风险信号"
              description="新的连接器健康、授权或特权配置风险会显示在这里。"
            />
          )}
        </section>
        <section className={styles.panel}>
          <h2>安全事件链</h2>
          {events.length ? (
            events.map((e, i) => (
              <article key={`${e.correlation_id}-${i}`}>
                <div>
                  <strong>{eventCopy(e.action)}</strong>
                  <span>
                    {businessLabel(e.resource_type)} ·{' '}
                    {new Date(e.created_at).toLocaleString('zh-CN', { hour12: false })}
                  </span>
                  <small>请求关联号：{e.correlation_id}</small>
                </div>
              </article>
            ))
          ) : (
            <AppStatePanel
              kind="empty"
              title="暂无匹配的安全审计事件"
              description="平台、连接器、权限与登录安全事件会保留在这里。"
            />
          )}
        </section>
      </section>

      <section className={styles.panel}>
        <h2>安全边际</h2>
        <ul className={styles.boundaries}>
          <li>事件链来自真实审计与 Outbox 档案，分布全部由实数据推导，禁止假 BI。</li>
          <li>连接器观察不会调用美团/抖音等外部平台，仅记录本地健康观察。</li>
          <li>平台安全事件不包含本平台收款、不涉及本平台下单。</li>
        </ul>
      </section>
    </main>
  );
}
