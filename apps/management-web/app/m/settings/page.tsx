'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type Settings = {
  version: number;
  reminders: { defaultDueHours: number; escalationHours: number };
  approvals: { requireOwnershipTransfer: boolean; requireContentApproval: boolean };
  doNotDisturb: { enabled: boolean; startHour: number; endHour: number };
  tags: { allowCustom: boolean; maxPerCustomer: number };
  ownership: { allocation: 'manual' | 'round_robin'; transferRequiresApproval: boolean };
  brand: { displayName: string; primaryColor: string };
};

type Bucket = { label: string; value: number };
type QuotaRow = {
  dimension: string;
  label: string;
  limit: number;
  usage: number;
  remaining: number;
  reached: boolean;
};
type QuotaStatus = {
  plan: string;
  planLabel: string;
  upgrades: QuotaRow[];
  rejectedRecent: {
    dimension: string;
    current_usage: number;
    current_limit: number;
    rejected_at: string;
  }[];
};
type SessionSecurity = {
  status: string;
  suspended: boolean;
  authEpoch: number;
  activeSessions: number;
  sessionsByEpoch: { authEpoch: number; count: number }[];
  recentRevocations: number;
};
type SyncSloTopic = {
  topic: string;
  label: string;
  eventType: string | null;
  aggregateType: string | null;
  aggregateId: string | null;
  projectedAt: string | null;
  lagSeconds: number | null;
  withinSlo: boolean;
};
type SyncSlo = {
  topics: SyncSloTopic[];
  pendingOutbox: { count: number; oldestAgeSeconds: number | null; withinSlo: boolean };
  events24h: number;
  guardrail: { maxSloSeconds: number; within60s: boolean };
  measuredTopics: number;
};
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};
const hoursBuckets = (count: number) => {
  if (count <= 12) return '短时限 ≤12h';
  if (count <= 72) return '常规时限 13-72h';
  return '长时限 73h+';
};
const tagsBuckets = (count: number) => {
  if (count <= 5) return '少量标签 1-5';
  if (count <= 15) return '常规标签 6-15';
  return '较多标签 16+';
};
const approvalBuckets = (count: number) => {
  if (count >= 2) return '两项审批开 2';
  if (count === 1) return '单项审批开 1';
  return '未开审批 0';
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function SettingsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [platformVisible, setPlatformVisible] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [sessionSecurity, setSessionSecurity] = useState<SessionSecurity | null>(null);
  const [syncSlo, setSyncSlo] = useState<SyncSlo | null>(null);
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/settings`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setSettings((await response.json()).data);
      const visibility = await sessionApi.request(
        `${api}/api/v1/management/tenant/platform-visibility`,
        { headers: headers() },
      );
      if (visibility.ok) {
        const body = (await visibility.json()).data as { platformVisibleTraffic?: boolean };
        setPlatformVisible(Boolean(body.platformVisibleTraffic));
      }
      const quotaStatus = await sessionApi.request(`${api}/api/v1/management/quota/status`, {
        headers: { ...headers(), 'x-request-id': crypto.randomUUID() },
      });
      if (quotaStatus.ok) setQuota((await quotaStatus.json()).data as QuotaStatus);
      const sessionSecurity = await sessionApi.request(
        `${api}/api/v1/management/session-security`,
        { headers: { ...headers(), 'x-request-id': crypto.randomUUID() } },
      );
      if (sessionSecurity.ok)
        setSessionSecurity((await sessionSecurity.json()).data as SessionSecurity);
      const syncSloResponse = await sessionApi.request(`${api}/api/v1/management/sync-slo`, {
        headers: { ...headers(), 'x-request-id': crypto.randomUUID() },
      });
      if (syncSloResponse.ok) setSyncSlo((await syncSloResponse.json()).data as SyncSlo);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const update = (path: string, value: string | number | boolean) => {
    if (!settings) return;
    const [group, key] = path.split('.') as [string, string];
    const section = (settings as Record<string, unknown>)[group] as Record<string, unknown>;
    setSettings({
      ...settings,
      [group]: { ...section, [key]: value },
    } as Settings);
  };
  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/settings`, {
        method: 'PUT',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(settings),
      });
      if (response.status === 409) return setNote('设置已被其他管理员更新，请刷新后再保存。');
      if (!response.ok) throw Error();
      setSettings((await response.json()).data);
      setNote('工具设置已保存，并已记录审计与事件。');
    } catch {
      setNote('保存失败，请检查输入和权限后重试。');
    } finally {
      setSaving(false);
    }
  };
  const saveVisibility = async (enabled: boolean) => {
    setVisibilitySaving(true);
    setPlatformVisible(enabled);
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/tenant/platform-visibility`,
        {
          method: 'PUT',
          headers: {
            ...headers(),
            'content-type': 'application/json',
          },
          body: JSON.stringify({ platformVisibleTraffic: enabled }),
        },
      );
      if (!response.ok) throw Error();
      const body = (await response.json()).data as { platformVisibleTraffic?: boolean };
      setPlatformVisible(Boolean(body.platformVisibleTraffic));
      setNote(
        enabled
          ? '已开通全平台可见引流：本店可出现在其它租户「附近」列表（仅引流，不碰销售）。'
          : '已关闭全平台可见引流。',
      );
    } catch {
      setPlatformVisible(!enabled);
      setNote('全平台可见引流开关保存失败，请检查权限后重试。');
    } finally {
      setVisibilitySaving(false);
    }
  };
  const approvalDist = useMemo(
    () =>
      countBy([
        approvalBuckets(
          [
            settings?.approvals.requireOwnershipTransfer,
            settings?.approvals.requireContentApproval,
          ].filter(Boolean).length,
        ),
      ]),
    [settings],
  );
  const hoursDist = useMemo(
    () =>
      countBy(
        settings
          ? [settings.reminders.defaultDueHours, settings.reminders.escalationHours].map(
              hoursBuckets,
            )
          : [],
      ),
    [settings],
  );
  const dndDist = useMemo(
    () => countBy(settings ? [settings.doNotDisturb.enabled ? '已开免打扰' : '未开免打扰'] : []),
    [settings],
  );
  const tagsDist = useMemo(
    () =>
      countBy(
        settings
          ? [
              settings.tags.allowCustom ? '允许自定义标签' : '固定标签',
              tagsBuckets(settings.tags.maxPerCustomer),
            ]
          : [],
      ),
    [settings],
  );
  const allocDist = useMemo(
    () =>
      countBy(
        settings ? [settings.ownership.allocation === 'round_robin' ? '轮转分配' : '人工分配'] : [],
      ),
    [settings],
  );
  const visibilityDist = useMemo(
    () => countBy([platformVisible ? '已开通引流' : '未开通引流']),
    [platformVisible],
  );
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载工具设置"
          description="正在校验租户规则、版本与工具授权。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看租户工具设置"
          description="请使用具备租户工具设置权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="工具设置暂不可用"
          description="工具规则未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!settings)
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="empty" title="暂无可用设置" />
      </main>
    );
  return (
    <main className={styles.page} data-testid="management-settings">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 工具设置</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新设置
        </button>
      </header>

      <section className={styles.heroCard} aria-label="工具设置说明">
        <h1>{settings.brand.displayName} 的可审计工具规则</h1>
        <p>
          统一工作流规则：提醒、审批、免打扰、标签与全平台可见引流。保存经权限/版本/审计校验；不碰销售成交。
        </p>
      </section>

      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}
      <section className={styles.panel} aria-label="工具规则概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>审批开关</span>
            <strong>
              {approvalDist.find((b) => b.value === 2)?.value ?? approvalDist[0]?.value ?? 0}
            </strong>
          </div>
          <div>
            <span>默认时限</span>
            <strong>{settings.reminders.defaultDueHours}h</strong>
          </div>
          <div>
            <span>归属分配</span>
            <strong>{settings.ownership.allocation === 'round_robin' ? '轮转' : '人工'}</strong>
          </div>
          <div>
            <span>全平台可见</span>
            <strong>{platformVisible ? '已开通' : '未开通'}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="工具规则分布">
        <div className={styles.panelHead}>
          <h2>工具规则分布</h2>
          <span className={styles.panelMeta}>由当前工具规则档现场推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>审批开关分布</h3>
            <BarList items={approvalDist} total={approvalDist.reduce((n, b) => n + b.value, 0)} />
          </div>
          <div className={styles.panelBlock}>
            <h3>提醒时限分布</h3>
            <BarList items={hoursDist} total={hoursDist.reduce((n, b) => n + b.value, 0)} />
          </div>
          <div className={styles.panelBlock}>
            <h3>免打扰分布</h3>
            <BarList items={dndDist} total={dndDist.reduce((n, b) => n + b.value, 0)} />
          </div>
          <div className={styles.panelBlock}>
            <h3>标签规则分布</h3>
            <BarList items={tagsDist} total={tagsDist.reduce((n, b) => n + b.value, 0)} />
          </div>
          <div className={styles.panelBlock}>
            <h3>归属分配分布</h3>
            <BarList items={allocDist} total={allocDist.reduce((n, b) => n + b.value, 0)} />
          </div>
          <div className={styles.panelBlock}>
            <h3>全平台可见引流分布</h3>
            <BarList
              items={visibilityDist}
              total={visibilityDist.reduce((n, b) => n + b.value, 0)}
            />
          </div>
        </div>
        <p className={styles.honest} role="note">
          以上分布全部由当前已加载工具规则档现场推导(source=local)：审批开关、提醒时限、免打扰、
          标签规则、归属分配与全平台可见引流均按本租户真实规则字段统计；全平台可见只影响入口曝光，
          痕迹为观看/访问/跳转，不含支付金额与第三方订单成功，不包含本平台收款、非本平台下单。
        </p>
      </section>
      <nav className={styles.toolLinks} aria-label="推广员工具相关">
        <a href="/m/entry-funnel">入口漏斗</a>
        <a href="/m/attribution">归因深页</a>
        <a href="/m/external-actions">外链动作</a>
      </nav>
      <p className={styles.toolHint} role="note">
        全平台可见引流只影响「附近」列表曝光；痕迹为观看/访问/跳转，不含支付金额与第三方订单成功。
      </p>
      <section className={styles.panel} aria-label="套餐配额用量">
        <div className={styles.panelHead}>
          <h2>套餐配额用量</h2>
          <span className={styles.panelMeta}>
            {quota ? `${quota.planLabel} · 由真实档案行现场推导` : '正在读取配额'}
          </span>
        </div>
        {quota ? (
          <>
            <div className={styles.distribution}>
              {quota.upgrades.map((row) => (
                <div key={row.dimension} className={styles.panelBlock}>
                  <h3>
                    {row.label}
                    {row.reached && <em className={styles.quotaReached}>已用满</em>}
                  </h3>
                  <ul className={styles.bars}>
                    <li className={styles.quotaRow}>
                      <span className={styles.barLabel}>已用 {row.usage}</span>
                      <span className={styles.barTrack}>
                        <span
                          className={styles.barFill}
                          style={{ width: barWidth(row.limit, row.usage) }}
                        />
                      </span>
                      <span className={styles.barValue}>
                        {row.usage}/{row.limit}
                      </span>
                    </li>
                  </ul>
                  <p className={styles.toolHint}>
                    {row.reached
                      ? `当前${row.label}额度 ${row.limit} 已用满，超出部分将被硬拦截。`
                      : `剩余 ${row.remaining}。`}
                  </p>
                </div>
              ))}
            </div>
            {quota.rejectedRecent.length > 0 && (
              <div className={styles.panelBlock}>
                <h3>最近被拦截的异常写入</h3>
                <ul className={styles.bars}>
                  {quota.rejectedRecent.map((r, i) => (
                    <li key={i} className={styles.barRow}>
                      <span className={styles.barLabel}>
                        {r.dimension} 用时 {r.current_usage}/{r.current_limit}
                      </span>
                      <span className={styles.barValue}>
                        {new Date(r.rejected_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className={styles.honest} role="note">
              配额用量由真实档案行现场推导(source=local)：开放账号计在册激活账号与待接受邀请、客户档案计活跃客户、
              门店入口计活跃门店。触顶仅拒绝超额新建写并记录审计/事件，不碰钱/销售成交、不含支付金额、非本平台下单。
            </p>
          </>
        ) : (
          <p className={styles.barEmpty}>配额状态暂不可用</p>
        )}
      </section>
      <section className={styles.panel} aria-label="会话安全 · 即时失效">
        <div className={styles.panelHead}>
          <h2>会话安全 · 即时失效</h2>
          <span className={styles.panelMeta}>
            {sessionSecurity
              ? `${sessionSecurity.suspended ? '已暂停' : '运行中'} · 会话代数 ${sessionSecurity.authEpoch}`
              : '正在读取会话安全'}
          </span>
        </div>
        {sessionSecurity ? (
          <>
            <div className={styles.summaryStrip}>
              <div>
                <span>会话代数</span>
                <strong>{sessionSecurity.authEpoch}</strong>
              </div>
              <div>
                <span>当前状态</span>
                <strong>{sessionSecurity.suspended ? '已暂停' : '运行中'}</strong>
              </div>
              <div>
                <span>在册会话</span>
                <strong>{sessionSecurity.activeSessions}</strong>
              </div>
              <div>
                <span>近 1 天已关断</span>
                <strong>{sessionSecurity.recentRevocations}</strong>
              </div>
            </div>
            <div className={styles.panelBlock} data-testid="session-epoch-buckets">
              <h3>存量会话代数分布</h3>
              {sessionSecurity.sessionsByEpoch.length ? (
                <ul className={styles.bars}>
                  {sessionSecurity.sessionsByEpoch.map((bucket) => (
                    <li key={bucket.authEpoch} className={styles.barRow}>
                      <span className={styles.barLabel}>代数 {bucket.authEpoch}</span>
                      <span className={styles.barTrack}>
                        <span
                          className={styles.barFill}
                          style={{
                            width: barWidth(
                              sessionSecurity.sessionsByEpoch.reduce((n, b) => n + b.count, 0),
                              bucket.count,
                            ),
                          }}
                        />
                      </span>
                      <span className={styles.barValue}>{bucket.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.barEmpty}>暂无在册会话</p>
              )}
            </div>
            <p className={styles.honest} role="note">
              会话安全由真实会话档案行现场推导(source=local)：会话代数随平台「暂停/恢复」即时递增；
              租户被暂停时，系统会立即吊销全部在册会话并使存量访问令牌永久失效，无需等待重新认证。
              会话加固只控制租户内工具访问授权是否即时关断/放开，不碰钱/销售、不含支付金额、
              非本平台下单、不接美团/抖音实时。
            </p>
          </>
        ) : (
          <p className={styles.barEmpty}>会话安全状态暂不可用</p>
        )}
      </section>
      <section
        className={styles.panel}
        aria-label="多端同步 SLO · 60 秒收敛护栏"
        data-testid="sync-slo-panel"
      >
        <div className={styles.panelHead}>
          <h2>多端同步 SLO · 60 秒收敛护栏</h2>
          <span className={styles.panelMeta}>
            {syncSlo
              ? `${syncSlo.guardrail.within60s ? 'SLO 正常 ≤60s' : 'SLO 违约 >60s'} · 近 24h ${syncSlo.events24h} 条投影`
              : '正在读取同步 SLO'}
          </span>
        </div>
        {syncSlo ? (
          <>
            <div className={styles.summaryStrip}>
              <div>
                <span>护栏判定</span>
                <strong>{syncSlo.guardrail.within60s ? '≤60s' : '>60s'}</strong>
              </div>
              <div>
                <span>已测主题</span>
                <strong>{syncSlo.measuredTopics}</strong>
              </div>
              <div>
                <span>待投递</span>
                <strong>{syncSlo.pendingOutbox.count}</strong>
              </div>
              <div>
                <span>待投递最旧(s)</span>
                <strong>{syncSlo.pendingOutbox.oldestAgeSeconds ?? 0}</strong>
              </div>
            </div>
            <div className={styles.panelBlock} data-testid="sync-slo-topics">
              <h3>各端主题投影滞后（秒）</h3>
              {syncSlo.topics.length ? (
                <ul className={styles.bars}>
                  {syncSlo.topics.map((item) => (
                    <li key={item.topic} className={styles.barRow}>
                      <span className={styles.barLabel}>
                        {item.label}
                        {item.lagSeconds !== null
                          ? item.withinSlo
                            ? ' · 达标'
                            : ' · 超时'
                          : ' · 暂无投影'}
                      </span>
                      <span className={styles.barTrack}>
                        <span
                          className={styles.barFill}
                          style={{
                            width: barWidth(
                              syncSlo.guardrail.maxSloSeconds,
                              Math.max(0, item.lagSeconds ?? 0),
                            ),
                          }}
                        />
                      </span>
                      <span className={styles.barValue}>
                        {item.lagSeconds !== null ? `${item.lagSeconds}s` : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.barEmpty}>暂无投影主题（尚未有发布/权限/作业变更）</p>
              )}
            </div>
            <p className={styles.honest} role="note">
              多端同步 SLO 由真实投影档案行现场推导(source=local)：投影滞后＝最新一条
              sync_notifications 距现在秒数；待投递＝未下发的 outbox 条数与最旧等待秒数。 护栏限 60
              秒（发布/权限变更应在此窗口内被各端读取收敛）。无相关变更时无传播
              滞后可测、视为健康。同步护栏只观测租户内工具投递状态，不接美团/抖音实时、
              不含支付金额/销售成交、非本平台下单。
            </p>
          </>
        ) : (
          <p className={styles.barEmpty}>同步 SLO 状态暂不可用</p>
        )}
      </section>
      <section className={styles.grid}>
        <fieldset>
          <legend>提醒与升级</legend>
          <label>
            默认时限（小时）
            <input
              aria-label="默认时限"
              type="number"
              min="1"
              max="720"
              value={settings.reminders.defaultDueHours}
              onChange={(e) => update('reminders.defaultDueHours', Number(e.target.value))}
            />
          </label>
          <label>
            升级时限（小时）
            <input
              aria-label="升级时限"
              type="number"
              min="1"
              max="720"
              value={settings.reminders.escalationHours}
              onChange={(e) => update('reminders.escalationHours', Number(e.target.value))}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>审批规则</legend>
          <label>
            <input
              type="checkbox"
              checked={settings.approvals.requireOwnershipTransfer}
              onChange={(e) => update('approvals.requireOwnershipTransfer', e.target.checked)}
            />{' '}
            归属转移需要审批
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.approvals.requireContentApproval}
              onChange={(e) => update('approvals.requireContentApproval', e.target.checked)}
            />{' '}
            内容发布需要审批
          </label>
        </fieldset>
        <fieldset>
          <legend>免打扰规则</legend>
          <label>
            <input
              type="checkbox"
              checked={settings.doNotDisturb.enabled}
              onChange={(e) => update('doNotDisturb.enabled', e.target.checked)}
            />{' '}
            启用默认免打扰时段
          </label>
          <label>
            开始小时
            <input
              aria-label="免打扰开始小时"
              type="number"
              min="0"
              max="23"
              value={settings.doNotDisturb.startHour}
              onChange={(e) => update('doNotDisturb.startHour', Number(e.target.value))}
            />
          </label>
          <label>
            结束小时
            <input
              aria-label="免打扰结束小时"
              type="number"
              min="0"
              max="23"
              value={settings.doNotDisturb.endHour}
              onChange={(e) => update('doNotDisturb.endHour', Number(e.target.value))}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>标签与归属</legend>
          <label>
            <input
              type="checkbox"
              checked={settings.tags.allowCustom}
              onChange={(e) => update('tags.allowCustom', e.target.checked)}
            />{' '}
            允许自定义标签
          </label>
          <label>
            每位客户最大标签数
            <input
              aria-label="最大标签数"
              type="number"
              min="1"
              max="50"
              value={settings.tags.maxPerCustomer}
              onChange={(e) => update('tags.maxPerCustomer', Number(e.target.value))}
            />
          </label>
          <label>
            默认分配
            <select
              aria-label="默认分配"
              value={settings.ownership.allocation}
              onChange={(e) => update('ownership.allocation', e.target.value)}
            >
              <option value="manual">人工分配</option>
              <option value="round_robin">轮转分配</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>全平台可见引流</legend>
          <label>
            <input
              type="checkbox"
              checked={platformVisible}
              disabled={visibilitySaving}
              onChange={(e) => void saveVisibility(e.target.checked)}
            />{' '}
            出现在全平台「附近」引流列表（推广员工具 · 不碰销售）
          </label>
          <p className={styles.hint}>
            开启后，其它租户消费者在附近页可能看到本店入口；仅观看/访问/跳转痕迹，不含成交。
          </p>
        </fieldset>
        <fieldset>
          <legend>品牌规则</legend>
          <label>
            展示名称
            <input
              aria-label="展示名称"
              maxLength={160}
              value={settings.brand.displayName}
              onChange={(e) => update('brand.displayName', e.target.value)}
            />
          </label>
          <label>
            主色
            <input
              aria-label="主色"
              value={settings.brand.primaryColor}
              onChange={(e) => update('brand.primaryColor', e.target.value)}
            />
          </label>
        </fieldset>
      </section>
      <Button className={styles.save} loading={saving} onClick={() => void save()}>
        保存工具设置
      </Button>
    </main>
  );
}
function BarList({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li key={item.label} className={styles.barRow}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </span>
          <span className={styles.barValue}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
