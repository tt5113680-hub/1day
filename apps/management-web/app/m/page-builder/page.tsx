'use client';
import { SessionApiClient } from '@oneday/session-client';
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
  if (state === 'loading') return <main className={styles.centered}>正在加载模板与版本…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看页面装修</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>页面装修暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 页面装修</p>
          <h1>在固定业务模块内维护模板、预览与版本</h1>
          <span>不提供任意低代码执行能力；发布、回滚和版本锁全部由服务端控制。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}
      <section className={styles.layout}>
        <section className={styles.panel}>
          <h2>模板</h2>
          {templates.length ? (
            templates.map((t) => (
              <article key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <span>
                    {t.code} · {t.target}
                  </span>
                  <p>{t.published_version_id ? '已有已发布版本' : '尚未发布'}</p>
                </div>
                <button onClick={() => void preview(t.id)}>实时预览</button>
              </article>
            ))
          ) : (
            <p>暂无模板。</p>
          )}
        </section>
        <section className={styles.panel}>
          <h2>预览画布</h2>
          {selected ? (
            <>
              <p>
                版本 {selected.version?.sequence ?? '—'} ·{' '}
                {selected.version?.status ?? '无可用版本'}
              </p>
              <div className={styles.canvas}>
                {selected.modules.map((m) => (
                  <article key={m.id}>
                    <span>{m.position}</span>
                    <strong>{m.module_type}</strong>
                    <small>固定模块配置</small>
                  </article>
                ))}
              </div>
              {selected.version && (
                <button className={styles.primary} onClick={() => void publish()}>
                  发布当前版本
                </button>
              )}
            </>
          ) : (
            <p>选择模板后显示其持久化模块与版本。</p>
          )}
        </section>
      </section>
    </main>
  );
}
