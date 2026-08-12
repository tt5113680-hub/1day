# G1-W∞-59 Platform 平台模板治理 真实数据深页密度 densify（平台面）

- slice: `G1-R-PLATFORM-TEMPLATES-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/templates` 固定组件、行业配置与受控发布 真实数据深页分布 toward Meituan platform backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45~51）+ 平台面 `/p/agents`（W∞-52）`/p/tenants`（W∞-53）`/p/channels`（W∞-54）`/p/business-circles`（W∞-55）`/p/outbox`（W∞-56）`/p/security-audit`（W∞-57）`/p/connectors`（W∞-58）后，本刀续平台面 `/p/templates`（平台模板组件 PAGE-P-006）的真实数据分布洞察，全部由已抓取的真实平台模板档案行（`target`/`published_version_id`/`industry_config`/`store_name`/`live_version_id`/`version`）现场推导，禁止假 BI：

- **`/p/templates`（平台模板治理）**：视觉/IA densify toward 美团平台/代理后台 —— 移除页面级 `AdminPageHeader`/`Card`/`ONEDAY` 眉标，新增黄顶栏 `topBar`（`推广员工具 · 平台模板治理` + 右上「刷新目录」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 + 诚实描述) + 白卡概况条 summaryStrip(模板/目标页面/已发布/绑定数字门店) + 白卡分布面板 `aria-label="平台模板分布"`，宽度百分比 `barWidth(templates.length, b.value)` / `barWidth(boundCount, b.value)` 由真实行推导，空数据「暂无记录」——
  - 模板目标分布(按真实 `target` 映射 消费者/员工/管理，频次降序)；
  - 发布状态分布(由真实 `live_version_id`/`published_version_id` 推导 数字门店已发布/模板已发布未绑定/尚未发布)；
  - 行业配置分布(按真实 `industry_config.industry` 映射 餐饮/美业/零售，未配置行业兜底「未配置行业」，频次降序)；
  - 绑定数字门店分布(仅统计有 `live_version_id` 的模板，按真实 `store_name`，未绑定门店兜底)；
  - 版本演进分布(按真实 `version` 分桶 首版 1/演进 2-5/多次演进 6+)。
- **`page.module.css`**：新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest/.head`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠（与 Management MPC 及 `/p/agents` `/p/tenants` `/p/channels` `/p/business-circles` `/p/outbox` `/p/security-audit` `/p/connectors` 共享同一视觉语言）。

诚实边界全保留：全部指标派生自既有 `source=local` 平台模板档案行，新增 honest 底注「以上分布全部由已抓取模板档案行现场推导(source=local)：模板目标、发布状态、行业配置、绑定数字门店与版本演进；仅记录受控模板治理，未接美团/抖音实时投放，不包含本平台收款、非本平台下单；本地试点记录」；工具身份眉标(`推广员工具 · 平台模板治理`) + loading/forbidden/error/empty 全状态 + 新建平台模板/已持久化模板/预览模块/实时预览与发布/发布当前版本交互全继承(`data-testid="platform-templates"`)。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/p/templates/page.tsx`(移除 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 + heroCard + summaryStrip + 平台模板分布 + 真实数据推导；保留新建草稿/预览模块/实时预览与发布交互与 e2e `data-testid`)
- `apps/platform-web/app/p/templates/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠 + 灰底白卡画布)
- `tests/g1-winf59-platform-templates-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test tests/g1-winf59-platform-templates-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs         # 188/188
pnpm --filter @oneday/platform-web typecheck                     # PASS
pnpm --filter @oneday/platform-web build                         # PASS (含 /p/templates)
pnpm build                                                       # 20/20
pnpm test:unit                                                   # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                       # clean
npx prettier --write <changed files>                             # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-59 无关(clean 基线复现一致，同 W∞-14~58 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf59` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；`pnpm --filter @oneday/platform-web build` PASS（platform-web 含 `/p/templates` 路由）；`pnpm build` 20/20；
- `g1-winf59` 4/4；`g1-winf*.test.mjs` 188/188；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有平台模板档案行推导，禁止假 BI；仅记录受控模板治理，未接美团/抖音实时投放；不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
