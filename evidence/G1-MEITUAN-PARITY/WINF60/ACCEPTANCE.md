# G1-W∞-60 Circle 商圈联盟 真实数据深页密度 densify（商圈面）

- slice: `G1-R-BC-DASHBOARD-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Circle `/bc/dashboard` 商圈联盟 真实数据深页分布 toward Meituan platform/agent backoffice = 四端完整对标商圈面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45~51）+ 平台面 `/p/agents`（W∞-52）`/p/tenants`（W∞-53）`/p/channels`（W∞-54）`/p/business-circles`（W∞-55）`/p/outbox`（W∞-56）`/p/security-audit`（W∞-57）`/p/connectors`（W∞-58）`/p/templates`（W∞-59）后，本刀续商圈面 `/bc/dashboard`（商圈联盟 MP-04）的真实数据分布洞察，全部由已抓取的真实商圈联盟档案行（`circles[]` 经 `merchants[]`: `benefits[]`/`contentCount`/`trafficEvents`/`conversionOrders`）现场推导，禁止假 BI：

- **`/bc/dashboard`（商圈联盟）**：视觉/IA densify toward 美团平台/代理后台 —— 保留既有黄顶栏 `topBar`（`推广员工具 · 商圈联盟` + 右上「刷新」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 `成员权益、内容、流量与入口转化` + 诚实描述)，新增白卡概况条 summaryStrip(固定商圈/已批准商户/访问行为/入口转化) + 白卡分布面板 `aria-label="商圈联盟分布"`，宽度百分比 `barWidth(data?.circles.length ?? 0, b.value)` / `barWidth(merchantTotal, b.value)` 由真实行推导，空数据「暂无记录」——
  - 联盟规模分布(按真实 `circle.merchants.length` 分桶 → 未收拢商户 0/精简联盟 1-5/中型联盟 6-15/规模联盟 16+)；
  - 商户权益覆盖分布(跨全部已批准商户按真实 `merchant.benefits.length` 分桶 → 未配置权益 0/基础权益 1-4/丰富权益 5+)；
  - 内容密度分布(按真实 `merchant.contentCount` 分桶 → 未投内容 0/轻度内容 1-5/丰富内容 6+)；
  - 流量行为分布(按真实 `merchant.trafficEvents` 分桶 → 尚无行为 0/低活跃 1-9/中活跃 10-99/高活跃 100+)；
  - 入口转化分布(按真实 `merchant.conversionOrders` 分桶 → 未转化 0/少量转化 1-9/高转化 10+)。
- **`page.module.css`**：新增 `.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management MPC 深页及平台面 `/p/*` 系列共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有 `source=local` 商圈联盟档案行，新增 honest 底注「以上分布全部由已抓取商圈联盟档案行现场推导(source=local)：联盟规模、商户权益覆盖、内容密度、流量行为与入口转化；商圈是商家联盟整合网络，仅呈现聚合入口痕迹，不包含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据」；工具身份眉标(`推广员工具 · 商圈联盟`) + loading/forbidden/error 全状态 + 常用功能格 + 商圈指标 + 固定商圈联盟明细(`<dt>入口转化</dt>` e2e hook)全继承。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/bc/dashboard/page.tsx`(新增 summaryStrip + 商圈联盟分布 + 真实数据推导；保留常用功能格/商圈指标/固定商圈联盟明细既有交互)
- `apps/platform-web/app/bc/dashboard/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠 + 灰底白卡画布)
- `tests/g1-winf60-bc-dashboard-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test tests/g1-winf60-bc-dashboard-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs   # 192/192
pnpm --filter @oneday/platform-web typecheck               # PASS
pnpm --filter @oneday/platform-web build                   # PASS (含 /bc/dashboard)
pnpm build                                                 # 20/20
pnpm test:unit                                             # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                 # clean
npx prettier --check <changed files>                       # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-60 无关(clean 基线复现一致，同 W∞-44~59 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf60` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；`pnpm --filter @oneday/platform-web build` PASS（platform-web 含 `/bc/dashboard` 路由）；`pnpm build` 20/20；
- `g1-winf60` 4/4；`g1-winf*.test.mjs` 192/192；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有商圈联盟档案行推导，禁止假 BI；商圈是商家联盟整合网络，不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
