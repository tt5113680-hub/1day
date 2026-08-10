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
  store_hero: '门店品牌主视觉',
  banner_carousel: '营销轮播',
  quick_actions: '快捷经营入口',
  operating_channels: '行业经营频道',
  service_catalog: '服务与套餐目录',
  offer_compare: '多平台套餐比较',
  member_entry: '会员加入入口',
  content_feed: '门店内容动态',
  store_info: '门店资料与到店信息',
  discovery_entry: '附近与商圈入口',
  member_wallet: '会员权益包',
  archived: '历史发布版本',
  restaurant: '餐饮',
  beauty: '美业',
  education: '教育',
  retail: '新零售',
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
  accepted: '已采纳',
  executed: '已执行',
  manual_required: '需要人工处理',
  review_tasks: '复核任务队列',
  create_task: '创建跟进任务',
  create_follow_up: '创建后续跟进',
  timed_out: '已超时',
  unpublished: '未发布',
  article: '文章',
  knowledge: '知识内容',
  image: '图片',
  video: '视频',
  douyin: '抖音',
  wechat: '微信',
  xiaohongshu: '小红书',
  headquarters: '总部',
  branch: '分支机构',
  department: '部门',
  team: '团队',
  authorized: '已授权',
  pending_authorization: '等待第三方授权',
  authorization_and_delivery_receipt: '授权与投递回执',
  manual_external_receipt: '人工外部投递回执',
  photo: '现场图片',
  screenshot: '页面截图',
  order: '结果已记录',
  task: '任务状态',
  overdue_task: '逾期任务',
  ownership_approval: '归属审批',
  connector_attention: '连接器需关注',
  'tenant.read': '查看租户经营',
  'tenant.manage': '管理租户经营',
  'organization.read': '查看组织',
  'organization.manage': '管理组织',
  'employee.read': '查看员工',
  'employee.manage': '管理员工',
  'customer.read': '查看客户',
  'customer.manage': '管理客户',
  'task.read': '查看任务',
  'task.manage': '管理任务',
  'attribution.read': '查看归因',
  'attribution.manage': '管理归因',
  'ownership.approve': '审批客户归属',
  'action.read': '查看外部行动',
  'action.manage': '管理外部行动',
  'evidence.read': '查看业务证据',
  'evidence.manage': '管理业务证据',
  'page.read': '查看页面模板',
  'page.manage': '管理页面模板',
  'workflow.read': '查看运营流程',
  'workflow.manage': '管理运营流程',
  'platform.read': '查看平台治理',
  'platform.manage': '管理平台治理',
  'circle.manage': '管理商圈',
  phone: '手机',
  referral: '转介绍',
  store: '门店来源',
  call: '电话跟进',
  visit: '到店沟通',
  message: '消息沟通',
  other: '其他跟进',
  unassigned: '未分配负责人',
  'No active customer owner': '当前客户未分配负责人',
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
  FormField,
  Input,
  MetricCard,
  MobileShell,
  Select,
  Skeleton,
  StatusBadge,
  type AdminNavItem,
  type ButtonProps,
} from './components.js';

export { designTokenCssVars, designTokens, type DesignTokens } from '@oneday/design-tokens';
