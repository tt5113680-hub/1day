import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const service = () => read('apps/api/src/management-commerce.service.ts');
const controller = () => read('apps/api/src/management-commerce.controller.ts');
const page = () => read('apps/management-web/app/m/reviews/page.tsx');
const css = () => read('apps/management-web/app/m/_commerce.module.css');
const migration = () => read('packages/database/src/migrations/068_reviews_reply.ts');
const migrator = () => read('packages/database/src/migrator.ts');

test('G1-W114: migration adds reply trace columns on store_reviews', () => {
  const m = migration();
  assert.match(m, /addColumn\('reply_text', 'varchar\(1000\)'\)/);
  assert.match(m, /addColumn\('replied_by', 'uuid'\)/);
  assert.match(m, /addColumn\('replied_at', 'timestamptz'\)/);
  assert.doesNotMatch(m, /amount/);
  const mig = migrator();
  assert.match(mig, /068_reviews_reply/);
});

test('G1-W114: controller exposes review list filter + queue + reply write', () => {
  const c = controller();
  assert.match(c, /@Get\('reviews'\)/);
  assert.match(c, /@Get\('reviews\/queue'\)/);
  assert.match(c, /@Post\('reviews\/:id\/reply'\)/);
  assert.match(c, /@Query\('reply'\)/);
  assert.match(c, /@Query\('rating'\)/);
  assert.match(c, /requireReviewStoreWrite/);
  assert.match(c, /requireStoreWriteScope/);
  assert.match(c, /reviewQueue/);
  assert.match(c, /replyToReview/);
});

test('G1-W114: service builds reply-filtered list + pending queue + idempotent reply write with audit/outbox', () => {
  const s = service();
  assert.match(s, /async reviewQueue/);
  assert.match(s, /async replyToReview/);
  assert.match(s, /reply_status/);
  assert.match(s, /pendingQueue/);
  assert.match(s, /byRating/);
  assert.match(s, /store_reviews/);
  assert.match(s, /reviewReceipt/);
  assert.match(s, /withIdempotency/);
  assert.match(s, /reviews\.replied/);
  assert.match(s, /reviews\.replied\.v1/);
  assert.match(s, /audit_logs/);
  assert.match(s, /outbox_events/);
  assert.match(s, /idempotency_keys/);
});

test('G1-W114: management reviews page renders reply queue, filter chips + reply editor', () => {
  const p = page();
  const m = css();
  assert.match(p, /待回复队列/);
  assert.match(p, /待回复/);
  assert.match(p, /已回复/);
  assert.match(p, /reviews\/queue/);
  assert.match(p, /reviews\/\$\{reviewId\}\/reply/);
  assert.match(p, /idempotency-key/);
  assert.match(p, /replyDraft/);
  assert.match(p, /submitReply/);
  assert.match(p, /写回复|回复/);
  assert.match(p, /reply_rate|replyRate/);
  assert.match(m, /\.queueItem/);
  assert.match(m, /\.replyTextarea/);
  assert.match(m, /\.chips/);
  assert.match(m, /\.chipActive/);
  assert.match(m, /\.replyCard/);
  assert.match(m, /\.replyInline/);
});

test('G1-W114: honest boundaries retained (local reply trace only, no third-party reply / no fake BI)', () => {
  const p = page();
  const s = service();
  assert.match(p, /source=local/);
  assert.match(p, /本地试点/);
  assert.match(p, /不接美团评价接口|不接第三方评价/);
  assert.match(p, /不代第三方回写/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不伪造第三方评分|不伪造第三方/);
  assert.match(s, /source=local|local reply trace/);
  assert.match(s, /No third-party/);
  assert.match(s, /does not fabricate/);
  assert.doesNotMatch(s, /Math\.random/);
  assert.doesNotMatch(p, /Math\.random/);
  assert.doesNotMatch(p, /mockMetrics/);
});
