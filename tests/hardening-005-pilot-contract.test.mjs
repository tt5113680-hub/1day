import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const documents = {
  deployment: readFileSync('docs/PILOT_DEPLOYMENT.md', 'utf8'),
  administrator: readFileSync('docs/PILOT_ADMIN_GUIDE.md', 'utf8'),
  limitations: readFileSync('docs/PILOT_LIMITATIONS.md', 'utf8'),
  checklist: readFileSync('docs/PILOT_ACCEPTANCE_CHECKLIST.md', 'utf8'),
};

test('pilot delivery package documents controlled deployment and readiness', () => {
  assert.match(documents.deployment, /pnpm\.cmd db:migrate/);
  assert.match(documents.deployment, /GET \/api\/v1\/health/);
  assert.match(documents.deployment, /database: "ready"/);
  assert.match(documents.deployment, /CORS_ORIGINS/);
  assert.match(documents.deployment, /never use a permissive production CORS policy/);
});

test('pilot delivery package prevents reuse of deterministic demo access', () => {
  assert.match(documents.administrator, /admin@system\.local/);
  assert.match(documents.administrator, /ChangeMe123!/);
  assert.match(
    documents.administrator,
    /Never use it in a shared, hosted, or customer-facing environment/,
  );
  assert.match(documents.administrator, /401/);
  assert.match(documents.administrator, /403/);
});

test('pilot delivery package states MVP boundaries and verifiable handoff controls', () => {
  assert.match(
    documents.limitations,
    /not a full self-built marketplace, payment, cashier, call-center, OA, ERP, or replacement CRM/,
  );
  assert.match(
    documents.limitations,
    /does not automatically send direct messages, publish social posts/,
  );
  assert.match(documents.limitations, /never overwrites or deletes a database/);
  assert.match(documents.checklist, /cross-tenant request is rejected/);
  assert.match(documents.checklist, /recovery clone was rehearsed/);
  assert.match(documents.checklist, /HOLD/);
});
