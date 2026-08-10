import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolvePlatformShellAccess,
  shellModeAllows,
} from '../packages/contracts/dist/index.js';

test('SYS-28: channel-only operators cannot enter platform shell mode', () => {
  const access = resolvePlatformShellAccess(['channel.read', 'channel.manage']);
  assert.deepEqual(access.allowed, ['channel']);
  assert.equal(access.preferred, 'channel');
  assert.equal(access.homeHref, '/ch/dashboard');
  assert.equal(shellModeAllows('platform', ['channel.read']), false);
  assert.equal(shellModeAllows('channel', ['channel.read']), true);
});

test('SYS-28: circle-only operators prefer business-circle home', () => {
  const access = resolvePlatformShellAccess(['circle.manage']);
  assert.deepEqual(access.allowed, ['circle']);
  assert.equal(access.homeHref, '/bc/dashboard');
  assert.equal(shellModeAllows('platform', ['circle.manage']), false);
});

test('SYS-28: platform admin retains all three shell modes', () => {
  const access = resolvePlatformShellAccess(['platform.read', 'platform.manage']);
  assert.deepEqual(access.allowed, ['platform', 'channel', 'circle']);
  assert.equal(access.preferred, 'platform');
  assert.equal(access.homeHref, '/p/dashboard');
});
