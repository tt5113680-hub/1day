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
}
