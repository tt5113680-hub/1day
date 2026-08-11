import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-20: third-party platform-naming consistency (saabei/external) across Consumer surfaces', () => {
  const paint = read('packages/storefront-renderer/src/paint.tsx');
  const channel = read('apps/consumer-web/app/c/stores/[id]/channel.tsx');
  const service = read('apps/consumer-web/app/c/services/[id]/service.tsx');
  const storefrontCss = read('packages/storefront-renderer/storefront.css');

  // shared renderer gives saabei its own glyph, business name and mark class
  assert.match(paint, /if \(platformType === 'saabei'\) return '扫';/);
  assert.match(paint, /if \(platformType === 'saabei'\) return '扫呗平台';/);
  assert.match(paint, /storefrontPlatformMarkClass/);
  assert.match(
    paint,
    /platformType === 'meituan' \|\| platformType === 'douyin' \|\| platformType === 'saabei'/,
  );

  // channel group-buy naming + glyphs now explicit for saabei / external
  assert.match(channel, /platform === 'saabei'\s*\n\s*\?\s*'扫呗平台'\s*\n\s*:\s*'其他平台·外链'/);
  assert.match(channel, /platformType === 'saabei'\s*\n\s*\?\s*'扫'\s*\n\s*:\s*'选'/);
  assert.match(channel, /platform === 'saabei' \? '扫' : '选'/);

  // service detail accepts and names saabei
  assert.match(service, /'saabei' \| 'external'/);
  assert.match(service, /type === 'saabei'\s*\n\s*\?\s*'扫呗平台'\s*\n\s*:\s*'其他平台·外链'/);

  // honest boundary retained: no native checkout introduced anywhere
  assert.match(channel, /不在此下单/);
  assert.match(service, /非本平台下单/);

  // storefront.css defines a saabei mark color + class
  assert.match(storefrontCss, /--od-sf-platform-saabei:/);
  assert.match(storefrontCss, /\.od-sf-platform-mark--saabei \{/);
});
