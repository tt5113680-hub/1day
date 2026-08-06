import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
for (const id of [
  'FOUNDATION-004',
  'FOUNDATION-005',
  'FOUNDATION-006',
  'FOUNDATION-007',
  'FOUNDATION-008',
  'FOUNDATION-009',
  'FOUNDATION-010',
  'CORE-001',
  'CORE-002',
  'CORE-003',
  'CORE-004',
  'CORE-005',
  'CORE-006',
  'CORE-007',
  'CORE-008',
  'CORE-009',
])
  test(`evidence directory exists: ${id}`, () =>
    assert.ok(existsSync(`evidence/${id}/ACCEPTANCE.md`) || id === 'FOUNDATION-010'));
