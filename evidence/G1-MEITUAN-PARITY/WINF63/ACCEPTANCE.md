# G1-W∞-63 Circle 商圈成员治理 真实数据深页密度 densify（商圈面）

- slice: `G1-R-BC-MERCHANTS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 商圈面 `/bc/merchants` 真实数据深页分布 toward 美团平台/代理后台 = 四端完整对标商圈面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 全序列（W∞-45~51）、平台面 `/p/*`（W∞-52~61）、商圈面 `/bc/dashboard`（W∞-60）、渠道面 `/ch/dashboard`（W∞-62）真实数据深页序列后，本刀把商圈成员治理 `/bc/merchants` 补上「分布洞察」并视觉/IA densify toward 美团平台/代理后台。全部分布由既有 `GET /api/v1/circle/merchants` 现场查询的**真实商圈成员档案行**推导，禁止假 BI，无 schema/DB/API 变更：

- **`/bc/merchants`（商圈成员治理）**：移除页面级 `AdminPageHeader`/`Card`/`ONEDAY` 眉标，新增 `PlatformProductHome mode="circle"`（与 `/bc/dashboard` 一致）+ 黄顶栏 `topBar`（`推广员工具 · 商圈成员治理` + 刷新）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 `邀请、双重审批并展示已批准商户` + 诚实描述) + 白卡概况条 summaryStrip `aria-label="商圈成员概况"`(成员记录/已批准/待审核/覆盖商圈) + 白卡分布面板 `aria-label="商圈成员分布"`，宽度百分比 `barWidth(members.length, b.value)` 由真实成员档案行推导，空数据「暂无记录」——
  - 平台审核分布(按真实 `platformApprovalStatus` 待审批/已批准/已退出)；
  - 商圈审核分布(按真实 `circleApprovalStatus` 待审批/已批准)；
  - 邀请状态分布(按真实 `invitationStatus` 已准备/已接受/已邀请)；
  - 展示状态分布(按真实 `displayConfig.visible` 在总览展示/从总览隐藏)；
  - 商户归属商圈分布(按真实 `circleName`，未归属统一「未归属商圈」，频次降序)；
  - 联合权益覆盖分布(按真实 `benefits.length` 分桶 未配置权益 0/基础权益 1-4/丰富权益 5+)。
- **`page.module.css`**：新增 `.topBar/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management MPC 深页及平台/商圈/渠道面系列共享同一视觉语言)。保留既有邀请表单/审核队列/展示/退出交互样式。

诚实边界全保留：全部指标派生自既有真实商圈成员档案行（`source=local`），新增 honest 底注「以上分布全部由已抓取商圈成员档案行现场推导(source=local)：平台审核、商圈审核、邀请状态、展示状态、归属商圈与联合权益；商圈是商家联盟整合网络，仅管理成员关系，不包含本平台收款、非本平台下单；本地试点记录，未接美团实时商户数据」；工具身份眉标(`推广员工具 · 商圈成员治理`) + loading/forbidden/error 全状态 + 商户审核队列(双重审批/展示切换/退出) + 准备商户邀请表单全继承。无 schema/DB migration 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/platform-web/app/bc/merchants/page.tsx`(移除 AdminPageHeader/Card/ONEDAY；新增 PlatformProductHome + topBar/heroCard/summaryStrip/商圈成员分布 + 真实数据推导与状态映射；保留邀请表单/审核队列/展示/退出交互)
- `apps/platform-web/app/bc/merchants/page.module.css`(新增 topBar/heroCard/summaryStrip/成员分布/bar 可视化样式 + ≤900px 堆叠 + 灰底白卡画布；调整邀请表单样式作用于 panel)
- `tests/g1-winf63-bc-merchants-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与 circle-merchant 服务保留
- `tests/e2e/business-circle-merchants.spec.ts`(随动更新页面 h1 断言 `邀请、审核并展示`→`邀请、双重审批并展示已批准商户`)

## Verify

```text
node --test tests/g1-winf63-bc-merchants-deep.test.mjs         # 4/4
node --test tests/g1-winf*.test.mjs                              # 204/204 (含 W∞-62 及以上全部深页回归)
pnpm --filter platform-web typecheck                             # PASS
pnpm --filter platform-web build                                 # PASS (含 /bc/merchants)
pnpm build                                                       # 20/20 (含 /bc/merchants)
pnpm test:unit                                                   # 47 passed (2 pre-existing token baseline failures 照旧)
eslint / prettier --check                                        # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-63 无关(clean 基线复现一致，同 W∞-44~62 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格，非本次改动引入，故不重排历史。代码/测试文件 prettier clean。

## Gates

- typecheck PASS(platform-web)；`pnpm --filter platform-web build` PASS（含 `/bc/merchants`）；`pnpm build` 20/20；
- `g1-winf63` 4/4；`g1-winf*.test.mjs` 204/204（含既有 W∞ 深页回归）；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有商圈成员档案行(platformApprovalStatus/circleApprovalStatus/invitationStatus/displayConfig/circleName/benefits)推导，禁止假 BI；不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
