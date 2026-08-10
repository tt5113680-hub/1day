'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  businessLabel,
  Button,
  Card,
  MetricCard,
  StatusBadge,
} from '@oneday/ui';
import {
  buildConditionBranchFlow,
  collectConditionKeys,
  previewConditionPath,
  reorderSteps,
  serializeConditionBranchFlow,
  summarizeCondition,
} from '@oneday/workflows';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type Employee = { id: string; display_name: string; employee_code: string; status: string };
type StepDraft = {
  name: string;
  type: 'task' | 'approval';
  assigneeEmployeeId: string;
  timeoutMinutes: number;
  conditionKey: string;
  conditionEquals: '' | 'true' | 'false';
};
type VersionRow = { id: string; sequence: number; status: string; version: number };
type VersionStep = {
  id?: string;
  name: string;
  type: string;
  assigneeEmployeeId: string;
  timeoutMinutes: number;
  condition?: Record<string, unknown> | null;
};
type VersionPanel = {
  templateId: string;
  templateName: string;
  definitionVersion: number;
  publishedVersionId: string | null;
  versions: VersionRow[];
  selectedVersionId: string | null;
  steps: VersionStep[];
  loading: boolean;
};
type Data = {
  templates: {
    id: string;
    name: string;
    code: string;
    published_version_id: string | null;
    active_instances: number;
    timed_out_instances: number;
  }[];
  instances: {
    id: string;
    status: string;
    definition_name: string;
    step_name: string | null;
    step_type: string | null;
    assignee_name: string;
    due_at: string | null;
  }[];
  approvals: {
    id: string;
    workflow_instance_id: string;
    name: string;
    definition_name: string;
    assignee_name: string;
    due_at: string;
    instance_version: number;
  }[];
};
const conditionKeyOf = (condition?: Record<string, unknown> | null) =>
  typeof condition?.key === 'string' ? condition.key : '';
const conditionEqualsOf = (condition?: Record<string, unknown> | null) => {
  if (!condition || !('equals' in condition)) return '';
  if (condition.equals === true) return 'true';
  if (condition.equals === false) return 'false';
  return String(condition.equals ?? '');
};
const draftCondition = (step: StepDraft) => {
  if (!step.conditionKey.trim() || !step.conditionEquals) return undefined;
  return {
    key: step.conditionKey.trim(),
    equals: step.conditionEquals === 'true',
  };
};
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const emptyStep = (assigneeEmployeeId = ''): StepDraft => ({
  name: '',
  type: 'approval',
  assigneeEmployeeId,
  timeoutMinutes: 60,
  conditionKey: '',
  conditionEquals: '',
});

