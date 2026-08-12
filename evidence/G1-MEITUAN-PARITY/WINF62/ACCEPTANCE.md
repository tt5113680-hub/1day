# G1-W∞-62 Channel 渠道代理仪表盘 真实数据深页密度 densify（渠道面）

- slice: `G1-R-CHANNEL-AGENT-DASH-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 渠道面 `/ch/dashboard` 真实数据深页分布 toward 美团平台/代理后台 = 四端完整对标渠道面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接管理面 MPC 全序列（W∞-45~51）、平台面 `/p/dashboard`（W∞-61）等真实数据深页序列后，本刀把渠道代理主仪表 `/ch/dashboard` 补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台。全部分布由既有 `GET /api/v1/channel/dashboard` 现场查询的**真实渠道商户档案行**推导，禁止假 BI，无 schema/DB/API 变更：

- **`/ch/dashboard`（渠道代理）**：保留既有黄顶栏 `topBar`（`推广员工具 · 渠道代理` + 省市区代理/开通商户/刷新）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 `商户开通队列与跟进信号` + 诚实描述) + 常用功能格 + 渠道指标 + 商户经营队列，新增白卡概况条 summaryStrip `aria-label="渠道概况"`(渠道商户/已开通/近 30 天活跃/跟进信号) + 白卡分布面板 `aria-label="渠道运营分布"`，宽度百分比 `barWidth(merchants.length, b.value)` 由真实行推导，空数据「暂无记录」——
  - 开通状态分布(按真实 `onboarding_status` 待接受 invited/开通中 onboarding/已开通 active/已暂停 paused)；
  - 套餐分布(按真实 `plan` 基础版/成长版/企业版，频次降序)；
  - 风险等级分布(按真实 `risk_level` 低/中/高)；
  - 归属区域分布(按真实 `region_name`，未归属统一「未归属省市区代理」，频次降序)；
  - 近 30 天活跃分布(按真实 `active_in_30_days` 近 30 天有活跃/无活跃)；
  - 跟进信号分布(按真实 `renewal_signal` 建议跟进：30 天不活跃 / 建议跟进：高风险 / 无跟进信号)。
- **数据修正（随刀一并校准，与真实 API 口径一致）**：`onboarding_status` 真实值为 `invited/onboarding/active/paused`(非 `onboarded`)；`onboardingLabel` 与筛选下拉均改为映射真实值 `active→已开通`、`paused→已暂停`，行内开通徽标改由 `onboardingLabel` 专用映射(不再复用共享 `statusLabel` 的 `active→正常`)，使分布/徽标/筛选三处口径一致，避免假 BI 式显示错误。
- **`page.module.css`**：新增 `.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management MPC 深页及平台面 `/p/*` 系列共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有真实渠道商户档案行（`source=local`），新增 honest 底注「以上分布全部由已抓取渠道商户档案行现场推导(source=local)：开通状态、套餐、风险等级由真实商户行映射；归属区域按真实省市区归属统计，未归属统一「未归属省市区代理」；近 30 天活跃仅反映既有作业/跟进与档案类证据，不作入口成交归因；跟进信号仅来自不活跃或既有高风险证据，非套餐到期、非成交漏斗。不含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据」；工具身份眉标(`推广员工具 · 渠道代理`) + loading/forbidden/error 全状态 + `data-testid`(如有) + 常用功能格 + 渠道指标 + 商户经营队列(搜索/开通状态/跟进信号/区域筛选 + 商户卡实况标签)全继承。无 schema/DB migration 变更，不复活 consumer_orders / 本平台下单/收单；跟进信号仅由不活跃/高风险既有证据推导，非套餐到期、非成交漏斗。

## Files

- `apps/platform-web/app/ch/dashboard/page.module.css`(新增 summaryStrip/渠道运营分布/bar 可视化样式 + ≤900px 堆叠 + 灰底白卡画布)
- `apps/platform-web/app/ch/dashboard/page.tsx`(新增 summaryStrip + 渠道运营分布 + 真实数据推导与状态映射；随刀校准 onboarding_status 真实值映射/徽标/筛选口径；保留常用功能格/渠道指标/商户经营队列既有交互)
- `tests/g1-winf62-channel-dashboard-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与渠道服务保留

## Verify

```text
node --test tests/g1-winf62-channel-dashboard-deep.test.mjs         # 4/4
node --test tests/g1-winf*.test.mjs                                  # 200/200 (含 W∞-61 回退)
pnpm --filter platform-web typecheck                                 # PASS
pnpm build                                                           # 20/20 (含 /ch/dashboard)
pnpm test:unit                                                       # 47 passed (2 pre-existing token baseline failures 照旧)
eslint / prettier --write                                             # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-62 无关(clean 基线复现一致，同 W∞-44~61 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 prettier clean。

## Gates

- typecheck PASS(platform-web)；`pnpm build` 20/20（platform-web 含 `/ch/dashboard` 路由）；
- `g1-winf62` 4/4；`g1-winf*.test.mjs` 200/200（含既有 W∞ 深页回归）；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有渠道商户档案行(plan/risk_level/onboarding_status/region/active/跟进信号)推导，禁止假 BI；跟进信号仅由不活跃/高风险证据推导；不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
