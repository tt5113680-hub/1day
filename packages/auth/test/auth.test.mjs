import assert from 'node:assert/strict';
import test from 'node:test';

const auth = await import('../dist/index.js');

test('scrypt password hashes verify without accepting an incorrect password', async () => {
  const hash = await auth.hashPassword('CorrectHorseBatteryStaple!');
  assert.equal(await auth.verifyPassword('CorrectHorseBatteryStaple!', hash), true);
  assert.equal(await auth.verifyPassword('incorrect-password', hash), false);
});

test('access tokens reject tampering and expiry', () => {
  const claims = { sub: 'user-1', tenantId: 'tenant-1', sessionId: 'session-1', exp: 2_000 };
  const token = auth.signAccessToken(claims, 'test-secret');
  assert.deepEqual(auth.verifyAccessToken(token, 'test-secret', 1_000), claims);
  assert.equal(auth.verifyAccessToken(`${token}x`, 'test-secret', 1_000), null);
  assert.equal(auth.verifyAccessToken(token, 'test-secret', 2_000), null);
});