export default function WorkflowsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [flowJsonCopied, setFlowJsonCopied] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([emptyStep()]);
  const [versionPanel, setVersionPanel] = useState<VersionPanel | null>(null);
  const [pathPreviewContext, setPathPreviewContext] = useState<Record<string, boolean>>({});
  const [draftPathContext, setDraftPathContext] = useState<Record<string, boolean>>({});
  const pathPreview = useMemo(() => {
    if (!versionPanel?.steps.length) return null;
    const keys = collectConditionKeys(versionPanel.steps);
    const context: Record<string, unknown> = {};
    for (const key of keys) {
      context[key] = pathPreviewContext[key] ?? true;
    }
    return {
      keys,
      context,
      path: previewConditionPath(versionPanel.steps, context),
    };
  }, [versionPanel?.steps, pathPreviewContext]);
  const draftStepsForPreview = useMemo(
    () =>
      steps.map((step) => ({
        name: step.name.trim() || '未命名步骤',
        type: step.type,
        timeoutMinutes: step.timeoutMinutes,
        condition: draftCondition(step) ?? null,
      })),
    [steps],
  );
  const draftPreview = useMemo(() => {
    if (!draftStepsForPreview.length) return null;
    const keys = collectConditionKeys(draftStepsForPreview);
    const context: Record<string, unknown> = {};
    for (const key of keys) {
      context[key] = draftPathContext[key] ?? true;
    }
    return {
      keys,
      context,
      flow: buildConditionBranchFlow(draftStepsForPreview),
      path: previewConditionPath(draftStepsForPreview, context),
    };
  }, [draftStepsForPreview, draftPathContext]);
  const load = useCallback(
    async (status = filter) => {
      if (!(await sessionApi.context())) return setState('forbidden');
      setState('loading');
      try {
        const [response, orgResponse] = await Promise.all([
          sessionApi.request(
            `${api}/api/v1/management/workflows${status ? `?status=${status}` : ''}`,
            { headers: {} },
          ),
          sessionApi.request(`${api}/api/v1/management/organization-employees`, { headers: {} }),
        ]);
        if ([401, 403].includes(response.status)) return setState('forbidden');
        if (!response.ok) throw Error('LOAD');
        setData((await response.json()).data);
        if (orgResponse.ok) {
          const orgData = (await orgResponse.json()).data as { employees: Employee[] };
          const active = orgData.employees.filter((employee) => employee.status === 'active');
          setEmployees(active);
          setSteps((current) =>
            current.map((step) =>
              step.assigneeEmployeeId
                ? step
                : { ...step, assigneeEmployeeId: active[0]?.id ?? '' },
            ),
          );
        }
        setState('ready');
      } catch {
        setState('error');
      }
    },
    [filter],
  );
  useEffect(() => void load(), [load]);
  const createAndPublish = async () => {
    if (!code.trim() || !name.trim()) {
      setNote('请填写流程编码与名称。');
      return;
    }
    if (
      steps.some(
        (step) => !step.name.trim() || !step.assigneeEmployeeId || step.timeoutMinutes < 1,
      )
    ) {
      setNote('每个步骤都需要名称、责任人和超时分钟数。');
      return;
    }
    setBusy('create');
    setNote('');
    try {
      const create = await sessionApi.request(`${api}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          code,
          name,
          steps: steps.map((step) => ({
            name: step.name,
            type: step.type,
            assigneeEmployeeId: step.assigneeEmployeeId,
            timeoutMinutes: step.timeoutMinutes,
            ...(draftCondition(step) ? { condition: draftCondition(step) } : {}),
          })),
        }),
      });
      if (!create.ok) throw new Error('CREATE');
      const definition = (await create.json()).data as {
        id: string;
        draftVersionId: string;
        version: number;
      };
      const publish = await sessionApi.request(`${api}/api/v1/workflows/${definition.id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          versionId: definition.draftVersionId,
          definitionVersion: definition.version,
        }),
      });
      if (!publish.ok) throw new Error('PUBLISH');
      setCode('');
      setName('');
      setSteps([emptyStep(employees[0]?.id ?? '')]);
      setNote(`流程「${name}」已创建并发布，可启动实例。`);
      await load();
    } catch {
      setNote('流程未创建或未发布，请确认具备流程管理权限与步骤责任人。');
    } finally {
      setBusy(null);
    }
  };
  const startInstance = async (template: Data['templates'][number]) => {
    if (!template.published_version_id) {
      setNote('该模板尚未发布，无法启动实例。');
      return;
    }
    setBusy(`start-${template.id}`);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/workflows/${template.id}/instances`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': crypto.randomUUID(),
          },
          body: JSON.stringify({ context: {} }),
        },
      );
      if (!response.ok) throw new Error('START');
      setNote(`已启动流程「${template.name}」。`);
      await load();
    } catch {
      setNote('流程实例未启动，请确认具备流程管理权限且模板已发布。');
    } finally {
      setBusy(null);
    }
  };
  const loadVersionSteps = async (templateId: string, versionId: string) => {
    const versionResponse = await sessionApi.request(
      `${api}/api/v1/workflows/${templateId}/versions/${versionId}`,
      { headers: {} },
    );
    if (!versionResponse.ok) throw new Error('VERSION');
    const versionDetail = (await versionResponse.json()).data as {
      steps: VersionStep[];
      definitionVersion: number;
      publishedVersionId: string | null;
    };
    return versionDetail;
  };
  const openVersionPanel = async (
    template: Data['templates'][number],
    options?: { preserveNote?: boolean },
  ) => {
    setBusy(`panel-${template.id}`);
    if (!options?.preserveNote) setNote('');
    try {
      const detailResponse = await sessionApi.request(`${api}/api/v1/workflows/${template.id}`, {
        headers: {},
      });
      if (!detailResponse.ok) throw new Error('DETAIL');
      const detail = (await detailResponse.json()).data as {
        definition: { version: number; published_version_id: string | null };
        versions: VersionRow[];
      };
      const selectedVersionId =
        detail.definition.published_version_id ?? detail.versions.at(-1)?.id ?? null;
      let steps: VersionStep[] = [];
      let definitionVersion = detail.definition.version;
      let publishedVersionId = detail.definition.published_version_id;
      if (selectedVersionId) {
        const versionDetail = await loadVersionSteps(template.id, selectedVersionId);
        steps = versionDetail.steps;
        definitionVersion = versionDetail.definitionVersion;
        publishedVersionId = versionDetail.publishedVersionId;
      }
      setVersionPanel({
        templateId: template.id,
        templateName: template.name,
        definitionVersion,
        publishedVersionId,
        versions: detail.versions,
        selectedVersionId,
        steps,
        loading: false,
      });
    } catch {
      setNote('无法加载版本面板，请确认流程管理权限。');
      setVersionPanel(null);
    } finally {
      setBusy(null);
    }
  };
  const selectVersion = async (versionId: string) => {
    if (!versionPanel) return;
    const templateId = versionPanel.templateId;
    setVersionPanel((current) =>
      current ? { ...current, loading: true, selectedVersionId: versionId } : current,
    );
    try {
      const versionDetail = await loadVersionSteps(templateId, versionId);
      setVersionPanel((current) =>
        current
          ? {
              ...current,
              selectedVersionId: versionId,
              steps: versionDetail.steps,
              definitionVersion: versionDetail.definitionVersion,
              publishedVersionId: versionDetail.publishedVersionId,
              loading: false,
            }
          : current,
      );
    } catch {
      setNote('无法读取该版本步骤。');
      setVersionPanel((current) => (current ? { ...current, loading: false } : current));
    }
  };
  const updatePanelStepCondition = (
    index: number,
    patch: { key?: string; equals?: string },
  ) => {
    setVersionPanel((current) => {
      if (!current) return current;
      const steps = current.steps.map((step, i) => {
        if (i !== index) return step;
        const key = patch.key ?? conditionKeyOf(step.condition);
        const equalsRaw = patch.equals ?? conditionEqualsOf(step.condition);
        if (!key.trim() || !equalsRaw) {
          return { ...step, condition: null };
        }
        const equals = equalsRaw === 'true' ? true : equalsRaw === 'false' ? false : equalsRaw;
        return { ...step, condition: { key: key.trim(), equals } };
      });
      return { ...current, steps };
    });
  };
  const reorderPanelStep = (from: number, to: number) => {
    setVersionPanel((current) => {
      if (!current) return current;
      return { ...current, steps: reorderSteps(current.steps, from, to) };
    });
  };
  const publishClonedVersion = async (
    template: Data['templates'][number],
    options?: { fromPanel?: boolean },
  ) => {
    if (!template.published_version_id && !options?.fromPanel) {
      setNote('该模板尚未发布，无法克隆新版本。');
      return;
    }
    setBusy(`version-${template.id}`);
    setNote('');
    try {
      const detailResponse = await sessionApi.request(`${api}/api/v1/workflows/${template.id}`, {
        headers: {},
      });
      if (!detailResponse.ok) throw new Error('DETAIL');
      const detail = (await detailResponse.json()).data as {
        definition: { version: number; published_version_id: string | null };
      };
      const publishedId =
        (options?.fromPanel ? versionPanel?.publishedVersionId : null) ??
        detail.definition.published_version_id ??
        template.published_version_id;
      if (!publishedId) throw new Error('NO_PUBLISHED');
      const sourceId =
        (options?.fromPanel ? versionPanel?.selectedVersionId : null) ?? publishedId;
      const versionDetail =
        options?.fromPanel && versionPanel?.selectedVersionId === sourceId
          ? { steps: versionPanel.steps }
          : await loadVersionSteps(template.id, sourceId);
      const nextSteps = versionDetail.steps.map((step, index) => ({
        name: options?.fromPanel
          ? step.name
          : index === versionDetail.steps.length - 1
            ? `${step.name} · 修订`
            : step.name,
        type: step.type,
        assigneeEmployeeId: step.assigneeEmployeeId,
        timeoutMinutes: step.timeoutMinutes,
        ...(step.condition && Object.keys(step.condition).length
          ? { condition: step.condition }
          : {}),
      }));
      const createVersion = await sessionApi.request(
        `${api}/api/v1/workflows/${template.id}/versions`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            definitionVersion: detail.definition.version,
            sourceVersionId: publishedId,
            steps: nextSteps,
          }),
        },
      );
      if (!createVersion.ok) throw new Error('CREATE_VERSION');
      const draft = (await createVersion.json()).data as {
        id: string;
        sequence: number;
        definitionVersion: number;
      };
      const publish = await sessionApi.request(`${api}/api/v1/workflows/${template.id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          versionId: draft.id,
          definitionVersion: draft.definitionVersion,
        }),
      });
      if (!publish.ok) throw new Error('PUBLISH_VERSION');
      setNote(`流程「${template.name}」已发布第 ${draft.sequence} 版，新实例将使用该版本。`);
      await load();
      if (options?.fromPanel) {
        await openVersionPanel(
          { ...template, published_version_id: draft.id },
          { preserveNote: true },
        );
      }
    } catch {
      setNote('新版本未发布，请确认流程管理权限与已发布版本仍有效。');
    } finally {
      setBusy(null);
    }
  };
  const decide = async (approval: Data['approvals'][number], action: 'approve' | 'reject') => {
    setBusy(`${action}-${approval.id}`);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/workflows/instances/${approval.workflow_instance_id}/steps/${approval.id}/${action}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ instanceVersion: approval.instance_version }),
        },
      );
      if (!response.ok) throw new Error('DECIDE');
      setNote(action === 'approve' ? '审批已通过，流程继续推进。' : '审批已拒绝，流程已结束。');
      await load();
    } catch {
      setNote('审批操作未完成，请刷新后确认版本与权限。');
    } finally {
      setBusy(null);
    }
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在汇总流程运行状态"
          description="正在关联流程模板、责任人、审批与截止时间。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看流程中心"
          description="请使用具备经营管理权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="流程中心暂不可用"
          description="流程运行数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  if (!data) return null;
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 商户运营流程"
        title="让每个流程实例都可定位、可推进"
        description="创建并发布模板、克隆新版本、启动实例与审批推进均复用既有流程写接口；不另造第二套 API。"
        actions={
          <label className={styles.filter}>
            实例状态
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                void load(e.target.value);
              }}
              aria-label="实例状态"
            >
              <option value="">全部实例</option>
              <option value="active">进行中</option>
              <option value="timed_out">已超时</option>
              <option value="completed">已完成</option>
              <option value="rejected">已拒绝</option>
            </select>
          </label>
        }
      />
      {note && (
        <p className={styles.notice} role="status">
          {note}
        </p>
      )}
      <Card className={styles.author}>
        <h2>创建并发布流程模板</h2>
        <div className={styles.form}>
          <label>
            编码
            <input
              aria-label="流程编码"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={80}
            />
          </label>
          <label>
            名称
            <input
              aria-label="流程名称"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
            />
          </label>
        </div>
        {steps.map((step, index) => (
          <div className={styles.stepRow} key={`step-${index}`}>
            <div className={styles.stepOrder}>
              <span>步骤 {index + 1}</span>
              <div className={styles.stepOrderActions}>
                <Button
                  tone="secondary"
                  disabled={index === 0}
                  aria-label={`上移步骤${index + 1}`}
                  data-testid={`workflow-draft-move-up-${index}`}
                  onClick={() => setSteps((value) => reorderSteps(value, index, index - 1))}
                >
                  上移
                </Button>
                <Button
                  tone="secondary"
                  disabled={index >= steps.length - 1}
                  aria-label={`下移步骤${index + 1}`}
                  data-testid={`workflow-draft-move-down-${index}`}
                  onClick={() => setSteps((value) => reorderSteps(value, index, index + 1))}
                >
                  下移
                </Button>
              </div>
            </div>
            <label>
              步骤名称
              <input
                aria-label={`步骤${index + 1}名称`}
                value={step.name}
                onChange={(event) =>
                  setSteps((value) =>
                    value.map((item, i) =>
                      i === index ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            <label>
              类型
              <select
                aria-label={`步骤${index + 1}类型`}
                value={step.type}
                onChange={(event) =>
                  setSteps((value) =>
                    value.map((item, i) =>
                      i === index
                        ? { ...item, type: event.target.value as StepDraft['type'] }
                        : item,
                    ),
                  )
                }
              >
                <option value="approval">审批</option>
                <option value="task">任务</option>
              </select>
            </label>
            <label>
              责任人
              <select
                aria-label={`步骤${index + 1}责任人`}
                value={step.assigneeEmployeeId}
                onChange={(event) =>
                  setSteps((value) =>
                    value.map((item, i) =>
                      i === index ? { ...item, assigneeEmployeeId: event.target.value } : item,
                    ),
                  )
                }
              >
                <option value="">选择员工</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.display_name} · {employee.employee_code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              超时（分钟）
              <input
                aria-label={`步骤${index + 1}超时分钟`}
                type="number"
                min={1}
                value={step.timeoutMinutes}
                onChange={(event) =>
                  setSteps((value) =>
                    value.map((item, i) =>
                      i === index
                        ? { ...item, timeoutMinutes: Number(event.target.value) || 1 }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label>
              条件键
              <input
                aria-label={`步骤${index + 1}条件键`}
                value={step.conditionKey}
                onChange={(event) =>
                  setSteps((value) =>
                    value.map((item, i) =>
                      i === index ? { ...item, conditionKey: event.target.value } : item,
                    ),
                  )
                }
                placeholder="可选，如 upsell"
              />
            </label>
            <label>
              equals
              <select
                aria-label={`步骤${index + 1}条件值`}
                value={step.conditionEquals}
                onChange={(event) =>
                  setSteps((value) =>
                    value.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            conditionEquals: event.target.value as StepDraft['conditionEquals'],
                          }
                        : item,
                    ),
                  )
                }
              >
                <option value="">始终执行</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
          </div>
        ))}
        {draftPreview ? (
          <div
            className={styles.draftPreview}
            data-testid="workflow-draft-preview"
            data-preview-mode="linear_draft_authoring_preview"
          >
            <strong>草稿预览（发布前）</strong>
            <p>线性上移/下移 + 条件分支/路径预览；不是自由拖拽图编辑器。</p>
            <ol className={styles.flow} aria-label="草稿线性步骤预览">
              {draftPreview.flow.nodes.map((node, index) => {
                const applies = draftPreview.path.appliedIndexes.includes(index);
                const outgoing = draftPreview.flow.edges.filter((edge) => edge.from === index);
                return (
                  <li key={`draft-${node.index}`} className={styles.flowItem}>
                    <div
                      className={[
                        node.hasCondition ? styles.flowNodeConditional : styles.flowNode,
                        applies ? styles.flowNodeApplied : styles.flowNodeSkipped,
                      ].join(' ')}
                      data-testid={`workflow-draft-node-${node.index}`}
                      data-path-state={applies ? 'applied' : 'skipped'}
                    >
                      <span>
                        {index + 1}. {node.name}
                      </span>
                      <small>
                        {businessLabel(node.type)}
                        {applies ? ' · 将执行' : ' · 将跳过'}
                      </small>
                      <b>{node.conditionLabel}</b>
                    </div>
                    {outgoing.length ? (
                      <div className={styles.flowBranches}>
                        {outgoing.map((edge) => (
                          <div
                            key={`draft-${edge.kind}-${edge.from}-${edge.to ?? 'end'}`}
                            className={edge.kind === 'skip' ? styles.flowEdgeSkip : styles.flowEdge}
                            data-edge-kind={edge.kind}
                          >
                            {edge.label}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {draftPreview.keys.length > 0 ? (
              <div className={styles.pathPreviewKeys}>
                {draftPreview.keys.map((key) => (
                  <label key={key} className={styles.pathPreviewKey}>
                    {key}
                    <select
                      aria-label={`草稿预览条件 ${key}`}
                      data-testid={`workflow-draft-preview-${key}`}
                      value={String(draftPreview.context[key] ?? true)}
                      onChange={(event) =>
                        setDraftPathContext((current) => ({
                          ...current,
                          [key]: event.target.value === 'true',
                        }))
                      }
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={styles.actions}>
          <Button
            tone="secondary"
            onClick={() => setSteps((value) => [...value, emptyStep(employees[0]?.id ?? '')])}
          >
            添加步骤
          </Button>
          {steps.length > 1 && (
            <Button tone="secondary" onClick={() => setSteps((value) => value.slice(0, -1))}>
              移除末步
            </Button>
          )}
          <Button disabled={busy === 'create' || !employees.length} onClick={() => void createAndPublish()}>
            创建并发布
          </Button>
        </div>
        {!employees.length && <p className={styles.hint}>需要至少一名在岗员工作为步骤责任人。</p>}
      </Card>
      <section className={styles.metrics}>
        <MetricCard label="流程模板" value={data.templates.length} hint="已配置流程" />
        <MetricCard
          label="进行中实例"
          value={data.instances.filter((x) => x.status === 'active').length}
          hint="需要持续推进"
        />
        <MetricCard
          label="已超时实例"
          value={data.instances.filter((x) => x.status === 'timed_out').length}
          hint="需要优先介入"
        />
        <MetricCard label="待审批步骤" value={data.approvals.length} hint="等待责任人确认" />
      </section>
      <section className={styles.grid}>
        <Panel title="待处理审批">
          {data.approvals.length ? (
            data.approvals.map((x) => (
              <div key={x.id} className={styles.approvalRow}>
                <p>
                  <strong>{x.definition_name}</strong> · {x.name}
                  <br />
                  <small>
                    {x.assignee_name} · 截止{' '}
                    {new Date(x.due_at).toLocaleString('zh-CN', { hour12: false })}
                  </small>
                </p>
                <div className={styles.actions}>
                  <Button
                    disabled={busy === `approve-${x.id}` || busy === `reject-${x.id}`}
                    onClick={() => void decide(x, 'approve')}
                  >
                    通过
                  </Button>
                  <Button
                    tone="secondary"
                    disabled={busy === `approve-${x.id}` || busy === `reject-${x.id}`}
                    onClick={() => void decide(x, 'reject')}
                  >
                    拒绝
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <AppStatePanel kind="empty" title="当前没有待审批步骤" />
          )}
        </Panel>
        <Panel title="流程模板">
          {data.templates.map((x) => (
            <div key={x.id} className={styles.templateRow}>
              <p>
                <strong>{x.name}</strong> · {x.code}
                <br />
                <small>
                  <StatusBadge tone={x.published_version_id ? 'success' : 'warning'}>
                    {businessLabel(x.published_version_id ? 'published' : 'unpublished')}
                  </StatusBadge>{' '}
                  · 运行 {x.active_instances} · 超时 {x.timed_out_instances}
                </small>
              </p>
              <div className={styles.actions}>
                <Button
                  tone="secondary"
                  disabled={busy === `panel-${x.id}`}
                  onClick={() => void openVersionPanel(x)}
                  data-testid={`workflow-version-open-${x.id}`}
                >
                  查看版本
                </Button>
                <Button
                  tone="secondary"
                  disabled={!x.published_version_id || busy === `start-${x.id}`}
                  onClick={() => void startInstance(x)}
                >
                  启动实例
                </Button>
                <Button
                  tone="secondary"
                  disabled={!x.published_version_id || busy === `version-${x.id}`}
                  onClick={() => void publishClonedVersion(x)}
                >
                  克隆发布新版本
                </Button>
              </div>
            </div>
          ))}
        </Panel>
      </section>
      {versionPanel && (
        <div data-testid="workflow-version-panel">
          <Card className={styles.versionPanel}>
          <div className={styles.versionHeader}>
            <div>
              <h2>版本面板 · {versionPanel.templateName}</h2>
              <p>
                线性步骤 + 条件分支 + 路径预览 + 上移/下移后克隆发布；不是自由拖拽图编辑器。
              </p>
            </div>
            <Button tone="secondary" onClick={() => setVersionPanel(null)}>
              关闭
            </Button>
          </div>
          {!versionPanel.loading && versionPanel.steps.length > 0 && (
            <>
            <ol
              className={styles.flow}
              data-testid="workflow-linear-flow"
              data-flow-mode="linear_with_condition_branches"
              aria-label="线性步骤与条件分支预览"
            >
              {(() => {
                const flow = buildConditionBranchFlow(versionPanel.steps);
                const applied = new Set(pathPreview?.path.appliedIndexes ?? []);
                return flow.nodes.map((node, index) => {
                  const outgoing = flow.edges.filter((edge) => edge.from === index);
                  const applies = pathPreview ? applied.has(index) : true;
                  return (
                    <li key={`${node.name}-${node.index}`} className={styles.flowItem}>
                      <div
                        className={[
                          node.hasCondition ? styles.flowNodeConditional : styles.flowNode,
                          pathPreview
                            ? applies
                              ? styles.flowNodeApplied
                              : styles.flowNodeSkipped
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        data-testid={`workflow-flow-node-${node.index}`}
                        data-path-state={pathPreview ? (applies ? 'applied' : 'skipped') : 'idle'}
                      >
                        <span>
                          {index + 1}. {node.name}
                        </span>
                        <small>
                          {businessLabel(node.type)}
                          {node.timeoutMinutes ? ` · ${node.timeoutMinutes} 分` : ''}
                          {pathPreview ? (applies ? ' · 将执行' : ' · 将跳过') : ''}
                        </small>
                        <b>{node.conditionLabel}</b>
                      </div>
                      {outgoing.length ? (
                        <div
                          className={styles.flowBranches}
                          data-testid={`workflow-flow-branches-${index}`}
                        >
                          {outgoing.map((edge) => (
                            <div
                              key={`${edge.kind}-${edge.from}-${edge.to ?? 'end'}`}
                              className={
                                edge.kind === 'skip' ? styles.flowEdgeSkip : styles.flowEdge
                              }
                              data-edge-kind={edge.kind}
                            >
                              {edge.label}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                });
              })()}
            </ol>
            {pathPreview && pathPreview.keys.length > 0 ? (
              <div
                className={styles.pathPreview}
                data-testid="workflow-path-preview"
                data-preview-mode="linear_condition_path_preview"
              >
                <strong>条件路径预览</strong>
                <p>切换样例上下文，高亮线性步骤中将执行 / 将跳过的节点。不改变已发布定义。</p>
                <div className={styles.pathPreviewKeys}>
                  {pathPreview.keys.map((key) => (
                    <label key={key} className={styles.pathPreviewKey}>
                      {key}
                      <select
                        aria-label={`预览条件 ${key}`}
                        data-testid={`workflow-path-preview-${key}`}
                        value={String(pathPreview.context[key] ?? true)}
                        onChange={(event) =>
                          setPathPreviewContext((current) => ({
                            ...current,
                            [key]: event.target.value === 'true',
                          }))
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </label>
                  ))}
                </div>
                <small data-testid="workflow-path-preview-summary">
                  将执行 {pathPreview.path.appliedIndexes.map((i) => i + 1).join('、') || '无'}
                  {' · '}
                  将跳过 {pathPreview.path.skippedIndexes.map((i) => i + 1).join('、') || '无'}
                </small>
              </div>
            ) : null}
            <div className={styles.flowExport} data-testid="workflow-flow-export">
              <Button
                tone="secondary"
                data-testid="workflow-copy-linear-json"
                onClick={async () => {
                  const payload = serializeConditionBranchFlow(versionPanel.steps);
                  const text = JSON.stringify(payload, null, 2);
                  try {
                    await navigator.clipboard.writeText(text);
                    setFlowJsonCopied(true);
                    setTimeout(() => setFlowJsonCopied(false), 2000);
                  } catch {
                    setNote('无法写入剪贴板，请检查浏览器权限。');
                  }
                }}
              >
                {flowJsonCopied ? '已复制线性流程 JSON' : '复制线性流程 JSON'}
              </Button>
              <small>导出为线性分支模型（editor=not_free_form_drag），不是自由拖拽图画布文档。</small>
            </div>
            </>
          )}
          <div className={styles.versionLayout}>
            <div className={styles.versionList} aria-label="版本列表">
              {versionPanel.versions.map((version) => (
                <button
                  type="button"
                  key={version.id}
                  className={
                    version.id === versionPanel.selectedVersionId
                      ? styles.versionActive
                      : styles.versionItem
                  }
                  data-testid={`workflow-version-${version.sequence}`}
                  onClick={() => void selectVersion(version.id)}
                >
                  v{version.sequence} · {businessLabel(version.status)}
                </button>
              ))}
              {!versionPanel.versions.length && <p className={styles.hint}>暂无版本。</p>}
            </div>
            <div className={styles.versionSteps} aria-label="版本步骤">
              {versionPanel.loading ? (
                <p className={styles.hint}>正在读取步骤…</p>
              ) : versionPanel.steps.length ? (
                versionPanel.steps.map((step, index) => (
                  <div
                    className={styles.versionStep}
                    key={`${step.name}-${index}`}
                    data-testid={`workflow-panel-step-${index}`}
                  >
                    <div className={styles.stepOrder}>
                      <strong>
                        {index + 1}. {step.name}
                      </strong>
                      <div className={styles.stepOrderActions}>
                        <Button
                          tone="secondary"
                          disabled={index === 0 || versionPanel.loading}
                          aria-label={`面板上移步骤${index + 1}`}
                          data-testid={`workflow-panel-move-up-${index}`}
                          onClick={() => reorderPanelStep(index, index - 1)}
                        >
                          上移
                        </Button>
                        <Button
                          tone="secondary"
                          disabled={
                            index >= versionPanel.steps.length - 1 || versionPanel.loading
                          }
                          aria-label={`面板下移步骤${index + 1}`}
                          data-testid={`workflow-panel-move-down-${index}`}
                          onClick={() => reorderPanelStep(index, index + 1)}
                        >
                          下移
                        </Button>
                      </div>
                    </div>
                    <small>
                      {businessLabel(step.type)} · 超时 {step.timeoutMinutes} 分钟 ·{' '}
                      {summarizeCondition(step.condition)}
                    </small>
                    <div className={styles.conditionRow}>
                      <label>
                        条件键
                        <input
                          aria-label={`步骤${index + 1}条件键`}
                          value={conditionKeyOf(step.condition)}
                          onChange={(event) =>
                            updatePanelStepCondition(index, { key: event.target.value })
                          }
                          placeholder="例如 upsell"
                        />
                      </label>
                      <label>
                        equals
                        <select
                          aria-label={`步骤${index + 1}条件值`}
                          value={conditionEqualsOf(step.condition)}
                          onChange={(event) =>
                            updatePanelStepCondition(index, { equals: event.target.value })
                          }
                        >
                          <option value="">无</option>
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.hint}>该版本没有步骤。</p>
              )}
              <div className={styles.actions}>
                <Button
                  disabled={
                    !versionPanel.publishedVersionId ||
                    busy === `version-${versionPanel.templateId}` ||
                    versionPanel.loading
                  }
                  data-testid="workflow-version-clone-publish"
                  onClick={() => {
                    const template = data.templates.find((item) => item.id === versionPanel.templateId);
                    if (template) void publishClonedVersion(template, { fromPanel: true });
                  }}
                >
                  按面板顺序与条件克隆发布
                </Button>
              </div>
            </div>
          </div>
          </Card>
        </div>
      )}
      <Card className={styles.table}>
        <h2>实例与责任人</h2>
        {data.instances.length ? (
          <table>
            <thead>
              <tr>
                <th>流程</th>
                <th>状态</th>
                <th>当前步骤</th>
                <th>责任人</th>
                <th>截止时间</th>
              </tr>
            </thead>
            <tbody>
              {data.instances.map((x) => (
                <tr key={x.id}>
                  <td>{x.definition_name}</td>
                  <td>
                    <StatusBadge
                      tone={
                        x.status === 'completed'
                          ? 'success'
                          : x.status === 'timed_out'
                            ? 'warning'
                            : x.status === 'rejected'
                              ? 'danger'
                              : 'info'
                      }
                    >
                      {businessLabel(x.status)}
                    </StatusBadge>
                  </td>
                  <td>
                    {x.step_name ?? '—'}
                    {x.step_type ? ` · ${businessLabel(x.step_type)}` : ''}
                  </td>
                  <td>{x.assignee_name}</td>
                  <td>
                    {x.due_at ? new Date(x.due_at).toLocaleString('zh-CN', { hour12: false }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <AppStatePanel
            kind="empty"
            title="当前筛选范围内没有流程实例"
            description="切换实例状态查看其他运行记录。"
          />
        )}
      </Card>
    </main>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className={styles.panel}>
      <h2>{title}</h2>
      {children}
    </Card>
  );
}
