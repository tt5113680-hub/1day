# G1-W∞-53 Platform 租户管理 真实数据深页密度 densify（平台面）

- slice: `G1-R-PLATFORM-TENANTS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/tenants` 租户管理 真实数据深页密度 toward Meituan platform backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45/46/47/48/49/50/51）+ 平台面 `/p/agents`（W∞-52）后，本刀续平台面 `/p/tenants`（租户管理）的真实数据分布洞察，全部由已抓取的真实平台租户档案行（`items`: `status`/`plan`/`riskLevel`/`overdueTasks`/`quotas.users`）现场推导，禁止假 BI：

- **`/p/tenants`（平台租户管理）**：视觉/IA densify toward 美团平台/代理后台 —— 移除页面级 `AdminPageHeader`，新增黄顶栏 `topBar`（`推广员工具 · 平台租户管理` + 右上「刷新」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 + 诚实描述) + 白卡概况条 summaryStrip(租户/开通中/已暂停/高风险) + 白卡分布面板 `aria-label="平台租户运营分布"`，宽度百分比由真实行 `barWidth(items.length, b.value)` 推导，空数据「暂无记录」——
  - 租户状态分布(按真实 `status` → 开通中/已暂停)；
  - 套餐分布(按真实 `plan` → 起步版/成长版/企业版)；
  - 风险等级分布(按真实 `riskLevel` → 低风险/中风险/高风险)；
  - 逾期任务分布(按真实 `overdueTasks` 分桶 → 无逾期/轻负担 1-5/重负担 6+)；
  - 用户配额分布(按真实 `quotas.users` 分桶 → 用户配额 ≤10/11-50/51+)。
- **`page.module.css`**：新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management MPC 及 `/p/agents` 共享同一视觉语言)。

诚实边界全保留：租户是 **工具开通与整合经济体，不是消费者成交/平台收款**；全部指标派生自既有 `source=local` 档案行，新增 honest 底注「以上分布全部由已抓取平台租户档案行现场推导(source=local)：租户状态、套餐、风险等级、逾期任务与用户配额；租户是工具开通与整合经济体，不包含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据」；工具身份眉标(`推广员工具 · 平台租户管理`) + loading/forbidden/error 全状态 + 租户列表/生命周期(暂停/恢复 + SUSPEND/ACTIVATE 二次确认)/套餐/配额/风险等级编辑与保存交互全继承(`data-testid="platform-tenants"`)。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/p/tenants/page.tsx`(移除页面级 AdminPageHeader，新增黄顶栏 + heroCard + summaryStrip + 平台租户运营分布 + 真实数据推导)
- `apps/platform-web/app/p/tenants/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠)
- `tests/g1-winf53-platform-tenants-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA
- `tests/e2e/platform-tenants.spec.ts`(随动更新 heading 断言 `租户开通、暂停与经营边界` → `租户开通、暂停与工具边界`)

## Verify

```text
node --test tests/g1-winf53-platform-tenants-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs    # 164/164
pnpm --filter @oneday/platform-web typecheck                 # PASS
pnpm --filter @oneday/platform-web build                     # PASS (包含 /p/tenants)
pnpm build                                                   # 20/20
pnpm test:unit                                               # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                   # clean
npx prettier --check <changed files>                         # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-53 无关(clean 基线复现一致，同 W∞-44~52 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf53` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；platform build PASS；`pnpm build` 20/20；
- `g1-winf53` 4/4；`g1-winf*.test.mjs` 164/164；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有平台租户档案行推导，禁止假 BI；租户工具开通经济不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
