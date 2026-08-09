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

type Template = {
  id: string;
  code: string;
  name: string;
  target: string;
  industry_config: { industry?: string; scenario?: string };
  published_version_id: string | null;
  version: number;
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
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 平台模板治理"
        title="固定组件、行业配置与受控发布"
        description="平台模板只使用经过验证的固定模块，不提供任意代码或低代码执行能力。发布动作全程保留版本与审计记录。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新目录
          </Button>
        }
      />
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <Card className={styles.panel}>
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
        </Card>
        <Card className={styles.panel}>
          <h2>已持久化模板</h2>
          {templates.length ? (
            templates.map((template) => (
              <article className={styles.template} key={template.id}>
                <div>
                  <strong>{template.name}</strong>
                  <span>
                    {template.code} · {businessLabel(template.target)}
                  </span>
                  <small>
                    {template.industry_config?.industry || '未配置行业'} /{' '}
                    {template.industry_config?.scenario || '未配置场景'}
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
        </Card>
      </section>
      <Card className={styles.panel}>
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
      </Card>
    </main>
  );
}
