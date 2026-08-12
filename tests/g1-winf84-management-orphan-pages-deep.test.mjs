import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const mg = (p) => read(`apps/management-web/app/m/${p}/page.tsx`);
const css = (p) => read(`apps/management-web/app/m/${p}/page.module.css`);

const pages = {
  permissionAudit: 'permission-audit',
  connectors: 'connectors',
  externalActions: 'external-actions',
  aiSuggestions: 'ai-suggestions',
};

test('W∞-84: all four orphan Management MPC pages adopt Meituan-parity yellow top bar + gray canvas + hero', () => {
  for (const [name, path] of Object.entries(pages)) {
    const p = mg(path);
    const c = css(path);
    assert.match(p, /topBar/, `${name} topBar`);
    assert.match(p, /topBarRefresh/, `${name} topBarRefresh`);
    assert.match(p, /heroCard/, `${name} heroCard`);
    assert.match(p, /<h1>/, `${name} h1 hero`);
    assert.match(c, /background:\s*#f5f5f5/, `${name} gray canvas`);
    assert.match(c, /#ffd100|#ffe14d/, `${name} yellow gradient`);
    assert.match(c, /\.summaryStrip/, `${name} summaryStrip css`);
    assert.match(c, /\.distribution/, `${name} distribution css`);
    assert.match(c, /\.panelBlock/, `${name} panelBlock css`);
    assert.match(c, /\.barFill/, `${name} barFill css`);
    assert.match(c, /\.barTrack/, `${name} barTrack css`);
    assert.match(c, /\.barRow/, `${name} barRow css`);
    assert.match(c, /\.barValue/, `${name} barValue css`);
    assert.match(c, /\.barLabel/, `${name} barLabel css`);
    assert.match(c, /\.barEmpty/, `${name} barEmpty css`);
    assert.match(c, /\.honest/, `${name} honest css`);
    assert.match(c, /@media \(max-width: 900px\)/, `${name} responsive`);
    assert.doesNotMatch(p, /AdminPageHeader/, `${name} no AdminPageHeader`);
    assert.doesNotMatch(p, /eyebrow=/, `${name} no eyebrow prop`);
  }
});

test('W∞-84: /m/permission-audit adds real-data 操作审计分布 derived from audit rows', () => {
  const p = mg('permission-audit');
  assert.match(p, /推广员工具 · 操作审计/);
  assert.match(p, /data-testid="management-permission-audit"/);
  assert.match(p, /aria-label="操作审计概况"/);
  assert.match(p, /aria-label="审计摘要"/);
  assert.match(p, /aria-label="操作审计分布"/);
  assert.match(p, /审计记录/);
  assert.match(p, /权限变更/);
  assert.match(p, /数据导出/);
  assert.match(p, /风险信号/);
  assert.match(p, /kindDist/);
  assert.match(p, /resourceDist/);
  assert.match(p, /actorDist/);
  for (const label of ['类型分布', '资源类型分布', '操作人分布']) {
    assert.match(p, new RegExp(`<h3>${label}</h3>`));
  }
  assert.match(p, /countBy\(data\.records/);
  assert.match(p, /barWidth\(total, item\.value\)/);
  assert.match(p, /暂无记录/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /请使用具备推广员工具权限的账号。/);
  assert.match(p, /permission-audit-table/);
  assert.match(p, /permission-audit-modal/);
});

test('W∞-84: /m/connectors adds real-data 连接配置分布 derived from connector rows', () => {
  const p = mg('connectors');
  assert.match(p, /推广员工具 · 连接配置/);
  assert.match(p, /data-testid="management-connectors"/);
  assert.match(p, /aria-label="连接配置概况"/);
  assert.match(p, /aria-label="连接器概况"/);
  assert.match(p, /aria-label="连接配置分布"/);
  assert.match(p, /platformDist/);
  assert.match(p, /statusDist/);
  assert.match(p, /logStatusDist/);
  for (const label of ['连接器平台分布', '授权状态分布', '运行日志状态分布']) {
    assert.match(p, new RegExp(`<h3>${label}</h3>`));
  }
  assert.match(p, /countBy\(connectors/);
  assert.match(p, /connector-delivery-boundary/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不会调用/);
});

test('W∞-84: /m/external-actions adds real-data 外链服务分布 derived from action rows', () => {
  const p = mg('external-actions');
  assert.match(p, /推广员工具 · 外链服务/);
  assert.match(p, /data-testid="management-external-actions"/);
  assert.match(p, /aria-label="外链服务概况"/);
  assert.match(p, /aria-label="外链服务分布"/);
  assert.match(p, /typeDist/);
  assert.match(p, /platformDist/);
  assert.match(p, /statusDist/);
  for (const label of ['动作类型分布', '平台命名分布', '状态分布']) {
    assert.match(p, new RegExp(`<h3>${label}</h3>`));
  }
  assert.match(p, /countBy\(actions/);
  assert.match(p, /external-action-create/);
  assert.match(p, /external-actions-catalog/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
});

test('W∞-84: /m/ai-suggestions adds real-data 作业建议分布 derived from suggestion rows', () => {
  const p = mg('ai-suggestions');
  assert.match(p, /推广员工具 · 作业建议/);
  assert.match(p, /data-testid="management-ai-suggestions"/);
  assert.match(p, /aria-label="作业建议概况"/);
  assert.match(p, /aria-label="作业建议分布"/);
  assert.match(p, /statusDist/);
  assert.match(p, /actionDist/);
  assert.match(p, /modelDist/);
  assert.match(p, /execDist/);
  for (const label of ['处理状态分布', '动作类型分布', '建议来源模型分布', '执行状态分布']) {
    assert.match(p, new RegExp(`<h3>${label}</h3>`));
  }
  assert.match(p, /countBy\(items/);
  assert.match(p, /把入口痕迹解读成可确认的下一步/);
  assert.match(p, /当入口异常或可优化信号进入系统后，建议会在此处出现。/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /请使用具备推广员工具权限的账号。/);
  assert.match(p, /正在校验建议来源、执行状态与工具授权。/);
});
