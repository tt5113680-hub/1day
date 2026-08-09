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
type Item = {
  id: string;
  kind: string;
  title: string;
  status: string;
  version: number;
  channels: string[];
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
export default function ContentPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [items, setItems] = useState<Item[]>([]),
    [title, setTitle] = useState(''),
    [note, setNote] = useState('');
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/management/content`, {
        headers: {},
      });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      setItems((await r.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const create = async () => {
    if (!title.trim()) return setNote('请填写内容标题。');
    const r = await sessionApi.request(`${api}/api/v1/management/content`, {
      method: 'POST',
      headers: {
        'idempotency-key': crypto.randomUUID(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ kind: 'article', title }),
    });
    if (!r.ok) return setNote('内容未创建，请检查权限和输入。');
    setTitle('');
    setNote('草稿已创建，待审批后才能登记分发。');
    await load();
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载内容中心"
          description="正在校验内容状态与已登记渠道。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看内容中心"
          description="请使用具备内容经营权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="内容中心暂不可用"
          description="内容数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 商户内容中心"
        title="让内容生产、审批与渠道连接保持可追溯"
        description="渠道分发只登记待授权请求；没有第三方授权时不会伪造发送结果。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新内容
          </Button>
        }
      />
      <Card className={styles.create}>
        <label>
          文章标题
          <input
            aria-label="文章标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </label>
        <Button onClick={() => void create()}>创建草稿</Button>
        {note && <p role="status">{note}</p>}
      </Card>
      <section className={styles.grid}>
        {items.length ? (
          items.map((x) => (
            <article key={x.id}>
              <Card className={styles.contentCard}>
                <div className={styles.contentMeta}>
                  <StatusBadge tone="info">{businessLabel(x.kind)}</StatusBadge>
                  <StatusBadge tone={x.status === 'approved' ? 'success' : 'warning'}>
                    {businessLabel(x.status)}
                  </StatusBadge>
                </div>
                <strong>{x.title}</strong>
                <p>{x.status === 'approved' ? '已批准，可登记渠道待授权分发' : '草稿，等待审批'}</p>
                <small>
                  {x.channels?.length
                    ? `已登记：${x.channels.map(businessLabel).join('、')}`
                    : '尚未登记分发渠道'}
                </small>
              </Card>
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            <AppStatePanel
              kind="empty"
              title="暂无内容"
              description="创建草稿，开始可追溯的内容审批流程。"
            />
          </div>
        )}
      </section>
    </main>
  );
}
