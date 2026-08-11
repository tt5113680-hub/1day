'use client';

import { SessionApiClient } from '@oneday/session-client';
import { StorefrontModuleOutline } from '@oneday/storefront-renderer';
import '@oneday/storefront-renderer/outline.css';
import '@oneday/storefront-renderer/storefront.css';
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
  name: string;
  code: string;
  target: string;
  published_version_id: string | null;
  version: number;
  binding_id: string | null;
  store_id: string | null;
  store_name: string | null;
  draft_version_id: string | null;
  live_version_id: string | null;
  binding_version: number | null;
  published_at: string | null;
  industry_config: { family?: string };
};
type TemplateVersion = { id: string; sequence: number; status: string; version: number };
type Module = {
  id: string;
  module_type: string;
  position: number;
  config: Record<string, unknown>;
};
type Preview = {
  template: {
    id: string;
    name: string;
    code: string;
    target: string;
    version: number;
    publishedVersionId: string | null;
  };
  binding: {
    id: string;
    storeId: string;
    storeName: string;
    draftVersionId: string;
    liveVersionId: string;
    version: number;
  } | null;
  version: TemplateVersion | null;
  versions: TemplateVersion[];
  modules: Module[];
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const consumer = process.env.NEXT_PUBLIC_CONSUMER_BASE_URL ?? 'http://localhost:3002';
const sessionApi = new SessionApiClient(api);

const CHANNEL_OPTIONS = [
  { code: 'group-buy', label: '团购' },
  { code: 'menu', label: '菜单' },
  { code: 'membership', label: '会员' },
  { code: 'services', label: '服务' },
  { code: 'cases', label: '案例' },
  { code: 'courses', label: '课程' },
  { code: 'events', label: '活动' },
  { code: 'catalog', label: '选品' },
] as const;

const CAPABILITY_OPTIONS = [
  { code: 'consult', label: '咨询' },
  { code: 'phone', label: '电话' },
  { code: 'navigation', label: '导航' },
  { code: 'appointment', label: '预约' },
  { code: 'trial', label: '试听/体验' },
  { code: 'share', label: '分享' },
] as const;

function readChannelCodes(config: Record<string, unknown>): string[] {
  const raw = config.channels;
  if (!Array.isArray(raw)) return [];
  const codes: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') codes.push(item);
    else if (
      item &&
      typeof item === 'object' &&
      typeof (item as { code?: string }).code === 'string'
    )
      codes.push((item as { code: string }).code);
  }
  return codes.slice(0, 3);
}

function readCapabilities(config: Record<string, unknown>): string[] {
  const raw = config.capabilities;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string');
}

