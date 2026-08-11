'use client';
import { SessionApiClient } from '@oneday/session-client';
import { useTenantSync } from '@oneday/sync-client';
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
  placements: {
    storeId: string;
    storeName: string;
    rank: number;
    status: string;
    version: number;
  }[];
};
type Store = { id: string; name: string; status: string };
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
export default function ContentPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [items, setItems] = useState<Item[]>([]),
    [stores, setStores] = useState<Store[]>([]),
    [title, setTitle] = useState(''),
    [placement, setPlacement] = useState<Record<string, { storeId: string; rank: number }>>({}),
    [channelDraft, setChannelDraft] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState<string | null>(null),
    [note, setNote] = useState('');
  const load = useCallback(async (mode: 'full' | 'quiet' = 'full') => {
    if (!(await sessionApi.context())) return setState('forbidden');
    if (mode === 'full') setState('loading');
    try {
      const [r, storesResponse] = await Promise.all([
        sessionApi.request(`${api}/api/v1/management/content`, { headers: {} }),
        sessionApi.request(`${api}/api/v1/management/stores`),
      ]);
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      setItems((await r.json()).data);
      if (storesResponse.ok)
        setStores(
          ((await storesResponse.json()).data as Store[]).filter(
            (store) => store.status === 'active',
          ),
        );
      setState('ready');
    } catch {
      if (mode === 'full') setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  useTenantSync(api, sessionApi, ['content'], () => void load('quiet'), state === 'ready');
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
  const approve = async (item: Item) => {
    setBusy(`approve-${item.id}`);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/content/${item.id}/approve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: item.version }),
        },
      );
      if (!response.ok) throw new Error('APPROVE');
      setNote('内容已审批，可以登记渠道并投放到消费者门店。');
      await load();
    } catch {
      setNote('内容审批未完成，请刷新后检查版本和权限。');
    } finally {
      setBusy(null);
    }
  };
  const place = async (item: Item) => {
    const draft = placement[item.id];
    if (!draft?.storeId) return setNote('请选择要展示这条内容的门店。');
    setBusy(`place-${item.id}`);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/content/${item.id}/placements`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(draft),
        },
      );
      if (!response.ok) throw new Error('PLACE');
      setNote('消费者门店内容已更新，刷新门店详情即可看到最新投放。');
      await load();
    } catch {
      setNote('内容投放未完成，请检查门店状态后重试。');
    } finally {
      setBusy(null);
    }
  };
  const distribute = async (item: Item) => {
    const channel = channelDraft[item.id];
    if (!channel) return setNote('请选择要登记的外部渠道。');
    setBusy(`distribute-${item.id}`);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/content/${item.id}/distributions`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: item.version, channel }),
        },
      );
      if (!response.ok) throw new Error('DISTRIBUTE');
      setNote('已登记渠道待授权分发；未获第三方授权前不会伪造发送结果。');
      setChannelDraft((value) => ({ ...value, [item.id]: '' }));
      await load();
    } catch {
      setNote('渠道分发登记未完成，请确认内容已审批且具备内容管理权限。');
    } finally {
      setBusy(null);
    }
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
        eyebrow="推广员工具 · 营销内容"
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
                {x.placements?.length > 0 && (
                  <small>
                    门店投放：
                    {x.placements
                      .map((item) => `${item.storeName}（排序 ${item.rank}）`)
                      .join('、')}
                  </small>
                )}
                <small className={styles.convergence}>
                  {x.status === 'approved'
                    ? x.placements?.length
                      ? '已生效：消费者门店已读取该条内容'
                      : '已审批但尚未投放：消费者尚不可见'
                    : '尚未发布：消费者不可见'}
                </small>
                {x.status === 'draft' ? (
                  <Button disabled={busy === `approve-${x.id}`} onClick={() => void approve(x)}>
                    审批并允许投放
                  </Button>
                ) : (
                  <div className={styles.placement}>
                    <label>
                      外部渠道待授权分发
                      <select
                        aria-label={`${x.title} 分发渠道`}
                        value={channelDraft[x.id] ?? ''}
                        onChange={(event) =>
                          setChannelDraft((value) => ({
                            ...value,
                            [x.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">选择渠道</option>
                        <option value="wechat">微信</option>
                        <option value="douyin">抖音</option>
                        <option value="meituan">美团</option>
                        <option value="internal">内部渠道</option>
                      </select>
                    </label>
                    <Button
                      tone="secondary"
                      disabled={busy === `distribute-${x.id}`}
                      onClick={() => void distribute(x)}
                    >
                      登记待授权分发
                    </Button>
                    <label>
                      消费者展示门店
                      <select
                        aria-label={`${x.title} 展示门店`}
                        value={placement[x.id]?.storeId ?? ''}
                        onChange={(event) =>
                          setPlacement((value) => ({
                            ...value,
                            [x.id]: { storeId: event.target.value, rank: value[x.id]?.rank ?? 0 },
                          }))
                        }
                      >
                        <option value="">选择门店</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      展示排序
                      <input
                        aria-label={`${x.title} 展示排序`}
                        type="number"
                        value={placement[x.id]?.rank ?? 0}
                        onChange={(event) =>
                          setPlacement((value) => ({
                            ...value,
                            [x.id]: {
                              storeId: value[x.id]?.storeId ?? '',
                              rank: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </label>
                    <Button disabled={busy === `place-${x.id}`} onClick={() => void place(x)}>
                      投放到消费者门店
                    </Button>
                  </div>
                )}
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
