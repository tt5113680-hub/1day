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
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 平台安全治理"
        title="风险信号、越权审计、连接器与安全事件"
        description="风险是可核查信号，不是未经证实的入侵结论。每次处置都会保留责任、理由与事件链。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新审计
          </Button>
        }
      />
      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <Card className={styles.panel}>
          <h2>待审查风险信号</h2>
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
        </Card>
        <Card className={styles.panel}>
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
        </Card>
      </section>
    </main>
  );
}
