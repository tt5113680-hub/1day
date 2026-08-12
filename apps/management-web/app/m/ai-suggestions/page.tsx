'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge, businessLabel } from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

const statusLabels: Record<string, string> = {
  pending: '待处理',
  accepted: '已采纳',
  feedback: '已反馈',
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
const barWidth = (total: number, value: number) =>
  total ? `${Math.max(2, (value / total) * 100)}%` : '0%';
const countBy = <T,>(rows: T[], key: (row: T) => string) => {
  const acc: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return Object.entries(acc)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};
const renderBars = (
  items: { label: string; value: number }[],
  total: number,
  empty = <p className={styles.barEmpty}>暂无记录</p>,
) =>
  items.length ? (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li className={styles.barRow} key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </span>
          <span className={styles.barValue}>{item.value}</span>
        </li>
      ))}
    </ul>
  ) : (
    empty
  );

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

  const statusDist = useMemo(
    () => countBy(items, (s) => statusLabels[s.status] ?? businessLabel(s.status)),
    [items],
  );
  const actionDist = useMemo(() => countBy(items, (s) => businessLabel(s.action_type)), [items]);
  const modelDist = useMemo(() => countBy(items, (s) => s.model_name), [items]);
  const execDist = useMemo(() => countBy(items, (s) => businessLabel(s.execution_status)), [items]);
  const pendingCount = items.filter((s) => s.status === 'pending').length;
  const acceptedCount = items.filter((s) => s.status === 'accepted').length;
  const manualRequiredCount = items.filter((s) => s.execution_status === 'manual_required').length;

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
          description="正在校验建议来源、执行状态与工具授权。"
        />
      </main>
    );
  if (state === 'forbidden') {
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看 AI 建议"
          description="请使用具备推广员工具权限的账号。"
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
    <main className={styles.page} data-testid="management-ai-suggestions">
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 作业建议</span>
        <button type="button" className={styles.topBarRefresh} onClick={() => void load()}>
          刷新建议
        </button>
      </div>
      <section className={styles.heroCard} aria-label="作业建议概况">
        <h1>把入口痕迹解读成可确认的下一步</h1>
        <p>
          每条建议保留影响、动作类型、模型名称与版本。只有白名单内的租户本地动作可以执行，其余仍需人工确认。
        </p>
      </section>
      <section className={styles.panel}>
        <div className={styles.summaryStrip} aria-label="作业建议概况">
          <div>
            <span>建议</span>
            <strong>{items.length}</strong>
          </div>
          <div>
            <span>待处理</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>已采纳</span>
            <strong>{acceptedCount}</strong>
          </div>
          <div>
            <span>待人工执行</span>
            <strong>{manualRequiredCount}</strong>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>作业建议分布</h2>
          <span className={styles.panelMeta}>由当前租户建议档案行现场推导</span>
        </div>
        <div className={styles.distribution} aria-label="作业建议分布">
          <div className={styles.panelBlock}>
            <h3>处理状态分布</h3>
            {renderBars(statusDist, items.length)}
          </div>
          <div className={styles.panelBlock}>
            <h3>动作类型分布</h3>
            {renderBars(actionDist, items.length)}
          </div>
          <div className={styles.panelBlock}>
            <h3>建议来源模型分布</h3>
            {renderBars(modelDist, items.length)}
          </div>
          <div className={styles.panelBlock}>
            <h3>执行状态分布</h3>
            {renderBars(execDist, items.length)}
          </div>
        </div>
        <p className={styles.honest}>
          来源 source=local：分布全部由已抓取建议档案行现场推导，AI
          仅解读既有入口痕迹，不编造成交、不接第三方实时投放、只记录本地建议与执行意图，不包含本平台收款，非本平台下单。
        </p>
      </section>
      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <section className={styles.grid}>
        {items.length ? (
          items.map((item) => (
            <article className={styles.card} key={item.id}>
              <div className={styles.cardBody}>
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
              </div>
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            <AppStatePanel
              kind="empty"
              title="暂无建议"
              description="当入口异常或可优化信号进入系统后，建议会在此处出现。"
            />
          </div>
        )}
      </section>
    </main>
  );
}
