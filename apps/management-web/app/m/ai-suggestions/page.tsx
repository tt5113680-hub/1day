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

type Suggestion = {
  id: string;
  title: string;
  reason: string;
  impact: string;
  action_type: string;
  model_name: string;
  model_version: string;
  status: string;
  feedback: string | null;
  execution_status: string;
  execution_result: Record<string, unknown>;
  executed_at: string | null;
  version: number;
};

const executionCopy = (item: Suggestion) => {
  const command = item.execution_result?.command;
  if (item.execution_status === 'executed' && command === 'create_task') {
    return '已创建跟进任务，可在运营流程中继续查看。';
  }
  if (item.execution_status === 'manual_required')
    return '尚未执行，需要人工进入现有业务入口处理。';
  return `执行状态：${businessLabel(item.execution_status)}`;
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function AiSuggestions() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/ai-suggestions`, {
        headers: {},
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw new Error('REQUEST_FAILED');
      setItems((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => void load(), [load]);

  const update = async (item: Suggestion, mode: 'accept' | 'feedback') => {
    const feedbackValue = feedback[item.id]?.trim() ?? '';
    if (mode === 'feedback' && !feedbackValue) {
      setFieldError((errors) => ({ ...errors, [item.id]: '请输入反馈后再提交。' }));
      return;
    }
    setFieldError((errors) => ({ ...errors, [item.id]: '' }));
    const response = await sessionApi.request(
      `${api}/api/v1/management/ai-suggestions/${item.id}/${mode}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          version: item.version,
          ...(mode === 'feedback' ? { feedback: feedbackValue } : {}),
        }),
      },
    );
    if (!response.ok) {
      setNote('操作未完成，请刷新后重试。');
      return;
    }
    const updated = (await response.json()) as { data: Suggestion };
    setNote(mode === 'accept' ? executionCopy(updated.data) : '反馈已记录，用于后续建议评估。');
    setFeedback((values) => ({ ...values, [item.id]: '' }));
    await load();
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载可执行建议"
          description="正在校验建议来源、执行状态与经营权限。"
        />
      </main>
    );
  if (state === 'forbidden') {
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看 AI 建议"
          description="请使用具备经营管理权限的账号。"
        />
      </main>
    );
  }
  if (state === 'error') {
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="AI 建议暂不可用"
          description="建议数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  }
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="推广员工具 · 作业建议"
        title="把入口痕迹解读成可确认的下一步"
        description="每条建议保留影响、动作类型、模型名称与版本。只有白名单内的租户本地动作可以执行，其余仍需人工确认。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新建议
          </Button>
        }
      />
      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <section className={styles.grid}>
        {items.length ? (
          items.map((item) => (
            <article className={styles.card} key={item.id}>
              <Card className={styles.cardBody}>
                <div className={styles.top}>
                  <StatusBadge tone={item.status === 'accepted' ? 'success' : 'info'}>
                    {businessLabel(item.status)}
                  </StatusBadge>
                  <small>
                    建议来源：{item.model_name} · {item.model_version}
                  </small>
                </div>
                <h2>{item.title}</h2>
                <p>{item.reason}</p>
                <dl>
                  <div>
                    <dt>预期影响</dt>
                    <dd>{item.impact}</dd>
                  </div>
                  <div>
                    <dt>建议动作</dt>
                    <dd>{businessLabel(item.action_type)}</dd>
                  </div>
                </dl>
                {item.status === 'accepted' && (
                  <p data-testid="ai-execution-status">{executionCopy(item)}</p>
                )}
                {item.feedback && <p className={styles.feedback}>反馈：{item.feedback}</p>}
                <div className={styles.feedbackForm}>
                  <label htmlFor={`feedback-${item.id}`}>反馈</label>
                  <input
                    id={`feedback-${item.id}`}
                    aria-invalid={Boolean(fieldError[item.id])}
                    aria-describedby={fieldError[item.id] ? `feedback-error-${item.id}` : undefined}
                    value={feedback[item.id] ?? ''}
                    maxLength={500}
                    onChange={(event) =>
                      setFeedback((values) => ({ ...values, [item.id]: event.target.value }))
                    }
                    placeholder="输入采纳后的观察或未采纳原因"
                  />
                  {fieldError[item.id] && (
                    <p id={`feedback-error-${item.id}`} className={styles.fieldError}>
                      {fieldError[item.id]}
                    </p>
                  )}
                </div>
                <footer>
                  <Button
                    disabled={item.status !== 'pending'}
                    onClick={() => void update(item, 'accept')}
                  >
                    采纳建议
                  </Button>
                  <Button tone="secondary" onClick={() => void update(item, 'feedback')}>
                    记录反馈
                  </Button>
                </footer>
              </Card>
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            <AppStatePanel
              kind="empty"
              title="暂无建议"
              description="当经营异常或可优化信号进入系统后，建议会在此处出现。"
            />
          </div>
        )}
      </section>
    </main>
  );
}
