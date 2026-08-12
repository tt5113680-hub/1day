# G1-W∞-57 Platform 平台安全审计 真实数据深页密度 densify（平台面）

- slice: `G1-R-PLATFORM-SECURITY-AUDIT-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/security-audit` 风险信号/越权审计 真实数据深页分布 toward Meituan platform backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45~51）+ 平台面 `/p/agents`（W∞-52）`/p/tenants`（W∞-53）`/p/channels`（W∞-54）`/p/business-circles`（W∞-55）`/p/outbox`（W∞-56，平台投递死信运维 SYS-4）后，本刀续平台面 `/p/security-audit`（平台安全审计）的真实数据分布洞察，全部由已抓取的真实平台安全审计档案行（`risks`: `severity`/`kind`/`review_status`；`events`: `action`/`resource_type`/`correlation_id`/`created_at`）现场推导，禁止假 BI：

- **`/p/security-audit`（平台安全审计）**：视觉/IA densify toward 美团平台/代理后台 —— 移除页面级 `AdminPageHeader` / `Card` / `ONEDAY` 眉标，新增黄顶栏 `topBar`（`推广员工具 · 平台安全审计` + 右上「刷新审计」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 + 诚实描述) + 白卡概况条 summaryStrip(风险信号/待处置/已确认处置/最高风险) + 白卡分布面板 `aria-label="平台安全分布"`，宽度百分比 `barWidth(risks.length, b.value)` / `barWidth(events.length, b.value)` 由真实行推导，空数据「暂无记录」——
  - 严重度分布(按真实 `risk.severity` 经 businessLabel 中文，频次降序)；
  - 风险类型分布(按真实 `risk.kind` 经 businessLabel 中文，频次降序)；
  - 处置状态分布(按真实 `risk.review_status` 已确认处置/待处置)；
  - 事件类型分布(按真实 `event.action` 经 eventCopy 中文，频次降序)；
  - 资源类型分布(按真实 `event.resource_type` 经 businessLabel 中文，频次降序)。
- **`page.module.css`**：新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠（与 Management MPC 及 `/p/agents` `/p/tenants` `/p/channels` `/p/business-circles` `/p/outbox` 共享同一视觉语言）。

诚实边界全保留：全部指标派生自既有 `source=local` 风险与安全事件档案行，新增 honest 底注「以上分布全部由已抓取平台安全审计档案行现场推导(source=local)：风险严重度、风险类型、处置状态、安全事件类型与资源类型；处置仅记录本地审计与事件，连接器观察不会调用美团/抖音等外部平台；不包含本平台收款、非本平台下单」；工具身份眉标(`推广员工具 · 平台安全审计`) + loading/forbidden/error/empty 全状态 + 待审查风险信号 + 安全事件链 + 确认处置/更新处置(高风险二次操作 + 审计/Outbox 写入) + 安全边际交互全继承(`data-testid="platform-security-audit"`)。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/p/security-audit/page.tsx`(移除 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 + heroCard + summaryStrip + 平台安全分布 + 真实数据推导；保留待审查风险信号/安全事件链/确认处置交互与 e2e `data-testid`)
- `apps/platform-web/app/p/security-audit/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠 + 灰底白卡画布)
- `tests/g1-winf57-platform-security-audit-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test tests/g1-winf57-platform-security-audit-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs             # 180/180
pnpm --filter @oneday/platform-web typecheck                         # PASS
pnpm --filter @oneday/platform-web build                             # PASS (含 /p/security-audit)
pnpm test:unit                                                       # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                           # clean
npx prettier --write <changed files>                                 # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-57 无关(clean 基线复现一致，同 W∞-44~56 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf57` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；`pnpm --filter @oneday/platform-web build` PASS（platform-web 含 `/p/security-audit` 路由）；
- `g1-winf57` 4/4；`g1-winf*.test.mjs` 180/180；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有平台安全审计档案行推导，禁止假 BI；处置只记本地审计与事件，连接器观察不调美团/抖音实时；不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
