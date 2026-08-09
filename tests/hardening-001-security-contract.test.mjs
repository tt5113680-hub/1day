import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (file) => readFileSync(`apps/api/src/${file}`, 'utf8');

test('customer export download remains server-authorized, tenant-scoped and non-sniffable', () => {
  const controller = source('management-customer-assets.controller.ts');
  const service = source('management-customer-assets.service.ts');
  assert.match(controller, /authorization\.require\(authorization, 'tenant\.manage', tenant\)/);
  assert.match(controller, /'x-content-type-options', 'nosniff'/);
  assert.match(service, /where id=\$1 and tenant_id=\$2 and status='approved'/);
  assert.match(service, /customer\.export_downloaded/);
});

test('evidence-file download requires evidence permission and tenant-scoped storage lookup', () => {
  const controller = source('result-evidence.controller.ts');
  const service = source('result-evidence.service.ts');
  assert.match(controller, /authorization\.require\(authorization, 'evidence\.read', tenantId\)/);
  assert.match(controller, /'content-disposition', 'attachment; filename="evidence"'/);
  assert.match(controller, /'x-content-type-options', 'nosniff'/);
  assert.match(service, /where id=\$1 and tenant_id=\$2 and status=\$3 and deleted_at is null/);
});

test('non-public controller families cannot bypass AuthorizationService', () => {
  const protectedControllers = [
    'organization.controller.ts',
    'customer.controller.ts',
    'task.controller.ts',
    'workflow.controller.ts',
    'management-customer-assets.controller.ts',
    'result-evidence.controller.ts',
    'platform-tenant.controller.ts',
    'channel-merchant-onboarding.controller.ts',
    'circle-merchant.controller.ts',
  ];
  for (const controller of protectedControllers) {
    assert.match(source(controller), /require\(|requirePlatform\(/, controller);
  }
});

test('access-token claims require an active, unrevoked persistent session', () => {
  const auth = source('auth.service.ts');
  assert.match(
    auth,
    /auth_sessions s join tenants t on t\.id=s\.tenant_id and t\.status='active' and t\.deleted_at is null/,
  );
  assert.match(
    auth,
    /s\.id=\$1 and s\.user_id=\$2 and s\.tenant_id=\$3 and s\.status='active' and s\.revoked_at is null and s\.expires_at>now\(\)/,
  );
});
