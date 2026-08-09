export type AppState = 'loading' | 'empty' | 'error' | 'forbidden';
export const appStateCopy: Record<AppState, string> = {
  loading: '正在加载…',
  empty: '暂时没有可展示的数据。',
  error: '加载失败，请稍后重试。',
  forbidden: '你没有访问此内容的权限。',
};

const labels: Record<string, string> = {
  first_source: '首次来源',
  current_source: '当前来源',
  final_source: '最终来源',
  employee_share: '员工分享',
  external_action: '外部活动',
  store_consultation: '门店咨询',
  service_consultation: '服务咨询',
  owner: '跟进负责人',
  contributor: '协作员工',
  active: '有效',
  completed: '已完成',
  open: '待处理',
  overdue: '已逾期',
  pending: '待确认',
  transferred: '已转交',
  approved: '已通过',
  rejected: '未通过',
  invited: '已邀请',
  onboarding: '开通中',
  paused: '已暂停',
  ready: '已就绪',
  degraded: '服务降级',
  blocked: '已阻断',
  consumer: '消费者门店',
  employee: '员工工作台',
  management: '商户经营后台',
  draft: '草稿',
  published: '已发布',
  hero: '品牌主视觉',
  action_grid: '快捷行动区',
  content: '内容展示区',
  result_list: '结果列表',
  api_key: 'API 密钥',
  oauth: 'OAuth 授权',
  manual: '人工授权',
  healthy: '运行正常',
  unknown: '待首次观测',
  not_available: '未启用外部投递',
  connector_health: '连接器健康',
  privileged_change: '特权配置变更',
  review: '待复核',
  unavailable: '服务不可用',
  acknowledged: '已确认处置',
  platform_security_review: '平台风险处置',
  platform_connector: '平台连接器',
  tenant: '租户',
  platform_tenant: '平台租户',
  platform_template: '平台模板',
  platform_channel: '平台渠道',
  business_circle: '商圈',
  confirmed: '已确认并附证据',
  recorded: '已有贡献记录',
  source_only: '仅来源记录',
  consumer_action: '消费者公开咨询',
  campaign: '营销活动',
  photo: '现场图片',
  screenshot: '页面截图',
  order: '结果已记录',
  task: '任务状态',
  overdue_task: '逾期任务',
  ownership_approval: '归属审批',
  connector_attention: '连接器需关注',
};

/** Converts persisted operating enums into concise, stable commercial copy. */
export const businessLabel = (value: string) => labels[value] ?? value;

/** Avoids showing an internal consumer-action UUID as an employee instruction. */
export const taskReasonCopy = (value: string | null) => {
  if (!value) return '请按任务要求完成处理，并保留必要证据。';
  if (/^Consumer action [0-9a-f-]+ \(scene:([^)]*)\)$/i.test(value)) {
    const scene = value.match(/^Consumer action [0-9a-f-]+ \(scene:([^)]*)\)$/i)?.[1];
    return scene ? `客户完成公开咨询（场景：${scene.replace(/_/g, ' ')}）` : '客户完成公开咨询';
  }
  return value;
};

export const taskTitleCopy = (value: string) =>
  value === 'Follow up public consumer action' ? '跟进公开咨询客户' : value;

/** Keeps anonymous public-action identifiers out of employee and owner operating views. */
export const customerNameCopy = (value: string | null) =>
  value && /^Public consumer [0-9a-f]+$/i.test(value) ? '公开咨询客户' : value;

/** Converts compact audit timeline labels without changing their persisted values. */
export const timelineLabelCopy = (value: string) => {
  const taskMatch = value.match(/^(completed|open|overdue): (.+)$/i);
  const status = taskMatch?.[1];
  const title = taskMatch?.[2];
  if (status && title) return `${businessLabel(status.toLowerCase())}：${taskTitleCopy(title)}`;
  if (value.startsWith('Order ')) return `结果订单 ${value.slice('Order '.length)}`;
  return value;
};

export {
  AdminPageHeader,
  AdminShell,
  AppStatePanel,
  Button,
  Card,
  MetricCard,
  MobileShell,
  StatusBadge,
  type AdminNavItem,
  type ButtonProps,
} from './components.js';
