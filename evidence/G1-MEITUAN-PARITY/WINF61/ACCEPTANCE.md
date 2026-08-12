# G1-W∞-61 Platform 平台总览 真实数据深页密度 densify（平台面）

- slice: `G1-R-PLATFORM-DASHBOARD-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/dashboard` 平台总览 真实数据深页分布 toward Meituan platform/agent backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接平台面 `/p/agents`（W∞-52）`/p/tenants`（W∞-53）`/p/channels`（W∞-54）`/p/business-circles`（W∞-55）`/p/outbox`（W∞-56）`/p/security-audit`（W∞-57）`/p/connectors`（W∞-58）`/p/templates`（W∞-59）与商圈面 `/bc/dashboard`（W∞-60）后，本刀把平台主总览 `/p/dashboard` 补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台。全部分布由 API 现场查询的**真实平台档案行**推导，禁止假 BI：

- **API（`apps/api/src/platform-dashboard.service.ts`）**：`GET /api/v1/platform/dashboard`（已有 `requirePlatform`+`x-request-id` 校验不变）在既有 metrics/risks/system 基础上**新增返回真实档案行**（仅查询既有表，零 schema/migration 变更）：
  - `tenants[]`：`select t.status, coalesce(s.plan,'starter') plan, coalesce(s.risk_level,'low') risk_level from tenants t left join platform_tenant_settings s ...`（真实租户行 → 状态/套餐/风险等级）；
  - `channels[]`：`select coalesce(platform,'(未指定)') platform, status from external_actions ...`（真实渠道行，经 businessLabel 映射中文）；
  - `outbox[]`：`select event_type, aggregate_type, attempts, tenant_id from outbox_events where status='needs_attention' ... limit 100`（真实待投递死信行）；
  - `signals[]`：`select event_code as key, count(*)::int count from entry_funnel_events where occurred_at >= now()-interval '30 days' group by event_code`（**L0–L2** 入口痕迹聚合到平台面，仅观看/访问/跳转/停留/分享等入口行为，不碰成交金额）。
- **`/p/dashboard`（平台总览）**：保留既有黄顶栏 `topBar`（`推广员工具 · 平台总览` + 右上「刷新」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 `跨租户入口信号与系统状态` + 诚实描述) + 常用功能格 + 平台指标 + 风险队列/系统状态，新增白卡概况条 summaryStrip(租户/渠道/30 天入口痕迹/Outbox 死信) + 白卡分布面板 `aria-label="平台运营分布"`，宽度百分比 `barWidth(总数, b.value)` 由真实行推导，空数据「暂无记录」——
  - 租户状态分布(按真实 `tenants[].status` 开通中/已暂停)；
  - 套餐分布(按真实 `plan` 起步版/成长版/企业版，频次降序)；
  - 风险等级分布(按真实 `risk_level` 低/中/高)；
  - 渠道平台分布(按真实 `channels[].platform` 经 `businessLabel` 中文映射，频次降序)；
  - 入口痕迹分布(按真实 `signals[]` event_code 经 eventLabel 中文，仅 L0–L2，频次降序)；
  - Outbox 死信状态分布(按真实 `outbox[].eventType`，未分类兜底，频次降序)；
  - 死信重试分布(按真实 `outbox[].attempts` 分桶 首次失败 1/多次重试 2-5/已达上限 6+)。
- **`page.module.css`**：新增 `.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management MPC 深页及平台面 `/p/*` 系列共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有真实平台档案行（`source=local`），入口痕迹仅 L0–L2、Outbox 按真实待投递事件行，新增 honest 底注「以上分布全部由已抓取平台档案行现场推导(source=local)：租户状态、套餐、风险等级由真实租户行映射；渠道平台由真实 external_actions 行经 businessLabel 映射；入口痕迹仅 L0–L2；Outbox 死信按真实待投递事件行统计。不含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据」；工具身份眉标(`推广员工具 · 平台总览`) + loading/forbidden/error/empty 全状态 + `data-testid="platform-dashboard"` + 常用功能格 + 平台指标 + 风险队列/系统状态全继承。无 schema/DB migration 变更（仅查询既有表），不复活 consumer_orders / 本平台下单/收单；入口痕迹不碰成交金额。

## Files

- `apps/api/src/platform-dashboard.service.ts`(为 `/p/dashboard` 追加返回真实 tenants/channels/outbox/signals 档案行，仅查询既有表，`requirePlatform` 校验不变)
- `apps/platform-web/app/p/dashboard/page.tsx`(新增 summaryStrip + 平台运营分布 + 真实数据推导与事件映射；保留常用功能格/平台指标/风险队列/系统状态既有交互 + `data-testid="platform-dashboard"`)
- `apps/platform-web/app/p/dashboard/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠 + 灰底白卡画布)
- `tests/g1-winf61-platform-dashboard-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与 API 真实行查询

## Verify

```text
node --test tests/g1-winf61-platform-dashboard-deep.test.mjs         # 4/4
node --test tests/g1-winf61-platform-dashboard-deep.test.mjs tests/g1-winf36-platform-dashboard-visual.test.mjs  # 8/8 (含 W∞-36 回归)
node --test tests/g1-winf*.test.mjs                                  # 196/196
pnpm --filter @oneday/api typecheck                                  # PASS
pnpm --filter @oneday/platform-web typecheck                         # PASS
pnpm build                                                           # 20/20 (含 /p/dashboard)
pnpm test:unit                                                       # 47 passed (2 pre-existing token baseline failures 照旧)
npx prettier --check <new/changed>                                   # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-61 无关(clean 基线复现一致，同 W∞-44~60 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 prettier clean。

## Gates

- typecheck PASS(api + platform-web)；`pnpm build` 20/20（platform-web 含 `/p/dashboard` 路由）；
- `g1-winf61` 4/4；`g1-winf*.test.mjs` 196/196（含 `g1-winf36` 平台总览回归 4/4）；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有平台档案行(租户/channel/outbox/entry_funnel L0–L2)推导，禁止假 BI；入口痕迹不碰成交金额；不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
