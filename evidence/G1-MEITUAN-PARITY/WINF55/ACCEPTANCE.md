# G1-W∞-55 Platform 平台商圈管理 真实数据深页密度 densify（平台面）

- slice: `G1-R-PLATFORM-BUSINESS-CIRCLES-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/business-circles` 商圈管理 真实数据深页密度 toward Meituan platform/agent backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45/46/47/48/49/50/51）+ 平台面 `/p/agents`（W∞-52）`/p/tenants`（W∞-53）`/p/channels`（W∞-54）后，本刀续平台面 `/p/business-circles`（商圈管理 PAGE-P-005）的真实数据分布洞察，全部由已抓取的真实平台商圈档案行（`circles[]`: `code`/`name`/`description`/`status`/`merchants[]`；`merchant`: `name`/`approvalStatus`/`benefits[]`）现场推导，禁止假 BI：

- **`/p/business-circles`（平台商圈管理）**：视觉/IA densify toward 美团平台/代理后台 —— 移除页面级 `AdminPageHeader` / `Card` / `ONEDAY` 眉标，新增黄顶栏 `topBar`（`推广员工具 · 平台商圈管理` + 右上「刷新」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 + 诚实描述) + 白卡概况条 summaryStrip(固定商圈/推荐商户/已批准/待审批) + 白卡分布面板 `aria-label="商圈运营分布"`，宽度百分比由真实行 `barWidth(data.circles.length, b.value)` / `barWidth(totalRecalls, b.value)` 推导，空数据「暂无记录」——
  - 商圈规模分布(按真实商圈 `circle.merchants.length` 分桶 → 未收拢 0/小规模 1-5/中规模 6-15/规模商圈 16+)；
  - 推荐审批状态分布(跨全部商圈推荐商户，按真实 `merchant.approvalStatus` → 待审批/已批准/已退出)；
  - 商圈覆盖商户分布(跨全部商圈统计每户被推荐覆盖的商圈次数，按真实 `merchant.name` 频次降序)；
  - 推荐权益分布(跨全部商圈推荐商户按真实 `merchant.benefits.length` 分桶 → 未配置权益 0/基础权益 1-4/丰富权益 5+)。
- **`page.module.css`**：新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management MPC 及 `/p/agents` `/p/tenants` `/p/channels` 共享同一视觉语言)。

诚实边界全保留：商圈是 **商家联盟整合网络，不是消费者成交/平台收款**；全部指标派生自既有 `source=local` 档案行，新增 honest 底注「以上分布全部由已抓取平台商圈档案行现场推导(source=local)：商圈规模、推荐审批状态、商圈覆盖商户与推荐权益；商圈是商家联盟整合网络，不包含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据」；工具身份眉标(`推广员工具 · 平台商圈管理`) + loading/forbidden/error 全状态 + 创建商圈并提交推荐/可推荐商户池/固定商圈与审批队列/批准加入交互全继承(`data-testid="platform-business-circles"`)。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/p/business-circles/page.tsx`(移除 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 + heroCard + summaryStrip + 商圈运营分布 + 真实数据推导；保留创建商圈/商户池/审批队列交互)
- `apps/platform-web/app/p/business-circles/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠 + 灰底白卡画布)
- `tests/g1-winf55-platform-business-circles-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA
- `tests/e2e/platform-business-circles.spec.ts`(随动更新页面 h1 断言 `显式推荐…` → `固定商圈、推荐商户与平台审批`)

## Verify

```text
node --test tests/g1-winf55-platform-business-circles-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs              # 172/172
pnpm --filter @oneday/platform-web typecheck                          # PASS
pnpm --filter @oneday/platform-web build                              # PASS (包含 /p/business-circles)
pnpm build                                                            # 20/20
pnpm test:unit                                                        # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                            # clean
npx prettier --check <changed files>                                  # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-55 无关(clean 基线复现一致，同 W∞-44~54 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf55` + `page.tsx` + `page.module.css` + e2e spec prettier clean。

## Gates

- typecheck PASS；platform build PASS（含 `/p/business-circles` 路由）；`pnpm build` 20/20；
- `g1-winf55` 4/4；`g1-winf*.test.mjs` 172/172；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有平台商圈档案行推导，禁止假 BI；商圈工具联盟生态不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
