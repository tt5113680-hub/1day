# G1-W∞-58 Platform 平台连接器 真实数据深页密度 densify（平台面）

- slice: `G1-R-PLATFORM-CONNECTORS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/connectors` 定义租户授权与健康观察 真实数据深页分布 toward Meituan platform backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45~51）+ 平台面 `/p/agents`（W∞-52）`/p/tenants`（W∞-53）`/p/channels`（W∞-54）`/p/business-circles`（W∞-55）`/p/outbox`（W∞-56）`/p/security-audit`（W∞-57）后，本刀续平台面 `/p/connectors`（平台连接器 PAGE-P-007）的真实数据分布洞察，全部由已抓取的真实平台连接器档案行（`auth_mode`/`health_status`/`rate_limit_per_minute`/`authorizations[].status`+`count`/`logs[].status`）现场推导，禁止假 BI：

- **`/p/connectors`（平台连接器）**：视觉/IA densify toward 美团平台/代理后台 —— 移除页面级 `AdminPageHeader`/`Card`/`ONEDAY` 眉标，新增黄顶栏 `topBar`（`推广员工具 · 平台连接器` + 右上「刷新目录」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 + 诚实描述) + 白卡概况条 summaryStrip(连接器/运行正常/已授权租户/健康观察) + 白卡分布面板 `aria-label="平台连接器分布"`，宽度百分比 `barWidth(items.length, b.value)` / `barWidth(authCounts.total, b.value)` / `barWidth(totalLogs, b.value)` 由真实行推导，空数据「暂无记录」——
  - 授权方式分布(按真实 `auth_mode` 经 businessLabel 中文，频次降序)；
  - 健康状态分布(按真实 `health_status` 经 businessLabel 中文，频次降序)；
  - 租户授权分布(跨全部连接器 `authorizations`，按真实 `status` 经 businessLabel 中文、以其 `count` 加权，频次降序)；
  - 限流带宽分布(按真实 `rate_limit_per_minute` 分桶 基础带宽 ≤120/标准带宽 121-600/高频带宽 601+)；
  - 健康日志状态分布(跨全部连接器 `logs`，按真实 `logs[].status` 经 businessLabel 中文，频次降序)。
- **`page.module.css`**：新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠（与 Management MPC 及 `/p/agents` `/p/tenants` `/p/channels` `/p/business-circles` `/p/outbox` `/p/security-audit` 共享同一视觉语言）。

诚实边界全保留：全部指标派生自既有 `source=local` 连接器档案行，新增 honest 底注「以上分布全部由已抓取平台连接器档案行现场推导(source=local)：授权方式、健康状态、租户授权、限流带宽与健康日志状态；连接器仅记录意图与健康观察，观察不会调用美团/抖音等外部平台；不包含本平台收款、非本平台下单；本地试点记录」；工具身份眉标(`推广员工具 · 平台连接器`) + loading/forbidden/error/empty 全状态 + 定义连接器/租户授权汇总/记录健康观察交互 + `connector-delivery-boundary` 诚实投递边界 e2e hook 全继承(`data-testid="platform-connectors"`)。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/p/connectors/page.tsx`(移除 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 + heroCard + summaryStrip + 平台连接器分布 + 真实数据推导；保留定义连接器/租户授权汇总/记录健康观察交互与 e2e `data-testid`/`connector-delivery-boundary`)
- `apps/platform-web/app/p/connectors/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠 + 灰底白卡画布)
- `tests/g1-winf58-platform-connectors-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA
- `tests/e2e/platform-connectors.spec.ts`(随动：页面 h1 断言 `定义、租户授权…` → `连接器目录、租户授权与健康观察`)

## Verify

```text
node --test tests/g1-winf58-platform-connectors-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs         # 184/184
pnpm --filter @oneday/platform-web typecheck                     # PASS
pnpm --filter @oneday/platform-web build                         # PASS (含 /p/connectors)
pnpm build                                                       # 20/20
pnpm test:unit                                                   # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                       # clean
npx prettier --write <changed files>                             # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-58 无关(clean 基线复现一致，同 W∞-14~57 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf58` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；`pnpm --filter @oneday/platform-web build` PASS（platform-web 含 `/p/connectors` 路由）；`pnpm build` 20/20；
- `g1-winf58` 4/4；`g1-winf*.test.mjs` 184/184；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有平台连接器档案行推导，禁止假 BI；连接器仅记录意图与健康观察，观察不调美团/抖音实时；不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
