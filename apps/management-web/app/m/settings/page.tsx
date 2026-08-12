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
