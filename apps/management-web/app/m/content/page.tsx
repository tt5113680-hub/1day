'use client';
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
export default function ContentPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [items, setItems] = useState<Item[]>([]),
    [title, setTitle] = useState(''),
    [note, setNote] = useState('');
  const load = useCallback(async () => {
    const token = sessionStorage.getItem('oneday.accessToken');
    if (!token) return setState('forbidden');
    setState('loading');
    try {
      const r = await fetch(`${api}/api/v1/management/content`, {
        headers: { authorization: `Bearer ${token}`, 'x-request-id': crypto.randomUUID() },
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
    const token = sessionStorage.getItem('oneday.accessToken'),
      r = await fetch(`${api}/api/v1/management/content`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'x-request-id': crypto.randomUUID(),
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
  if (state === 'loading') return <main className={styles.centered}>正在加载内容中心…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看内容中心</h1>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>内容中心暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 内容中心</p>
          <h1>让内容生产、审批与渠道连接保持可追溯</h1>
          <span>渠道分发只登记待授权请求；没有第三方授权时不会伪造发送结果。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      <section className={styles.create}>
        <label>
          文章标题
          <input
            aria-label="文章标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </label>
        <button onClick={() => void create()}>创建草稿</button>
        {note && <p role="status">{note}</p>}
      </section>
      <section className={styles.grid}>
        {items.length ? (
          items.map((x) => (
            <article key={x.id}>
              <span>{x.kind}</span>
              <strong>{x.title}</strong>
              <p>{x.status === 'approved' ? '已批准，可登记渠道待授权分发' : '草稿，等待审批'}</p>
              <small>
                {x.channels?.length ? `已登记：${x.channels.join('、')}` : '尚未登记分发渠道'}
              </small>
            </article>
          ))
        ) : (
          <section className={styles.empty}>暂无内容。创建草稿开始内容流程。</section>
        )}
      </section>
    </main>
  );
}
