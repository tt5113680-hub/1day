# G1-W∞-56 Platform 平台投递队列 真实数据深页密度 densify（平台面 SYS-4）

- slice: `G1-R-PLATFORM-OUTBOX-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/outbox` 投递死信 真实数据深页分布 toward Meituan platform backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45~51）+ 平台面 `/p/agents`（W∞-52）`/p/tenants`（W∞-53）`/p/channels`（W∞-54）`/p/business-circles`（W∞-55）后，本刀续平台面 `/p/outbox`（平台投递死信运维，SYS-4）的真实数据分布洞察，全部由已抓取的真实平台 Outbox 死信档案行（`DeadLetter[]`: `eventType`/`aggregateType`/`tenantId`/`attempts`/`lastError`/`updatedAt`）现场推导，禁止假 BI：

- **`/p/outbox`（平台投递队列）**：视觉/IA densify toward 美团平台/代理后台 —— 移除页面级 `AdminPageHeader` / `Card` / `ONEDAY` 眉标，新增黄顶栏 `topBar`（`推广员工具 · 平台投递队列` + 右上「刷新」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 + 诚实描述) + 白卡概况条 summaryStrip(死信记录/涉及租户/聚合对象/已达上限) + 白卡分布面板 `aria-label="平台投递分布"`，宽度百分比由真实行 `barWidth(items.length, b.value)` 推导，空数据「暂无记录」——
  - 事件类型分布(按真实 `item.eventType` 频次降序)；
  - 聚合对象分布(按真实 `item.aggregateType` 频次降序)；
  - 重试次数分布(按真实 `item.attempts` 分桶 → 首次失败 1/多次重试 2-5/已达上限 6+)；
  - 租户分布(按真实 `item.tenantId` 前缀 `XXXXXXXX…` 匿名频次降序)。
- **`page.module.css`**：新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠（与 Management MPC 及 `/p/agents` `/p/tenants` `/p/channels` `/p/business-circles` 共享同一视觉语言）。

诚实边界全保留：Outbox 是 **平台投递与同步队列，不是消费者成交/平台收款/本平台下单**；全部指标派生自既有 `source=local` 死信档案行，新增 honest 底注「以上分布全部由已抓取平台投递死信档案行现场推导(source=local)：事件类型、聚合对象、重试次数与涉及租户；重放不会调用美团/抖音等外部平台，仅恢复本地投递状态；Outbox 是平台投递与同步队列，不包含本平台收款、非本平台下单；本地试点记录」；工具身份眉标(`推广员工具 · 平台投递队列`) + loading/forbidden/error/empty 全状态 + 死信列表 + 重放 + 运维边界交互全继承(`data-testid="platform-outbox"`)。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/p/outbox/page.tsx`(移除 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 + heroCard + summaryStrip + 平台投递分布 + 真实数据推导；保留死信队列/重放/运维边界交互)
- `apps/platform-web/app/p/outbox/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠 + 灰底白卡画布)
- `tests/g1-winf56-platform-outbox-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test tests/g1-winf56-platform-outbox-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs     # 176/176
pnpm --filter @oneday/platform-web typecheck                 # PASS
pnpm build                                                   # 20/20 (platform-web 含 /p/outbox)
pnpm test:unit                                               # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                   # clean
npx prettier --check <changed files>                         # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-56 无关(clean 基线复现一致，同 W∞-44~55 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf56` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；`pnpm build` 20/20（platform-web 含 `/p/outbox` 路由）；
- `g1-winf56` 4/4；`g1-winf*.test.mjs` 176/176；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有平台投递死信档案行推导，禁止假 BI；Outbox 平台投递/同步队列不碰消费者成交/钱/销/管店；重放仅恢复本地投递状态，不调美团/抖音实时；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
