import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const seed = readFileSync(join(import.meta.dirname, '../scripts/local-human-pilot-seed.mjs'), 'utf8');

assert.match(seed, /insert into data_scopes/, 'human-pilot seed must provision data_scopes');
assert.match(seed, /'channel',\s*ids\.channel/, 'channel operator needs channel data_scope');
assert.match(seed, /'circle',\s*ids\.circle/, 'circle operator needs circle data_scope');

const platformChannel = readFileSync(
  join(import.meta.dirname, '../apps/api/src/platform-channel.controller.ts'),
  'utf8',
);
assert.match(platformChannel, /channel\.read/, 'platform channels list must allow channel.read');

console.log('g1-winf106-human-pilot-channel-scopes: 4/4 PASS');
