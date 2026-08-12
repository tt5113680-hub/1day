# G1-W∞-85 收束全仓最后一批残留旧 `AdminPageHeader`+`Card` chrome（attribution / entry-funnel / circles / funnels / tenants-new）toward PARITY

- recorded_at: 2026-08-12
- status: **PASS**
- branch: `hardening/COMMERCIAL-COMPLETION`
- product_filter: 统一入口 / 工作流 / 痕迹；不碰钱·销售·本平台下单；不复活 consumer_orders

## Context

W∞-84 已收束 Management 主面最后一组旧 chrome；全仓四端（consumer / employee / management / platform）页面级 `AdminPageHeader`+`Card` 扫描复核对齐后，确认仍残留 **5 个页面级旧 chrome** 的数据型页面：Management MPC 面 `/m/attribution`（来源归因）、`/m/entry-funnel`（入口痕迹/模块命名看板）、`/m/circles`（商圈双身份）、`/m/funnels/[id]`（来源归因漏斗详情）+ Platform MP-02 面 `/p/tenants/new`（商户入驻开通向导）。按商用对标前提，五页一次性收束到「黄顶栏+灰底白卡+heroCard+概况条+分布洞察+honest」完整对标，与 W∞-42/43/45~84 共享视觉语言；工具身份文案收尾（W∞-19~30）不等于商用完成，视觉/IA + 真实数据密度是商用前提。

## Delivered

五页全部移除页面级 `AdminPageHeader` + `Card` chrome，改挂统一对标 chrome：

