import type { ColumnType, Generated } from 'kysely';

export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface TenantsTable {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface UsersTable {
  id: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface MembershipsTable {
  id: string;
  tenant_id: string;
  user_id: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface RolesTable {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface PermissionsTable {
  id: string;
  code: string;
  description: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface RolePermissionsTable {
  id: string;
  tenant_id: string;
  role_id: string;
  permission_id: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface DataScopesTable {
  id: string;
  tenant_id: string;
  membership_id: string;
  scope_type: string;
  scope_value: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface OutboxEventsTable {
  id: string;
  tenant_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: unknown;
  correlation_id: string;
  trace_id: string;
  status: string;
  attempts: Generated<number>;
  available_at: Timestamp;
  published_at: Timestamp | null;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface AuditLogsTable {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  correlation_id: string;
  trace_id: string;
  details: unknown;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface AuthSessionsTable {
  id: string;
  tenant_id: string;
  user_id: string;
  refresh_token_hash: string;
  device_name: string | null;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface MembershipRolesTable {
  id: string;
  tenant_id: string;
  membership_id: string;
  role_id: string;
}

export interface OrganizationsTable {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  organization_type: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface OrganizationRelationsTable {
  id: string;
  tenant_id: string;
  parent_organization_id: string;
  child_organization_id: string;
  relation_type: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface MerchantsTable {
  id: string;
  tenant_id: string;
  organization_id: string;
  code: string;
  name: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface StoresTable {
  id: string;
  tenant_id: string;
  organization_id: string;
  merchant_id: string;
  code: string;
  name: string;
  address: string | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface IdempotencyKeysTable {
  id: string;
  tenant_id: string;
  resource_type: string;
  idempotency_key: string;
  response: unknown;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface EmployeesTable {
  id: string;
  tenant_id: string;
  membership_id: string;
  organization_id: string;
  employee_code: string;
  title: string | null;
  status: string;
  started_at: Timestamp;
  ended_at: Timestamp | null;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface MembershipInvitationsTable {
  id: string;
  tenant_id: string;
  organization_id: string;
  email: string;
  employee_code: string;
  title: string | null;
  token_hash: string;
  expires_at: Timestamp;
  accepted_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomersTable {
  id: string;
  tenant_id: string;
  display_name: string;
  status: string;
  merged_into_id: string | null;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerIdentitiesTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  identity_type: string;
  identity_value_hash: string;
  masked_value: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerMergesTable {
  id: string;
  tenant_id: string;
  source_customer_id: string;
  target_customer_id: string;
  reason: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerSourcesTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  source_role: string;
  source_type: string;
  source_id: string | null;
  metadata: unknown;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerOwnershipsTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  employee_id: string;
  ownership_role: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerContributionsTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  employee_id: string;
  contribution_role: string;
  evidence_refs: unknown;
  confirmed: boolean;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerOwnershipTransferApprovalsTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  from_employee_id: string | null;
  to_employee_id: string;
  reason: string;
  requested_version: number;
  approved_by: string | null;
  approved_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface TasksTable {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  reason: string | null;
  assignee_employee_id: string;
  title: string;
  due_at: Timestamp;
  status: string;
  escalation_level: number;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface TaskEvidenceLinksTable {
  id: string;
  tenant_id: string;
  task_id: string;
  evidence_file_id: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerTagsTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  label: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: number;
}
export interface TaskFollowUpsTable {
  id: string;
  tenant_id: string;
  task_id: string;
  employee_id: string;
  action_type: string;
  raw_note: string | null;
  voice_transcript: string | null;
  summary: string | null;
  next_task_id: string | null;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: number;
}

export interface EmployeeShareCodesTable {
  id: string;
  tenant_id: string;
  employee_id: string;
  code: string;
  scenario: string;
  target_path: string;
  expires_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: number;
}

export interface EmployeeShareCodeEventsTable {
  id: string;
  tenant_id: string;
  share_code_id: string;
  event_type: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: number;
}

export interface EmployeeLeadPoolEntriesTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  source_type: string;
  priority: string;
  status: string;
  assignee_employee_id: string | null;
  claimed_at: Timestamp | null;
  converted_at: Timestamp | null;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: number;
}

export interface EmployeeNurtureProfilesTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  employee_id: string;
  segment: string;
  next_touch_at: Timestamp | null;
  last_touch_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface EmployeeNurtureTouchpointsTable {
  id: string;
  tenant_id: string;
  profile_id: string;
  customer_id: string;
  employee_id: string;
  action_type: string;
  note: string | null;
  task_id: string | null;
  occurred_at: Timestamp;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface TaskRemindersTable {
  id: string;
  tenant_id: string;
  task_id: string;
  remind_at: Timestamp;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface NotificationLogsTable {
  id: string;
  tenant_id: string;
  task_id: string;
  employee_id: string;
  notification_type: string;
  status: string;
  sent_at: Timestamp;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface EmployeeNotificationPreferencesTable {
  id: string;
  tenant_id: string;
  employee_id: string;
  do_not_disturb_until: Timestamp | null;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface EmployeeNotificationsTable {
  id: string;
  tenant_id: string;
  employee_id: string;
  category: string;
  source_type: string;
  source_id: string;
  title: string;
  body: string;
  deep_link: string | null;
  sent_at: Timestamp;
  read_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerOrdersTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  order_number: string;
  occurred_at: Timestamp;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface EvidenceFilesTable {
  id: string;
  tenant_id: string;
  order_id: string;
  evidence_type: string;
  original_filename: string;
  media_type: string;
  byte_size: number;
  content_sha256: string;
  content: Uint8Array;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface VerificationCodesTable {
  id: string;
  tenant_id: string;
  order_id: string;
  code_hash: string;
  expires_at: Timestamp;
  redeemed_at: Timestamp | null;
  redeemed_by: string | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface ConnectorResultsTable {
  id: string;
  tenant_id: string;
  order_id: string;
  connector_code: string;
  external_reference: string;
  result_status: string;
  payload: unknown;
  received_at: Timestamp;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface PageTemplatesTable {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  target: string;
  published_version_id: string | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface PageTemplateVersionsTable {
  id: string;
  tenant_id: string;
  template_id: string;
  sequence: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface PageModulesTable {
  id: string;
  tenant_id: string;
  template_version_id: string;
  module_type: string;
  position: number;
  config: unknown;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface ExternalActionsTable {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  action_type: string;
  target_url: string | null;
  mini_program_app_id: string | null;
  mini_program_path: string | null;
  platform: string | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface ExternalActionEventsTable {
  id: string;
  tenant_id: string;
  action_id: string;
  event_type: string;
  actor_id: string | null;
  context: unknown;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface ConsumerActionRedirectEventsTable {
  id: string;
  tenant_id: string;
  action_id: string;
  source: string | null;
  return_to: string | null;
  idempotency_key: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface ConsumerProcessAccessesTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  order_id: string;
  access_token_hash: string;
  appointment_at: Timestamp | null;
  consultation_status: string;
  exception_feedback: string | null;
  expires_at: Timestamp;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface ConsumerProfileAccessesTable {
  id: string;
  tenant_id: string;
  customer_id: string;
  access_token_hash: string;
  consent_status: string;
  consent_version: string;
  consented_at: Timestamp;
  revoked_at: Timestamp | null;
  expires_at: Timestamp;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface WorkflowDefinitionsTable {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  published_version_id: string | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface WorkflowVersionsTable {
  id: string;
  tenant_id: string;
  definition_id: string;
  sequence: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface WorkflowStepsTable {
  id: string;
  tenant_id: string;
  workflow_version_id: string;
  position: number;
  name: string;
  step_type: string;
  assignee_employee_id: string;
  timeout_minutes: number;
  condition: unknown;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface WorkflowInstancesTable {
  id: string;
  tenant_id: string;
  definition_id: string;
  workflow_version_id: string;
  context: unknown;
  current_step_position: number;
  started_at: Timestamp;
  completed_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface WorkflowInstanceStepsTable {
  id: string;
  tenant_id: string;
  workflow_instance_id: string;
  workflow_step_id: string;
  position: number;
  name: string;
  step_type: string;
  assignee_employee_id: string;
  task_id: string | null;
  due_at: Timestamp | null;
  completed_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface DiscoveryChannelsTable {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  rank: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface DiscoveryChannelMerchantsTable {
  id: string;
  tenant_id: string;
  channel_id: string;
  merchant_id: string;
  rank: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface BusinessCirclesTable {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  rank: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface BusinessCircleMerchantsTable {
  id: string;
  tenant_id: string;
  business_circle_id: string;
  merchant_id: string;
  rank: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface MerchantLocationsTable {
  id: string;
  tenant_id: string;
  merchant_id: string;
  latitude: string;
  longitude: string;
  address_label: string | null;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface StoreServicesTable {
  id: string;
  tenant_id: string;
  store_id: string;
  code: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price_label: string | null;
  rank: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface StoreBenefitsTable {
  id: string;
  tenant_id: string;
  store_id: string;
  title: string;
  description: string | null;
  external_action_id: string | null;
  rank: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface StoreContentItemsTable {
  id: string;
  tenant_id: string;
  store_id: string;
  content_type: string;
  title: string;
  summary: string | null;
  rank: number;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}
export interface ConsumerActionEventsTable {
  id: string;
  tenant_id: string;
  store_id: string;
  external_action_id: string;
  source: string | null;
  idempotency_key: string;
  status: string;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
  deleted_at: Timestamp | null;
  version: Generated<number>;
}

export interface CustomerExportRequestsTable {
  id: string;
  tenant_id: string;
  filters: unknown;
  requested_by: string;
  approved_by: string | null;
  approved_at: Timestamp | null;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  version: Generated<number>;
}

export interface AiSuggestionsTable {
  id: string;
  tenant_id: string;
  title: string;
  reason: string;
  impact: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  model_name: string;
  model_version: string;
  status: string;
  feedback: string | null;
  accepted_by: string | null;
  accepted_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  version: number;
}

export interface Database {
  tenants: TenantsTable;
  users: UsersTable;
  memberships: MembershipsTable;
  roles: RolesTable;
  permissions: PermissionsTable;
  role_permissions: RolePermissionsTable;
  data_scopes: DataScopesTable;
  outbox_events: OutboxEventsTable;
  audit_logs: AuditLogsTable;
  auth_sessions: AuthSessionsTable;
  membership_roles: MembershipRolesTable;
  organizations: OrganizationsTable;
  organization_relations: OrganizationRelationsTable;
  merchants: MerchantsTable;
  stores: StoresTable;
  idempotency_keys: IdempotencyKeysTable;
  employees: EmployeesTable;
  membership_invitations: MembershipInvitationsTable;
  customers: CustomersTable;
  customer_identities: CustomerIdentitiesTable;
  customer_merges: CustomerMergesTable;
  customer_sources: CustomerSourcesTable;
  customer_ownerships: CustomerOwnershipsTable;
  customer_contributions: CustomerContributionsTable;
  customer_ownership_transfer_approvals: CustomerOwnershipTransferApprovalsTable;
  tasks: TasksTable;
  task_evidence_links: TaskEvidenceLinksTable;
  customer_tags: CustomerTagsTable;
  task_follow_ups: TaskFollowUpsTable;
  employee_share_codes: EmployeeShareCodesTable;
  employee_share_code_events: EmployeeShareCodeEventsTable;
  employee_lead_pool_entries: EmployeeLeadPoolEntriesTable;
  employee_nurture_profiles: EmployeeNurtureProfilesTable;
  employee_nurture_touchpoints: EmployeeNurtureTouchpointsTable;
  task_reminders: TaskRemindersTable;
  notification_logs: NotificationLogsTable;
  employee_notification_preferences: EmployeeNotificationPreferencesTable;
  employee_notifications: EmployeeNotificationsTable;
  customer_orders: CustomerOrdersTable;
  evidence_files: EvidenceFilesTable;
  verification_codes: VerificationCodesTable;
  connector_results: ConnectorResultsTable;
  page_templates: PageTemplatesTable;
  page_template_versions: PageTemplateVersionsTable;
  page_modules: PageModulesTable;
  external_actions: ExternalActionsTable;
  external_action_events: ExternalActionEventsTable;
  consumer_action_redirect_events: ConsumerActionRedirectEventsTable;
  consumer_process_accesses: ConsumerProcessAccessesTable;
  consumer_profile_accesses: ConsumerProfileAccessesTable;
  workflow_definitions: WorkflowDefinitionsTable;
  workflow_versions: WorkflowVersionsTable;
  workflow_steps: WorkflowStepsTable;
  workflow_instances: WorkflowInstancesTable;
  workflow_instance_steps: WorkflowInstanceStepsTable;
  discovery_channels: DiscoveryChannelsTable;
  discovery_channel_merchants: DiscoveryChannelMerchantsTable;
  business_circles: BusinessCirclesTable;
  business_circle_merchants: BusinessCircleMerchantsTable;
  merchant_locations: MerchantLocationsTable;
  store_services: StoreServicesTable;
  store_benefits: StoreBenefitsTable;
  store_content_items: StoreContentItemsTable;
  consumer_action_events: ConsumerActionEventsTable;
  customer_export_requests: CustomerExportRequestsTable;
  ai_suggestions: AiSuggestionsTable;
}
