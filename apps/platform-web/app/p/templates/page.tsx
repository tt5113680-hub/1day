'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, businessLabel, Button, StatusBadge } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type Template = {
  id: string;
  code: string;
  name: string;
  target: string;
  industry_config: { industry?: string; scenario?: string };
  published_version_id: string | null;
  version: number;
  store_name?: string | null;
  live_version_id?: string | null;
};
type Preview = {
  template: {
    id: string;
    code: string;
    name: string;
    target: string;
    industryConfig: { industry?: string; scenario?: string };
    version: number;
  };
  version: { id: string; sequence: number; status: string } | null;
  modules: { id: string; module_type: string; position: number; config: Record<string, unknown> }[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const bundles = {
  service: ['hero', 'action_grid', 'content'],
  conversion: ['hero', 'content', 'result_list'],
};
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const targetLabel = (target: string) =>
  target === 'consumer'
    ? '消费者'
    : target === 'employee'
      ? '员工'
      : target === 'management'
        ? '管理'
        : target || '未分类';
const publishLabel = (template: Template) =>
  template.live_version_id
    ? '数字门店已发布'
    : template.published_version_id
      ? '模板已发布未绑定'
      : '尚未发布';
const industryLabel = (industry?: string) =>
  industry === 'restaurant'
    ? '餐饮'
    : industry === 'beauty'
      ? '美业'
      : industry === 'retail'
        ? '零售'
        : industry || '未配置行业';

export default function PlatformTemplatesPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Preview | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    target: 'consumer',
    industry: '',
    scenario: '',
    bundle: 'service' as keyof typeof bundles,
  });
  const headers = () => ({});
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/templates`, {
        headers: headers(),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setTemplates((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const preview = async (id: string) => {
    const response = await sessionApi.request(`${api}/api/v1/platform/templates/${id}/preview`, {
      headers: headers(),
    });
    if (!response.ok) return setNote('模板预览不可用，请刷新后重试。');
    setSelected((await response.json()).data);
  };
  const create = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/templates`, {
        method: 'POST',
        headers: {
          ...headers(),
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          target: form.target,
          industryConfig: { industry: form.industry, scenario: form.scenario },
          modules: bundles[form.bundle].map((moduleType) => ({ moduleType, config: {} })),
        }),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 400)
        return setNote('请填写有效编码、名称、行业与场景，并选择固定组件组合。');
      if (response.status === 409) return setNote('模板编码已存在，请使用新的编码。');
      if (!response.ok) throw Error();
      setNote('平台模板草稿已保存，可预览后发布。');
      setForm({
        code: '',
        name: '',
        target: 'consumer',
        industry: '',
        scenario: '',
        bundle: 'service',
      });
      await load();
    } catch {
      setNote('保存失败，事务已回滚。');
    } finally {
      setSaving(false);
    }
  };
  const publish = async () => {
    if (!selected?.version) return;
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/platform/templates/${selected.template.id}/publish`,
        {
          method: 'POST',
          headers: { ...headers(), 'content-type': 'application/json' },
          body: JSON.stringify({
            versionId: selected.version.id,
            templateVersion: selected.template.version,
          }),
        },
      );
      if (response.status === 409) return setNote('模板版本已变化，请重新预览后发布。');
      if (!response.ok) throw Error();
      setNote('平台模板版本已发布，并已记录审计与事件。');
      await load();
      await preview(selected.template.id);
    } catch {
      setNote('发布失败，请检查平台权限后重试。');
    } finally {
      setSaving(false);
    }
  };

  const targetCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const template of templates) {
      const key = targetLabel(template.target);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [templates]);

  const publishCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const template of templates) {
      const key = publishLabel(template);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, value]) => ({ key, value }));
  }, [templates]);

  const industryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const template of templates) {
      const key = industryLabel(template.industry_config?.industry);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [templates]);

  const storeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const template of templates) {
      if (!template.live_version_id) continue;
      const key = template.store_name?.trim() || '未绑定门店';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([key, value]) => ({ key, value }));
    list.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    return list;
  }, [templates]);

  const versionBuckets = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const template of templates) {
      const n = template.version ?? 0;
      const key = n <= 1 ? '首版 1' : n <= 5 ? '演进 2-5' : '多次演进 6+';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([key, value]) => ({ key, value }));
  }, [templates]);

  const boundCount = templates.filter((template) => template.live_version_id).length;
  const publishedCount = templates.filter((template) => template.published_version_id).length;

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载平台模板"
          description="正在校验平台权限与模板发布状态。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看平台模板组件"
          description="该能力仅向具备平台模板治理权限的运营人员开放。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="平台模板组件暂不可用"
          description="模板数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page} data-testid="platform-templates">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 平台模板治理</span>
        <span className={styles.topBarActions}>
          <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
            刷新目录
          </button>
        </span>
      </header>

      <section className={styles.heroCard} aria-label="平台模板治理说明">
        <h1>固定组件、行业配置与受控发布</h1>
        <p>
          只使用经过验证的固定模块，不提供任意代码或低代码执行能力。发布动作全程保留版本与审计记录；
          分布全部由已抓取模板档案行现场推导；不包含本平台收款、非本平台下单。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="平台模板治理概况">
        <div>
          <span>模板</span>
          <strong>{templates.length}</strong>
        </div>
        <div>
          <span>目标页面</span>
          <strong>{targetCounts.length}</strong>
        </div>
        <div>
          <span>已发布</span>
          <strong>{publishedCount}</strong>
        </div>
        <div>
          <span>绑定数字门店</span>
          <strong>{boundCount}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="平台模板分布">
        <div className={styles.panelBlock}>
          <h2>模板目标分布</h2>
          <ul className={styles.bars}>
            {targetCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(templates.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!templates.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>发布状态分布</h2>
          <ul className={styles.bars}>
            {publishCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(templates.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!templates.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>行业配置分布</h2>
          <ul className={styles.bars}>
            {industryCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(templates.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!templates.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>绑定数字门店分布</h2>
          <ul className={styles.bars}>
            {storeCounts.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(boundCount, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!boundCount && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>版本演进分布</h2>
          <ul className={styles.bars}>
            {versionBuckets.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: barWidth(templates.length, b.value) }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!templates.length && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取模板档案行现场推导（source=local）：模板目标、发布状态、行业配置、
        绑定数字门店与版本演进；仅记录受控模板治理，未接美团/抖音实时投放，不包含本平台收款、
        非本平台下单；本地试点记录。
      </p>

      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}

      <section className={styles.grid}>
        <section className={styles.panel}>
          <h2>新建平台模板</h2>
          <label>
            模板编码
            <input
              aria-label="模板编码"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="clinic-consultation"
            />
          </label>
          <label>
            模板名称
            <input
              aria-label="模板名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            页面目标
            <select
              aria-label="页面目标"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
            >
              <option value="consumer">消费者数字门店</option>
              <option value="employee">员工工作台</option>
              <option value="management">商户经营后台</option>
            </select>
          </label>
          <label>
            行业
            <input
              aria-label="行业"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="clinic"
            />
          </label>
          <label>
            业务场景
            <input
              aria-label="业务场景"
              value={form.scenario}
              onChange={(e) => setForm({ ...form, scenario: e.target.value })}
              placeholder="consultation"
            />
          </label>
          <label>
            固定组件组合
            <select
              aria-label="固定组件组合"
              value={form.bundle}
              onChange={(e) => setForm({ ...form, bundle: e.target.value as keyof typeof bundles })}
            >
              <option value="service">服务承接：主视觉 / 快捷行动 / 内容</option>
              <option value="conversion">转化结果：主视觉 / 内容 / 结果列表</option>
            </select>
          </label>
          <Button className={styles.submit} loading={saving} onClick={() => void create()}>
            保存平台模板草稿
          </Button>
        </section>
        <section className={styles.panel}>
          <div className={styles.head}>
            <h2>已持久化模板</h2>
            <StatusBadge tone={templates.length ? 'success' : 'neutral'}>
              {templates.length ? `${templates.length} 个模板` : '暂无模板'}
            </StatusBadge>
          </div>
          {templates.length ? (
            templates.map((template) => (
              <article className={styles.template} key={template.id}>
                <div>
                  <strong>{template.name}</strong>
                  <span>
                    {template.code} · {targetLabel(template.target)}
                  </span>
                  <small>
                    {template.industry_config?.industry || '未配置行业'} /{' '}
                    {template.industry_config?.scenario || '未配置场景'}
                    {template.live_version_id ? ` · ${template.store_name || '未绑定门店'}` : ''}
                  </small>
                </div>
                <div className={styles.templateActions}>
                  <StatusBadge tone={template.published_version_id ? 'success' : 'warning'}>
                    {businessLabel(template.published_version_id ? 'published' : 'draft')}
                  </StatusBadge>
                  <Button tone="secondary" onClick={() => void preview(template.id)}>
                    预览模块
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <AppStatePanel
              kind="empty"
              title="暂无平台模板"
              description="在左侧创建第一个受控行业模板。"
            />
          )}
        </section>
      </section>

      <section className={styles.panel}>
        <h2>实时预览与发布</h2>
        {selected ? (
          <>
            <p>
              {selected.template.name} ·{' '}
              {selected.template.industryConfig?.industry || '未配置行业'} /{' '}
              {selected.template.industryConfig?.scenario || '未配置场景'} · 版本{' '}
              {selected.version?.sequence ?? '—'}
              {selected.version ? (
                <StatusBadge tone={selected.version.status === 'published' ? 'success' : 'warning'}>
                  {businessLabel(selected.version.status)}
                </StatusBadge>
              ) : (
                '（无可用版本）'
              )}
            </p>
            <div className={styles.canvas}>
              {selected.modules.map((module) => (
                <article key={module.id}>
                  <span>{module.position}</span>
                  <strong>{businessLabel(module.module_type)}</strong>
                  <small>固定模块配置</small>
                </article>
              ))}
            </div>
            {selected.version && (
              <Button loading={saving} onClick={() => void publish()}>
                发布当前版本
              </Button>
            )}
          </>
        ) : (
          <p>选择模板后可查看其持久化模块和发布状态。</p>
        )}
      </section>
    </main>
  );
}
