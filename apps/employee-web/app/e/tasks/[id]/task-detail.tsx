'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AppStatePanel,
  Button,
  businessLabel,
  customerNameCopy,
  taskReasonCopy,
  taskTitleCopy,
} from '@oneday/ui';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import styles from './task-detail.module.css';

type Evidence = {
  id: string;
  evidence_type: string;
  original_filename: string;
  media_type: string;
  byte_size: number;
  created_at: string;
};
type Detail = {
  task: {
    id: string;
    title: string;
    reason: string | null;
    dueAt: string;
    status: string;
    escalationLevel: number;
    version: number;
  };
  customer: { id: string; displayName: string | null } | null;
  evidence: Evidence[];
  availableEvidence: Evidence[];
};
type State = 'loading' | 'ready' | 'forbidden' | 'error';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const when = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
const size = (value: number) => (value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`);
const fileBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== 'string' || !value.includes(','))
        return reject(Error('FILE_READ_FAILED'));
      resolve(value.slice(value.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });

type Bucket = { label: string; value: number };
const barWidth = (total: number, value: number) => (total ? `${(value / total) * 100}%` : '0%');
const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh'));
};
const mediaLabel = (media: string) =>
  ({ 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP' })[media] ?? (media || '未标注');
const escalationBucket = (level: number) =>
  level ? (level >= 3 ? '多次升级 3+' : '轻度升级 1-2') : '未升级';

function Bars({ items, total }: { items: Bucket[]; total: number }) {
  if (!items.length) return <p className={styles.barEmpty}>暂无记录</p>;
  return (
    <div className={styles.bars}>
      {items.map((item) => (
        <div className={styles.barRow} key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: barWidth(total, item.value) }} />
          </div>
          <span className={styles.barValue}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TaskDetail() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [state, setState] = useState<State>('loading');
  const [data, setData] = useState<Detail | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'link' | 'complete' | 'result' | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [resultFile, setResultFile] = useState<File | null>(null);
  const headers = (extra: Record<string, string> = {}) => ({
    'content-type': 'application/json',
    ...extra,
  });
  const load = useCallback(
    async (preserveMessage = false) => {
      if (!(await sessionApi.context()) || !id) {
        setState('forbidden');
        return;
      }
      setState('loading');
      if (!preserveMessage) setMessage('');
      try {
        const response = await sessionApi.request(`${api}/api/v1/employee/tasks/${id}`, {
          headers: headers(),
        });
        if ([401, 403, 404].includes(response.status)) {
          setState('forbidden');
          return;
        }
        if (!response.ok) throw Error('LOAD_FAILED');
        setData((await response.json()).data as Detail);
        setState('ready');
      } catch {
        setState('error');
      }
    },
    [id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const linkEvidence = async (evidenceId: string) => {
    if (!id) return;
    setBusy('link');
    setMessage('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/employee/tasks/${id}/evidence-links`,
        {
          method: 'POST',
          headers: headers({ 'idempotency-key': crypto.randomUUID() }),
          body: JSON.stringify({ evidenceId }),
        },
      );
      if (response.status === 409) throw Error('CONFLICT');
      if (!response.ok) throw Error('LINK_FAILED');
      setMessage('证据已关联到本任务，执行记录已同步。');
      await load(true);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'CONFLICT'
          ? '该证据已被关联，请刷新后查看。'
          : '证据关联未完成，请检查网络后重试。',
      );
    } finally {
      setBusy(null);
    }
  };
  const complete = async () => {
    if (!id || !data) return;
    setBusy('complete');
    setMessage('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/tasks/${id}/complete`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ version: data.task.version }),
      });
      if (response.status === 409) throw Error('CONFLICT');
      if (!response.ok) throw Error('COMPLETE_FAILED');
      const result = (await response.json()).data as { status: string; version: number };
      setData({ ...data, task: { ...data.task, status: result.status, version: result.version } });
      setMessage('任务已完成，操作记录已同步。');
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'CONFLICT'
          ? '任务已被更新，请刷新后再试。'
          : '任务未能完成，请检查网络后重试。',
      );
    } finally {
      setBusy(null);
    }
  };
  const recordResult = async () => {
    if (!id || !data?.customer || !orderNumber.trim() || !resultFile) {
      setMessage('请填写第三方结果单号并选择图片证据。');
      return;
    }
    setBusy('result');
    setMessage('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/employee/tasks/${id}/results`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': crypto.randomUUID() }),
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          occurredAt: new Date().toISOString(),
          evidenceType: 'photo',
          originalFilename: resultFile.name,
          mediaType: resultFile.type,
          contentBase64: await fileBase64(resultFile),
        }),
      });
      if (!response.ok) throw Error('RESULT_FAILED');
      setOrderNumber('');
      setResultFile(null);
      setMessage('结果与图片证据已关联到当前任务，执行记录已同步。');
      await load(true);
    } catch {
      setMessage('结果或证据未能保存，请检查图片格式、大小和网络后重试。');
    } finally {
      setBusy(null);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载任务详情"
          description="正在连接任务和证据记录。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无法查看此任务"
          description="请使用已授权的员工账号，且仅可查看分配给自己的任务。"
          action={
            <Button tone="secondary" onClick={() => (window.location.href = '/e/workbench')}>
              返回工作台
            </Button>
          }
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="任务详情暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  const done = data.task.status === 'completed';
  const typeDist = countBy(data.evidence.map((item) => businessLabel(item.evidence_type)));
  const mediaDist = countBy(data.evidence.map((item) => mediaLabel(item.media_type)));
  const sourceDist = [
    { label: '已关联', value: data.evidence.length },
    { label: '待关联', value: data.availableEvidence.length },
  ].filter((item) => item.value > 0);
  const escalationDist = [{ label: escalationBucket(data.task.escalationLevel), value: 1 }];
  return (
    <main className={styles.page} data-testid="employee-task-detail">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 任务详情</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新
        </button>
      </header>

      <section className={styles.heroCard} aria-label="任务详情概览">
        <h1>{taskTitleCopy(data.task.title)}</h1>
        <p>仅可查看分配给本人的任务；跟进门店服务痕迹，不含第三方订单履约。</p>
      </section>

      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}

      <section className={styles.panel} aria-label="任务详情概况">
        <div className={styles.summaryStrip}>
          <div>
            <span>任务状态</span>
            <strong>{done ? '已完成' : '待执行'}</strong>
          </div>
          <div>
            <span>已关联证据</span>
            <strong>{data.evidence.length}</strong>
          </div>
          <div>
            <span>待关联证据</span>
            <strong>{data.availableEvidence.length}</strong>
          </div>
          <div>
            <span>升级次数</span>
            <strong>{data.task.escalationLevel}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="任务详情分布">
        <div className={styles.panelHead}>
          <h2>任务详情分布</h2>
          <span className={styles.panelMeta}>由任务详情真实档案行推导</span>
        </div>
        <div className={styles.distribution}>
          <div className={styles.panelBlock}>
            <h3>证据类型分布</h3>
            <Bars items={typeDist} total={data.evidence.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>证据媒介分布</h3>
            <Bars items={mediaDist} total={data.evidence.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>证据来源分布</h3>
            <Bars items={sourceDist} total={data.evidence.length + data.availableEvidence.length} />
          </div>
          <div className={styles.panelBlock}>
            <h3>升级状态分布</h3>
            <Bars items={escalationDist} total={1} />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-label="任务信息">
        <div className={styles.sectionHead}>
          <h2>截止时间</h2>
          <span>{done ? '已完成' : '待执行'}</span>
        </div>
        <p className={styles.hero}>
          <strong>{when(data.task.dueAt)}</strong>
          <span>
            {data.task.escalationLevel
              ? `已升级 ${data.task.escalationLevel} 次`
              : '请在截止前完成并保留必要证据。'}
          </span>
        </p>
      </section>
      <section className={styles.section} aria-labelledby="reason-title">
        <h2 id="reason-title">任务原因</h2>
        <p className={styles.card}>{taskReasonCopy(data.task.reason)}</p>
      </section>
      <section className={styles.section} aria-labelledby="customer-title">
        <h2 id="customer-title">关联客户</h2>
        <div className={styles.customer}>
          <span>客户</span>
          {data.customer ? (
            <a href={`/e/customers/${data.customer.id}`}>
              <strong>{customerNameCopy(data.customer.displayName) ?? '关联客户'}</strong>
            </a>
          ) : (
            <strong>内部执行任务</strong>
          )}
          <p>{data.customer ? '证据仅限关联该客户的已持久化记录。' : '该任务未关联客户。'}</p>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="evidence-title">
        <div className={styles.sectionHead}>
          <h2 id="evidence-title">任务证据</h2>
          <span>{data.evidence.length} 项已关联</span>
        </div>
        {data.evidence.length ? (
          data.evidence.map((item) => <EvidenceRow item={item} key={item.id} />)
        ) : (
          <p className={styles.empty}>尚未关联证据；如需要，请从当前客户的可用证据中添加。</p>
        )}
        {data.availableEvidence.length > 0 && !done && (
          <div className={styles.available}>
            <h3>可用客户证据</h3>
            {data.availableEvidence.map((item) => (
              <div className={styles.availableRow} key={item.id}>
                <EvidenceLabel item={item} />
                <Button
                  tone="secondary"
                  disabled={busy !== null}
                  loading={busy === 'link'}
                  onClick={() => void linkEvidence(item.id)}
                >
                  关联
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
      {!done && data.customer && (
        <section className={styles.section} aria-labelledby="result-title">
          <h2 id="result-title">记录结果并上传证据</h2>
          <p className={styles.card}>仅可为分配给本人的当前任务记录关联客户的真实结果。</p>
          <div className={styles.resultForm}>
            <label>
              第三方结果单号
              <input
                aria-label="第三方结果单号"
                value={orderNumber}
                maxLength={120}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="美团/抖音等平台单号（可选留痕）"
              />
            </label>
            <label>
              图片证据
              <input
                aria-label="图片证据"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setResultFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              disabled={busy !== null}
              loading={busy === 'result'}
              onClick={() => void recordResult()}
            >
              保存结果与证据
            </Button>
          </div>
        </section>
      )}
      <p className={styles.honest} role="note">
        以上分布全部由已抓取任务详情档案行现场推导(source=local)：状态/升级/证据类型/证据媒介/证据来源均由真实
        tasks 与 evidence
        行统计。推广员工具任务详情跟进门店服务痕迹，不含第三方订单履约，不代履约美团/抖音订单，非本平台下单。
      </p>
      <footer className={styles.footer}>
        <a href="/e/workbench">返回工作台</a>
        <a href={`/e/tasks/${data.task.id}/follow-up`}>记录跟进</a>
        <Button
          className={styles.complete}
          disabled={busy !== null || done}
          loading={busy === 'complete'}
          onClick={() => void complete()}
        >
          {done ? '任务已完成' : '完成任务'}
        </Button>
      </footer>
    </main>
  );
}

function EvidenceLabel({ item }: { item: Evidence }) {
  return (
    <span>
      <strong>{item.original_filename}</strong>
      <small>
        {businessLabel(item.evidence_type)} · {item.media_type} · {size(item.byte_size)}
      </small>
    </span>
  );
}
function EvidenceRow({ item }: { item: Evidence }) {
  return (
    <div className={styles.evidence}>
      <EvidenceLabel item={item} />
      <time>{when(item.created_at)}</time>
    </div>
  );
}