- 黄顶栏 `topBar`（`推广员工具 · 来源归因 / 入口痕迹 / 商圈双身份 / 来源归因漏斗 / 商户开通` + 右上刷新/看板跳转）+ 灰底画布（`background:#f5f5f5`）+ 白卡 `heroCard`（h1 + 诚实描述）+ 白卡概况条 `summaryStrip` + 白卡分布面板 + honest 底注
- 每页 `page.module.css` 新增 `.topBar/.topBarTitle/.topBarRefresh/.heroCard/.panel/.summaryStrip/.panelHead/.panelMeta/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（`linear-gradient(90deg,#ffd100,#f0a500)`），≤900px 单列堆叠

**`/m/attribution`（来源归因）：**

- 概况条 `aria-label="归因摘要"`（归因记录 / 首次来源 / 当前来源 / 最终来源）
- 分布面板 `aria-label="来源归因分布"`——归因阶段分布（按真实 role：首次/当前/最终来源）、来源类型分布（按真实 sourceType 经 businessLabel）、证据级别分布（按真实 evidenceLevel 经 businessLabel），全部由已抓取 `data.records[]` 现场推导，`barWidth(total, item.value)`，空数据「暂无记录」，禁止假 BI
- heroCard h1 `看清从哪进、谁承接、证据到哪一级` + 诚实描述（归因阶段描述入口分流与承接，不是销售漏斗成交阶段）；保留归因阶段/来源类型筛选、归因记录行（贡献/已确认/证据）与客户链路跳转；新增 `data-testid="management-attribution"` 与行 `attribution-row`

**`/m/entry-funnel`（入口痕迹看板）：**

- 概况条 `aria-label="入口数据概况"`（观看/访问/跳转/停留/模块曝光/咨询点击/跳转确认/分享配对）
- 分布面板 `aria-label="入口痕迹分布"`——事件分布、入口面分布、模块分布、跳转目标平台分布，全部由已抓取真实 L0–L2 痕迹聚合 `byEventCode/bySurface/byModule/byTargetPlatform` 现场推导，`renderBuckets` 渲染，`barWidth(total, row.count)`，空数据「暂无记录」，禁止假 BI
- heroCard h1 `按模块看分流是否有效`；保留窗口（7/30/90）、行业模板、DIY 维度/过滤/查询/AI 解读、保存视图、按模块/入口面/事件/平台分桶；新增 `data-testid="management-entry-funnel"`

**`/m/circles`（商圈双身份）：**

- 概况条 `aria-label="商圈概况"`（我管理的商圈 / 附近公开商圈 / 申请·邀约 / 待审批）
- 分布面板 `aria-label="商圈分布"`——自有商圈可见分布（按真实 `publicVisible`）、申请/邀约来源分布（按真实 `source`）、申请/邀约状态分布（按真实 `status`）、附近商圈行业分布（按真实 `industryTag`，未配置兜底「联盟」），全部由已抓取 `owned[]/nearby[]/applications[]` 现场推导，禁止假 BI
- heroCard h1 `经营自己的商圈，也能申请加入附近商圈`；保留创建/公开开关/邀约/申请/双身份审批交互；`data-testid="management-circles"`

**`/m/funnels/[id]`（来源归因漏斗详情）：**

- 概况条 `aria-label="漏斗摘要"`（阶段数 / 确认阶段 / 推断阶段 / 确认来源转化）
- 分布面板 `aria-label="漏斗分布"`——阶段结果类型分布（按真实 `stages[].resultType`）、各阶段来源转化（按确认基线 `baseline` 推导），全部由已抓取 `stages[]` 现场推导，禁止假 BI
- heroCard h1 `从来源到进店承接，跟踪每一步的入口分流`；保留确认/推断阶段卡与口径说明；`data-testid="management-funnel"`

**`/p/tenants/new`（商户入驻开通向导）：**

- 黄顶栏 `topBar`（`推广员工具 · 商户开通`）+ 白卡 heroCard h1 `一次提交，生成可登录、可访问的 READY 商户`（诚实描述：可登录、可访问，保留不碰经营/不碰销售边界）+ 白卡开通表单面板
- 新增 `aria-label="开通步骤分布"` 分布面板——按真实开通运行 `run.steps[]` 状态（完成/失败/未执行/跳过，`countBy(run.steps, stepLabel)`）现场推导，`barWidth(total, item.value)`；仅在产生运行记录后渲染，禁止假 BI
- 保留一键开通并验证 /* 幂等键/冲突提示/READY 交付包（ONE-CODE/落地页/行业套餐）/步骤轨迹/刷新步骤轨迹/换标识重开；`data-testid="platform-onboarding"`，`provisioning-*` hooks 全保留

## Honest boundary

- 五页均保留工具身份 + 诚实边界（`source=local`、分布全部由已抓取档案/history 行现场推导、仅统计观看/访问/跳转/停留/分享入口痕迹、不表示第三方已下单或已支付、开通仅登记意图与本地验收结果不接美团实时商户数据、不包含本平台收款、非本平台下单）
- 无 schema/DB/API 变更；不复活 consumer_orders / 本平台下单/收单

## Verification

- 新增 `tests/g1-winf85-last-legacy-chrome-closeout.test.mjs` 5/5（五页黄顶栏+灰底画布+hero+分布 css 全套 + 各页真实数据分布 + honest + 工具状态 + data-testid）
- `g1-winf*.test.mjs` 301/301 全绿（含新增 5；前 296 保持不变）
- 随动更新 g1-winf25（`funnels` eyebrow 断言 → `topBarTitle` + `<h1>` 断言；attribution 链路口径断言）、g1-winf28（attribution 归因阶段口径断言）；g1-winf4/27/30/12 回归通过
- 随动更新 e2e `management-attribution.spec.ts`（页头 h1 `看清从哪进、谁承接、证据到哪一级`）、`platform-onboarding.spec.ts`（页头 h1 `生成可登录、可访问的 READY 商户`）——仅文案断言对齐，交互不变（需本地 sandbox 才可实跑）
- management-web typecheck + build PASS（含 /m/attribution /m/entry-funnel /m/circles /m/funnels/[id]）；platform-web typecheck + build PASS（含 /p/tenants/new）；`pnpm typecheck` 20/20；`pnpm build` 20/20
- 单测 47 passed（2 pre-existing token 失败照旧：`tokens.vitest.ts`、`storefront-renderer.vitest.ts`，与本改动无关）
- eslint + prettier clean
