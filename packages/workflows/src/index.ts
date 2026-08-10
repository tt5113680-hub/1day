export type WorkflowCondition = {
  key: string;
  equals: string | number | boolean;
};

export type WorkflowStepLike = {
  name: string;
  type: string;
  assigneeEmployeeId?: string;
  timeoutMinutes?: number;
  condition?: Record<string, unknown> | null;
};

export type LinearFlowNode = {
  index: number;
  name: string;
  type: string;
  timeoutMinutes: number | null;
  conditionLabel: string;
  hasCondition: boolean;
};

export type LinearFlowEdge = {
  from: number;
  to: number;
  label: string;
};

export type LinearFlow = {
  nodes: LinearFlowNode[];
  edges: LinearFlowEdge[];
};

export function isWorkflowCondition(
  value: Record<string, unknown> | null | undefined,
): value is WorkflowCondition {
  if (!value) return false;
  return (
    typeof value.key === 'string' &&
    value.key.length > 0 &&
    ['string', 'number', 'boolean'].includes(typeof value.equals)
  );
}

/** Human-readable condition for Management / Employee chrome. */
export function summarizeCondition(
  condition?: Record<string, unknown> | null,
): string {
  if (!condition || !Object.keys(condition).length) return '始终执行';
  if (isWorkflowCondition(condition)) return `${condition.key} = ${String(condition.equals)}`;
  return JSON.stringify(condition);
}

function toLinearNodes(steps: WorkflowStepLike[]): LinearFlowNode[] {
  return steps.map((step, index) => ({
    index,
    name: step.name || `步骤 ${index + 1}`,
    type: step.type || 'task',
    timeoutMinutes:
      typeof step.timeoutMinutes === 'number' && Number.isFinite(step.timeoutMinutes)
        ? step.timeoutMinutes
        : null,
    conditionLabel: summarizeCondition(step.condition),
    hasCondition: Boolean(step.condition && Object.keys(step.condition).length),
  }));
}

/** Linear (not free-form graph) flow model for version visualization. */
export function buildLinearFlow(steps: WorkflowStepLike[]): LinearFlow {
  const nodes = toLinearNodes(steps);
  const edges: LinearFlowEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const next = nodes[i + 1]!;
    edges.push({
      from: i,
      to: i + 1,
      label: next.hasCondition ? `若 ${next.conditionLabel}` : '下一步',
    });
  }
  return { nodes, edges };
}

export type BranchFlowEdgeKind = 'sequence' | 'take' | 'skip';

export type BranchFlowEdge = {
  from: number;
  to: number | null;
  kind: BranchFlowEdgeKind;
  label: string;
};

/**
 * Linear steps with honest condition take/skip branches.
 * Not a free-form drag graph: fixed left-to-right order, no arbitrary nodes/edges.
 */
export type ConditionBranchFlow = {
  nodes: LinearFlowNode[];
  edges: BranchFlowEdge[];
  mode: 'linear_with_condition_branches';
};

/** Condition branch preview on the linear spine (SYS-12 minimum honest slice). */
export function buildConditionBranchFlow(steps: WorkflowStepLike[]): ConditionBranchFlow {
  const nodes = toLinearNodes(steps);
  const edges: BranchFlowEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const next = nodes[i + 1]!;
    if (!next.hasCondition) {
      edges.push({ from: i, to: i + 1, kind: 'sequence', label: '下一步' });
      continue;
    }
    edges.push({
      from: i,
      to: i + 1,
      kind: 'take',
      label: `满足则进入 · ${next.conditionLabel}`,
    });
    const skipTo = i + 2 < nodes.length ? i + 2 : null;
    edges.push({
      from: i,
      to: skipTo,
      kind: 'skip',
      label: skipTo === null ? '否则跳过（无后续步骤）' : `否则跳过至步骤 ${skipTo + 1}`,
    });
  }
  return { nodes, edges, mode: 'linear_with_condition_branches' };
}

/** Same semantics as API `applies` for local preview only. */
export function previewStepApplies(
  condition: Record<string, unknown> | null | undefined,
  context: Record<string, unknown>,
): boolean {
  if (!condition || !Object.keys(condition).length) return true;
  if (!isWorkflowCondition(condition)) return false;
  return context[condition.key] === condition.equals;
}

/** Distinct condition keys used by steps (for preview controls). */
export function collectConditionKeys(steps: WorkflowStepLike[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    const condition = step.condition;
    if (!isWorkflowCondition(condition)) continue;
    if (seen.has(condition.key)) continue;
    seen.add(condition.key);
    keys.push(condition.key);
  }
  return keys;
}

export type ConditionPathPreview = {
  appliedIndexes: number[];
  skippedIndexes: number[];
  mode: 'linear_condition_path_preview';
};

/**
 * Simulate which linear steps would run under a sample context.
 * Not a free-form graph executor — step order stays fixed; conditions only gate apply/skip.
 */
export function previewConditionPath(
  steps: WorkflowStepLike[],
  context: Record<string, unknown>,
): ConditionPathPreview {
  const appliedIndexes: number[] = [];
  const skippedIndexes: number[] = [];
  steps.forEach((step, index) => {
    if (previewStepApplies(step.condition, context)) appliedIndexes.push(index);
    else skippedIndexes.push(index);
  });
  return { appliedIndexes, skippedIndexes, mode: 'linear_condition_path_preview' };
}

/**
 * Reorder steps on the linear spine (SYS-14).
 * Not free-form drag: only index swap within a fixed ordered list.
 */
export function reorderSteps<T>(steps: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= steps.length ||
    to >= steps.length ||
    !Number.isInteger(from) ||
    !Number.isInteger(to)
  ) {
    return steps;
  }
  const next = steps.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/**
 * Insert a step on the linear spine at `index` (0..length inclusive).
 * SYS-17 insert rails — not free-form drag placement.
 */
export function insertStepAt<T>(steps: T[], index: number, step: T): T[] {
  if (!Number.isInteger(index) || index < 0 || index > steps.length) {
    return steps;
  }
  const next = steps.slice();
  next.splice(index, 0, step);
  return next;
}

/**
 * Duplicate the step at `index`, inserting the clone immediately after.
 * SYS-17 — ordered list only; caller supplies a clone (no canvas copy).
 */
export function duplicateStepAt<T>(
  steps: T[],
  index: number,
  clone: (step: T) => T,
): T[] {
  if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
    return steps;
  }
  return insertStepAt(steps, index + 1, clone(steps[index]!));
}

export type SerializedLinearWorkflow = {
  mode: 'linear_with_condition_branches';
  editor: 'not_free_form_drag';
  nodes: Array<{
    index: number;
    name: string;
    type: string;
    conditionLabel: string;
    hasCondition: boolean;
  }>;
  edges: Array<{
    from: number;
    to: number | null;
    kind: BranchFlowEdgeKind;
    label: string;
  }>;
};

/** Honest JSON export of the linear branch model (SYS-16). Not a free-form graph document. */
export function serializeConditionBranchFlow(
  steps: WorkflowStepLike[],
): SerializedLinearWorkflow {
  const flow = buildConditionBranchFlow(steps);
  return {
    mode: flow.mode,
    editor: 'not_free_form_drag',
    nodes: flow.nodes.map((node) => ({
      index: node.index,
      name: node.name,
      type: node.type,
      conditionLabel: node.conditionLabel,
      hasCondition: node.hasCondition,
    })),
    edges: flow.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      kind: edge.kind,
      label: edge.label,
    })),
  };
}

export const workflowsPackage = '@oneday/workflows';
