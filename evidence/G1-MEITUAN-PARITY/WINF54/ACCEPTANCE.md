# G1-W∞-54 Platform 平台渠道管理 真实数据深页密度 densify（平台面）

- slice: `G1-R-PLATFORM-CHANNELS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/channels` 渠道管理 真实数据深页密度 toward Meituan platform backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45/46/47/48/49/50/51）+ 平台面 `/p/agents`（W∞-52）`/p/tenants`（W∞-53）后，本刀续平台面 `/p/channels`（渠道管理 PAGE-P-004）的真实数据分布洞察，全部由已抓取的真实一级渠道与商户池档案行（`channels`: `status`/`onboardingStatus`/`serviceStatus`/`merchants[]`；`merchantPool[]`）现场推导，禁止假 BI：

- **`/p/channels`（平台渠道管理）**：视觉/IA densify toward 美团平台/代理后台 —— 移除页面级 `AdminPageHeader`，新增黄顶栏 `topBar`（`推广员工具 · 平台渠道管理` + 右上「刷新」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 + 诚实描述) + 白卡概况条 summaryStrip(一级渠道/纳入商户/已就绪服务/商户池) + 白卡分布面板 `aria-label="渠道运营分布"`，宽度百分比由真实行 `barWidth(data.channels.length, b.value)` / `barWidth(totalMerchants, b.value)` 推导，空数据「暂无记录」——
  - 渠道服务状态分布(按真实 `channel.serviceStatus` → 待确认/已就绪/服务降级/已阻断)；
  - 渠道规模分布(按真实渠道 `merchants.length` 分桶 → 未挂商户 0/精简规模 1-3/规模渠道 4+)；
  - 商户开通状态分布(跨全部渠道商户，按真实 `merchant.onboardingStatus` → 已邀请/开通中/有效/已暂停)；
  - 商户服务状态分布(跨全部渠道商户，按真实 `merchant.serviceStatus` → 待确认/已就绪/服务降级/已阻断)；
  - 渠道状态分布(按真实 `channel.status` → 渠道开放)。
- **`page.module.css`**：新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management MPC 及 `/p/agents` `/p/tenants` 共享同一视觉语言)。

诚实边界全保留：渠道是 **工具开通与整合网络，不是消费者成交/平台收款**；全部指标派生自既有 `source=local` 档案行，新增 honest 底注「以上分布全部由已抓取平台渠道档案行现场推导(source=local)：渠道服务状态、渠道规模、商户开通状态、商户服务状态与渠道状态；渠道是工具开通与整合网络，不包含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据」；工具身份眉标(`推广员工具 · 平台渠道管理`) + loading/forbidden/error 全状态 + 建立一级渠道/可开通商户池/已配置渠道交互全继承(`data-testid="platform-channels"`)。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/p/channels/page.tsx`(移除页面级 AdminPageHeader，新增黄顶栏 + heroCard + summaryStrip + 渠道运营分布 + 真实数据推导；保留建立渠道/商户池/渠道列表交互)
- `apps/platform-web/app/p/channels/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠 + 白卡面板)
- `tests/g1-winf54-platform-channels-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test tests/g1-winf54-platform-channels-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs      # 168/168
pnpm --filter @oneday/platform-web typecheck                 # PASS
pnpm --filter @oneday/platform-web build                     # PASS (包含 /p/channels)
pnpm build                                                   # 20/20
pnpm test:unit                                               # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                   # clean
npx prettier --check <changed files>                         # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-54 无关(clean 基线复现一致，同 W∞-44~53 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf54` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；platform build PASS；`pnpm build` 20/20；
- `g1-winf54` 4/4；`g1-winf*.test.mjs` 168/168；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有平台渠道档案行推导，禁止假 BI；渠道工具开通整合经济不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