export default function PageBuilder() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [templates, setTemplates] = useState<Template[]>([]),
    [selected, setSelected] = useState<Preview | null>(null),
    [modules, setModules] = useState<Module[]>([]),
    [previewPath, setPreviewPath] = useState(''),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false);
  const headers = () => ({ 'content-type': 'application/json' });
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/page-templates`, {
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

  const preview = async (id: string, versionId?: string) => {
    const response = await sessionApi.request(
      `${api}/api/v1/page-templates/${id}/preview${versionId ? `?versionId=${encodeURIComponent(versionId)}` : ''}`,
      { headers: headers() },
    );
    if (!response.ok) return setNote('模板预览不可用。');
    const data = (await response.json()).data as Preview;
    setSelected(data);
    setModules(data.modules);
    setPreviewPath('');
  };
  const createDraft = async () => {
    if (!selected?.version) return;
    setSaving(true);
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/page-templates/${selected.template.id}/drafts`,
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ sourceVersionId: selected.version.id }),
        },
      );
      if (!response.ok) throw Error();
      const draft = (await response.json()).data as TemplateVersion;
      await preview(selected.template.id, draft.id);
      setNote(`草稿 V${draft.sequence} 已从当前版本创建，消费者仍读取已发布版本。`);
      await load();
    } catch {
      setNote('创建草稿失败，请刷新版本后重试。');
    } finally {
      setSaving(false);
    }
  };
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= modules.length) return;
    const next = [...modules];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setModules(next.map((module, position) => ({ ...module, position: position + 1 })));
  };
  const toggle = (index: number) =>
    setModules((current) =>
      current.map((module, position) =>
        position === index
          ? {
              ...module,
              config: { ...module.config, visible: module.config.visible === false },
            }
          : module,
      ),
    );
  const patchConfig = (index: number, patch: Record<string, unknown>) =>
    setModules((current) =>
      current.map((module, position) =>
        position === index ? { ...module, config: { ...module.config, ...patch } } : module,
      ),
    );
  const toggleChannel = (index: number, code: string) => {
    const module = modules[index];
    if (!module) return;
    const current = readChannelCodes(module.config);
    const next = current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code].slice(0, 3);
    patchConfig(index, {
      channels: next.map((item) => {
        const option = CHANNEL_OPTIONS.find((entry) => entry.code === item);
        return { code: item, label: option?.label ?? item };
      }),
    });
  };
  const toggleCapability = (index: number, code: string) => {
    const module = modules[index];
    if (!module) return;
    const current = readCapabilities(module.config);
    const next = current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code];
    patchConfig(index, { capabilities: next });
  };
  const saveDraft = async () => {
    if (!selected?.version || selected.version.status !== 'draft') return;
    setSaving(true);
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/page-templates/${selected.template.id}/drafts/${selected.version.id}`,
        {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify({
            version: selected.version.version,
            modules: modules.map((module) => ({
              moduleType: module.module_type,
              config: module.config,
            })),
          }),
        },
      );
      if (!response.ok) throw Error();
      await preview(selected.template.id, selected.version.id);
      setNote('草稿已保存；发布前可继续使用同一消费者渲染器预览。');
    } catch {
      setNote('保存失败：草稿版本可能已变化，请重新加载。');
    } finally {
      setSaving(false);
    }
  };
  const createPreviewLink = async () => {
    if (!selected?.binding || !selected.version) return;
    const response = await sessionApi.request(
      `${api}/api/v1/page-templates/${selected.template.id}/preview-link`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ versionId: selected.version.id }),
      },
    );
    if (!response.ok) return setNote('无法生成安全预览链接。');
    setPreviewPath((await response.json()).data.path);
    setNote('30 分钟安全预览已生成；页面使用与正式数字门店相同的消费者渲染器。');
  };
  const switchVersion = async (versionId: string, mode: 'publish' | 'rollback') => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/page-templates/${selected.template.id}/${mode}`,
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            versionId,
            templateVersion: selected.template.version,
            bindingVersion: selected.binding?.version,
          }),
        },
      );
      if (!response.ok) throw Error();
      setNote(
        mode === 'publish'
          ? '数字门店已原子发布，Consumer 已读取新版本。'
          : '数字门店已回滚并生成新的发布记录。',
      );
      await load();
      await preview(selected.template.id, versionId);
    } catch {
      setNote('版本切换失败：数据可能已变化或未通过发布校验，请刷新后重试。');
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载模板与版本"
          description="正在校验门店绑定、草稿与已发布版本。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看页面装修"
          description="请使用具备模板工具权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="页面装修暂不可用"
          description="模板与版本数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 入口页装修"
        title="在固定业务模块内维护模板、预览与版本"
        description="草稿、手机/PC 预览、发布和回滚共用一套 Storefront 绑定；业务对象保持各自唯一真源。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新模板
          </Button>
        }
      />
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}
      <section className={styles.layout}>
        <Card className={styles.panel}>
          <h2>门店模板</h2>
          {templates.length ? (
            templates.map((template) => (
              <article key={template.id}>
                <div>
                  <strong>{template.name}</strong>
                  <span>
                    {template.store_name
                      ? `${template.store_name} · ${businessLabel(template.industry_config?.family ?? 'consumer')}`
                      : `${template.code} · ${businessLabel(template.target)}`}
                  </span>
                  <StatusBadge tone={template.live_version_id ? 'success' : 'warning'}>
                    {template.live_version_id
                      ? '数字门店已发布'
                      : template.published_version_id
                        ? '模板已发布（未绑定门店）'
                        : '尚未发布'}
                  </StatusBadge>
                  {template.live_version_id && template.published_at && (
                    <small className={styles.publishedEvidence}>
                      消费者上次读取已发布版本：{new Date(template.published_at).toLocaleString()}
                    </small>
                  )}
                </div>
                <Button tone="secondary" onClick={() => void preview(template.id)}>
                  进入装修
                </Button>
              </article>
            ))
          ) : (
            <AppStatePanel
              kind="empty"
              title="暂无模板"
              description="请先从平台目录实例化一个受控模板。"
            />
          )}
        </Card>
        <Card className={styles.panel}>
          <h2>装修与同渲染器预览</h2>
          {selected ? (
            <>
              <div className={styles.versionHeader}>
                <p>
                  版本 V{selected.version?.sequence ?? '—'} ·{' '}
                  {selected.version ? (
                    <StatusBadge
                      tone={selected.version.status === 'published' ? 'success' : 'warning'}
                    >
                      {businessLabel(selected.version.status)}
                    </StatusBadge>
                  ) : (
                    '无可用版本'
                  )}
                </p>
                {selected.binding ? (
                  <StatusBadge tone="success">已绑定 {selected.binding.storeName}</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">未绑定门店</StatusBadge>
                )}
              </div>
              <div className={styles.canvas}>
                <StorefrontModuleOutline
                  modules={modules}
                  includeHidden
                  title="装修模块（共享渲染契约）"
                  renderActions={
                    selected.version?.status === 'draft'
                      ? (module) => {
                          const index = modules.findIndex((item) => item.id === module.id);
                          if (index < 0) return null;
                          return (
                            <div className={styles.moduleActions}>
                              <Button tone="quiet" onClick={() => move(index, -1)}>
                                上移
                              </Button>
                              <Button tone="quiet" onClick={() => move(index, 1)}>
                                下移
                              </Button>
                              <Button tone="quiet" onClick={() => toggle(index)}>
                                {module.config.visible === false ? '显示' : '隐藏'}
                              </Button>
                            </div>
                          );
                        }
                      : undefined
                  }
                  renderExtras={
                    selected.version?.status === 'draft'
                      ? (module) => {
                          const index = modules.findIndex((item) => item.id === module.id);
                          if (index < 0) return null;
                          if (module.module_type === 'operating_channels') {
                            return (
                              <fieldset className={styles.configFieldset}>
                                <legend>经营频道（最多 3 个）</legend>
                                {CHANNEL_OPTIONS.map((option) => {
                                  const selectedCodes = readChannelCodes(module.config);
                                  const checked = selectedCodes.includes(option.code);
                                  return (
                                    <label key={option.code}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={!checked && selectedCodes.length >= 3}
                                        onChange={() => toggleChannel(index, option.code)}
                                      />
                                      {option.label}
                                    </label>
                                  );
                                })}
                              </fieldset>
                            );
                          }
                          if (module.module_type === 'quick_actions') {
                            return (
                              <fieldset className={styles.configFieldset}>
                                <legend>快捷能力（白名单）</legend>
                                {CAPABILITY_OPTIONS.map((option) => (
                                  <label key={option.code}>
                                    <input
                                      type="checkbox"
                                      checked={readCapabilities(module.config).includes(
                                        option.code,
                                      )}
                                      onChange={() => toggleCapability(index, option.code)}
                                    />
                                    {option.label}
                                  </label>
                                ))}
                              </fieldset>
                            );
                          }
                          if (module.module_type === 'member_wallet') {
                            return (
                              <fieldset className={styles.configFieldset}>
                                <legend>会员钱包</legend>
                                <label>
                                  展示模式
                                  <select
                                    value={
                                      typeof module.config.mode === 'string'
                                        ? module.config.mode
                                        : 'balances'
                                    }
                                    onChange={(event) =>
                                      patchConfig(index, { mode: event.target.value })
                                    }
                                  >
                                    <option value="balances">权益余额</option>
                                  </select>
                                </label>
                              </fieldset>
                            );
                          }
                          return null;
                        }
                      : undefined
                  }
                />
              </div>
              <div className={styles.actions}>
                {selected.binding && selected.version?.status !== 'draft' ? (
                  <Button loading={saving} onClick={() => void createDraft()}>
                    创建装修草稿
                  </Button>
                ) : null}
                {selected.version?.status === 'draft' ? (
                  <Button loading={saving} onClick={() => void saveDraft()}>
                    保存草稿
                  </Button>
                ) : null}
                {selected.binding && selected.version ? (
                  <Button tone="secondary" onClick={() => void createPreviewLink()}>
                    生成手机/PC 预览
                  </Button>
                ) : null}
                {selected.version?.status === 'draft' ? (
                  <Button
                    loading={saving}
                    onClick={() => void switchVersion(selected.version!.id, 'publish')}
                  >
                    发布当前草稿
                  </Button>
                ) : null}
              </div>
              {previewPath ? (
                <a
                  className={styles.previewLink}
                  href={`${consumer}${previewPath}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  在消费者渲染器打开安全预览
                </a>
              ) : null}
              {selected.binding &&
              selected.versions.some((version) => version.status === 'archived') ? (
                <div className={styles.history}>
                  <h3>发布历史</h3>
                  {selected.versions
                    .filter((version) => version.status === 'archived')
                    .map((version) => (
                      <Button
                        key={version.id}
                        tone="quiet"
                        onClick={() => void switchVersion(version.id, 'rollback')}
                      >
                        回滚到 V{version.sequence}
                      </Button>
                    ))}
                </div>
              ) : null}
            </>
          ) : (
            <AppStatePanel
              kind="empty"
              title="选择一间门店开始装修"
              description="绑定门店会显示草稿、发布状态和可回滚历史。"
            />
          )}
        </Card>
      </section>
    </main>
  );
}
