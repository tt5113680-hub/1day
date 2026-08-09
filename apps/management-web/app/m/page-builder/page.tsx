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
  name: string;
  code: string;
  target: string;
  published_version_id: string | null;
  version: number;
};
type Preview = {
  template: Template;
  version: { id: string; sequence: number; status: string } | null;
  modules: { id: string; module_type: string; position: number; config: Record<string, unknown> }[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
export default function PageBuilder() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [templates, setTemplates] = useState<Template[]>([]),
    [selected, setSelected] = useState<Preview | null>(null),
    [note, setNote] = useState('');
  const headers = () => ({
    'content-type': 'application/json',
  });
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/page-templates`, { headers: headers() });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      setTemplates((await r.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const preview = async (id: string) => {
    const r = await sessionApi.request(`${api}/api/v1/page-templates/${id}/preview`, {
      headers: headers(),
    });
    if (!r.ok) return setNote('模板预览不可用。');
    setSelected((await r.json()).data);
  };
  const publish = async () => {
    if (!selected?.version) return;
    const r = await sessionApi.request(
      `${api}/api/v1/page-templates/${selected.template.id}/publish`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          versionId: selected.version.id,
          templateVersion: selected.template.version,
        }),
      },
    );
    if (!r.ok) return setNote('发布失败：版本可能已变化，请刷新后重试。');
    setNote('版本已发布，服务端已记录审计与事件。');
    await load();
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载模板与版本"
          description="正在校验模板目录、草稿与发布版本。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看页面装修"
          description="请使用具备模板经营权限的账号。"
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
        eyebrow="ONEDAY / 商户模板与发布"
        title="在固定业务模块内维护模板、预览与版本"
        description="不提供任意低代码执行能力；发布与版本锁由服务端控制。当前页面模板发布尚未等同于 Consumer Storefront 生效，完整绑定属于 Batch 2。"
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
          <h2>模板</h2>
          {templates.length ? (
            templates.map((t) => (
              <article key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <span>
                    {t.code} · {businessLabel(t.target)}
                  </span>
                  <StatusBadge tone={t.published_version_id ? 'success' : 'warning'}>
                    {t.published_version_id ? '已有已发布版本' : '尚未发布'}
                  </StatusBadge>
                </div>
                <Button tone="secondary" onClick={() => void preview(t.id)}>
                  实时预览
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
          <h2>预览画布</h2>
          {selected ? (
            <>
              <p>
                版本 {selected.version?.sequence ?? '—'} ·{' '}
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
              <div className={styles.canvas}>
                {selected.modules.map((m) => (
                  <article key={m.id}>
                    <span>{m.position}</span>
                    <strong>{businessLabel(m.module_type)}</strong>
                    <small>固定模块配置</small>
                  </article>
                ))}
              </div>
              {selected.version && <Button onClick={() => void publish()}>发布当前版本</Button>}
            </>
          ) : (
            <p>选择模板后显示其持久化模块与版本。</p>
          )}
        </Card>
      </section>
    </main>
  );
}
