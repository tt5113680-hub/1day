'use client';

import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  Button,
  Card,
  StatusBadge,
  businessLabel,
} from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type ActionType = 'link' | 'mini_program' | 'platform_entry';
type Action = {
  id: string;
  code: string;
  name: string;
  action_type: ActionType;
  target_url: string | null;
  mini_program_app_id: string | null;
  mini_program_path: string | null;
  platform: string | null;
  status: string;
  version: number;
};
type Draft = {
  code: string;
  name: string;
  actionType: ActionType;
  targetUrl: string;
  miniProgramAppId: string;
  miniProgramPath: string;
  platform: string;
};
type EditDraft = {
  name: string;
  targetUrl: string;
  miniProgramAppId: string;
  miniProgramPath: string;
  platform: string;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const blank = (): Draft => ({
  code: '',
  name: '',
  actionType: 'link',
  targetUrl: 'https://',
  miniProgramAppId: '',
  miniProgramPath: '/',
  platform: '',
});
const editFrom = (action: Action): EditDraft => ({
  name: action.name,
  targetUrl: action.target_url ?? 'https://',
  miniProgramAppId: action.mini_program_app_id ?? '',
  miniProgramPath: action.mini_program_path ?? '/',
  platform: action.platform ?? '',
});

export default function ExternalActionsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [actions, setActions] = useState<Action[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/external-actions`, { headers: {} });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error('LOAD');
      setActions((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    setNotice('');
    try {
      const body: Record<string, unknown> = {
        code: draft.code.trim(),
        name: draft.name.trim(),
        actionType: draft.actionType,
      };
      if (draft.platform.trim()) body.platform = draft.platform.trim();
      if (draft.actionType === 'link') body.targetUrl = draft.targetUrl.trim();
      if (draft.actionType === 'mini_program') {
        body.miniProgramAppId = draft.miniProgramAppId.trim();
        body.miniProgramPath = draft.miniProgramPath.trim();
      }
      if (draft.actionType === 'platform_entry' && !draft.platform.trim()) {
        setNotice('平台入口类型必须填写平台标识；这不会发起真实第三方投放。');
        return;
      }
      const response = await sessionApi.request(`${api}/api/v1/external-actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw Error('CREATE');
      setDraft(blank());
      setNotice('外链动作已写入租户目录；门店绑定仍在「门店与外链」完成。');
      await load();
    } catch {
      setNotice('创建失败；请检查编码唯一性、HTTPS 链接或必填字段。');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (action: Action) => {
    setEditingId(action.id);
    setEditDraft(editFrom(action));
    setNotice('');
  };

  const saveEdit = async (action: Action) => {
    if (!editDraft) return;
    setBusy(true);
    setNotice('');
    try {
      const body: Record<string, unknown> = {
        name: editDraft.name.trim(),
        version: action.version,
      };
      if (editDraft.platform.trim()) body.platform = editDraft.platform.trim();
      if (action.action_type === 'link') body.targetUrl = editDraft.targetUrl.trim();
      if (action.action_type === 'mini_program') {
        body.miniProgramAppId = editDraft.miniProgramAppId.trim();
        body.miniProgramPath = editDraft.miniProgramPath.trim();
      }
      if (action.action_type === 'platform_entry' && !editDraft.platform.trim()) {
        setNotice('平台入口类型必须填写平台标识。');
        return;
      }
      const response = await sessionApi.request(`${api}/api/v1/external-actions/${action.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw Error('UPDATE');
      setEditingId(null);
      setEditDraft(null);
      setNotice('外链动作已更新；编码与类型保持不变。');
      await load();
    } catch {
      setNotice('更新失败；可能是版本冲突或字段校验未通过，请刷新后重试。');
    } finally {
      setBusy(false);
    }
  };

  const archive = async (action: Action) => {
    setBusy(true);
    setNotice('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/external-actions/${action.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: action.version }),
      });
      if (!response.ok) throw Error('ARCHIVE');
      if (editingId === action.id) {
        setEditingId(null);
        setEditDraft(null);
      }
      setNotice('外链动作已归档（软删除）；原编码可重新创建。门店绑定页需另行停用引用。');
      await load();
    } catch {
      setNotice('归档失败；可能是版本冲突，请刷新后重试。');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载外链动作目录"
          description="读取租户级 external-actions 定义。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权管理外链动作"
          description="需要推广员工具授权或 action.read / action.manage 权限。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="外链动作目录暂不可用"
          description="未能加载租户级动作定义。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 外链服务"
        title="先定义动作，再绑定到门店"
        description="这里维护租户级 external-actions（链接 / 小程序 / 平台入口意图）。支持更新与归档；不会伪造美团或抖音投放；门店启用仍走「门店与外链」。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新目录
          </Button>
        }
      />
      <Card className={styles.form}>
        <div data-testid="external-action-create">
          <div>
            <h2>新建外链动作</h2>
            <p>写入 `POST /api/v1/external-actions`；创建后可在门店外链与 Offer 中引用。</p>
          </div>
          <div className={styles.fields}>
            <label>
              编码
              <input
                aria-label="动作编码"
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                placeholder="如 store-consult"
              />
            </label>
            <label>
              名称
              <input
                aria-label="动作名称"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="到店咨询"
              />
            </label>
            <label>
              类型
              <select
                aria-label="动作类型"
                value={draft.actionType}
                onChange={(event) =>
                  setDraft({ ...draft, actionType: event.target.value as ActionType })
                }
              >
                <option value="link">链接 hand-off</option>
                <option value="mini_program">小程序入口</option>
                <option value="platform_entry">平台入口意图</option>
              </select>
            </label>
            <label>
              平台标识（可选；平台入口必填）
              <input
                aria-label="平台标识"
                value={draft.platform}
                onChange={(event) => setDraft({ ...draft, platform: event.target.value })}
                placeholder="meituan / douyin / wechat"
              />
            </label>
            {draft.actionType === 'link' ? (
              <label className={styles.wide}>
                目标 URL（http/https）
                <input
                  aria-label="目标 URL"
                  value={draft.targetUrl}
                  onChange={(event) => setDraft({ ...draft, targetUrl: event.target.value })}
                />
              </label>
            ) : null}
            {draft.actionType === 'mini_program' ? (
              <>
                <label>
                  小程序 AppId
                  <input
                    aria-label="小程序 AppId"
                    value={draft.miniProgramAppId}
                    onChange={(event) =>
                      setDraft({ ...draft, miniProgramAppId: event.target.value })
                    }
                  />
                </label>
                <label>
                  小程序 Path
                  <input
                    aria-label="小程序 Path"
                    value={draft.miniProgramPath}
                    onChange={(event) =>
                      setDraft({ ...draft, miniProgramPath: event.target.value })
                    }
                  />
                </label>
              </>
            ) : null}
          </div>
          <Button
            disabled={busy || !draft.code.trim() || !draft.name.trim()}
            loading={busy}
            onClick={() => void create()}
          >
            创建外链动作
          </Button>
          {notice ? (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          ) : null}
        </div>
      </Card>
      <section className={styles.grid} aria-label="外链动作列表" data-testid="external-actions-catalog">
        {actions.length === 0 ? (
          <Card className={styles.empty}>
            <h2>目录为空</h2>
            <p>创建第一条租户级动作后，再在门店页完成启用与排序。</p>
          </Card>
        ) : (
          actions.map((action) => {
            const editing = editingId === action.id && editDraft;
            return (
              <div key={action.id} data-testid={`external-action-card-${action.id}`}>
              <Card className={styles.card}>
                <div className={styles.title}>
                  <strong>{action.name}</strong>
                  <StatusBadge tone="success">{businessLabel(action.status)}</StatusBadge>
                </div>
                <p>
                  {action.code} · {businessLabel(action.action_type)}
                  {action.platform ? ` · ${action.platform}` : ''}
                </p>
                {action.target_url ? <small>{action.target_url}</small> : null}
                {action.mini_program_app_id ? (
                  <small>
                    {action.mini_program_app_id}
                    {action.mini_program_path}
                  </small>
                ) : null}
                {editing ? (
                  <div className={styles.editPanel} data-testid="external-action-edit">
                    <div className={styles.fields}>
                      <label className={styles.wide}>
                        名称
                        <input
                          aria-label="编辑动作名称"
                          value={editDraft.name}
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, name: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        平台标识
                        <input
                          aria-label="编辑平台标识"
                          value={editDraft.platform}
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, platform: event.target.value })
                          }
                        />
                      </label>
                      {action.action_type === 'link' ? (
                        <label className={styles.wide}>
                          目标 URL
                          <input
                            aria-label="编辑目标 URL"
                            value={editDraft.targetUrl}
                            onChange={(event) =>
                              setEditDraft({ ...editDraft, targetUrl: event.target.value })
                            }
                          />
                        </label>
                      ) : null}
                      {action.action_type === 'mini_program' ? (
                        <>
                          <label>
                            小程序 AppId
                            <input
                              aria-label="编辑小程序 AppId"
                              value={editDraft.miniProgramAppId}
                              onChange={(event) =>
                                setEditDraft({
                                  ...editDraft,
                                  miniProgramAppId: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            小程序 Path
                            <input
                              aria-label="编辑小程序 Path"
                              value={editDraft.miniProgramPath}
                              onChange={(event) =>
                                setEditDraft({
                                  ...editDraft,
                                  miniProgramPath: event.target.value,
                                })
                              }
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                    <div className={styles.cardActions}>
                      <Button
                        disabled={busy || !editDraft.name.trim()}
                        loading={busy}
                        onClick={() => void saveEdit(action)}
                      >
                        保存更新
                      </Button>
                      <Button
                        tone="secondary"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft(null);
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardActions}>
                    <Button
                      tone="secondary"
                      disabled={busy}
                      data-testid={`external-action-edit-btn-${action.id}`}
                      onClick={() => startEdit(action)}
                    >
                      编辑
                    </Button>
                    <Button
                      tone="secondary"
                      disabled={busy}
                      data-testid={`external-action-archive-btn-${action.id}`}
                      onClick={() => void archive(action)}
                    >
                      归档
                    </Button>
                  </div>
                )}
              </Card>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
