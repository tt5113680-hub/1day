# G1-W∞-52 Platform 省市区代理 真实数据深页密度 densify（平台面）

- slice: `G1-R-PLATFORM-AGENTS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; Platform `/p/agents` 省市区代理 真实数据深页密度 toward Meituan platform/agent backoffice = 四端完整对标平台面)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 深页序列（W∞-45/46/47/48/49/50/51 订单·评价·营销 / 顾客·会员 / 商品·套餐入口 / 员工管理 / 角色权限 / 营销内容 / 入口页装修深页已收），本刀补上 **平台面 `/p/agents`（省市区代理）** 的真实数据分布洞察，全部由已抓取的省市区代理档案行（agents: `agentLevel`/`status`；regions: `level`；settlements: `settlementStatus`；approvals: `approvalStatus`）现场推导，禁止假 BI：

- **`/p/agents`（省市区代理，平台面）**：视觉/IA densify toward 美团平台代理后台 —— 黄顶栏 `topBar`（`推广员工具 · 省市区代理` + 右上「渠道商户队列」「刷新」）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 + 诚实描述) + 白卡概况条 summaryStrip(区域/代理商/归属商户/待审批入驻) + 白卡分布面板 `aria-label="代理运营分布"`，宽度百分比由真实行 `b.value/total`(barWidth) 推导，空数据「暂无记录」——
  - 代理层级分布(按真实 `agent.agentLevel` → 省级/市级/区县)；
  - 代理状态分布(按真实 `agent.status` → 正常/已暂停)；
  - 区域层级分布(按真实 `region.level` → 省级/市级/区县)；
  - 结算状态分布(按真实 `settlement.settlementStatus` → 结算中/已结算)；
  - 入驻审批状态分布(按真实 `approval.approvalStatus` → 待审批/已通过/已驳回)。
- **`page.module.css`**：新增 `.topBar/.topBarTitle/.topBarActions/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management MPC 深页共享同一视觉语言)。

诚实边界全保留：代理结算/配额是 **代理运营账，不是消费者成交**；全部指标派生自既有 `source=local` 档案行，新增 honest 底注「以上分布全部由已抓取的省市区代理真实档案行现场推导(source=local)：代理层级、代理状态、区域层级、结算状态与入驻审批状态；结算/配额是代理运营账，不是消费者成交；本地试点记录，未接美团实时代理数据；不包含本平台收款、非本平台下单」；工具身份眉标(`推广员工具 · 省市区代理`) + loading/forbidden/error 全状态 + 既有省市区代理树/建立区域/绑定代理商/商户入驻归属/入驻配额/周期结算/入驻开通审批交互全继承。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单；平台侧代理运营账按主人授权边界保留（不等同消费者资金）。

## Files

- `apps/platform-web/app/p/agents/page.tsx`(移除页面级 AdminPageHeader，新增黄顶栏 + heroCard + summaryStrip + 代理运营分布 + 真实数据推导)
- `apps/platform-web/app/p/agents/page.module.css`(新增可视化分布/bar 样式 + ≤900px 堆叠)
- `tests/g1-winf52-platform-agents-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test tests/g1-winf52-platform-agents-deep.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs    # 160/160
pnpm typecheck                                              # 20/20
pnpm build                                                  # 20/20 (platform-web 含 /p/agents)
pnpm test:unit                                              # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                  # clean
npx prettier --check <changed files>                        # clean (page.tsx / page.module.css / g1-winf52)
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-52 无关(clean 基线复现一致，同 W∞-44~51 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格(先于 W∞-52 已存在)，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf52` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；build PASS；`pnpm build` 20/20；
- `g1-winf52` 4/4；`g1-winf*.test.mjs` 160/160；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有省市区代理档案行推导，禁止假 BI；代理运营账不碰消费者成交/钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
