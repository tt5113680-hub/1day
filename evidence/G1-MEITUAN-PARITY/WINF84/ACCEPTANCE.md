# G1-W∞-84 Management 剩余 MPC 零星面（permission-audit / connectors / external-actions / ai-suggestions）真实数据深页 densify（toward PARITY）

- recorded_at: 2026-08-12
- status: **PASS**
- branch: `hardening/COMMERCIAL-COMPLETION`
- product_filter: 统一入口 / 工作流 / 痕迹；不碰钱·销售·本平台下单；不复活 consumer_orders

## Context

Management MPC 真实数据深页波（W∞-45~83）已闭合全部主面；本切片收束最后一组仍停留在旧 `AdminPageHeader`+`Card` chrome 的四个 Management MPC 零星/归并面——`/m/permission-audit`（操作审计，MPC-10/归并设置·安全审计）、`/m/connectors`（连接配置，PAGE-M-015）、`/m/external-actions`（外链服务，归并外链/活动即可入口）、`/m/ai-suggestions`（作业建议，归并工作台建议）。按商用对标前提，四个面一次性补到「黄顶栏+灰底白卡+heroCard+概况条+分布洞察+honest」完整对标，与 W∞-42/43/45~83 共享视觉语言；工具身份文案收尾（W∞-19~30）不等于商用完成，视觉/IA + 真实数据密度是商用前提。

## Delivered

四页全部移除页面级 `AdminPageHeader` + `Card` chrome，改挂统一对标 chrome：

- 黄顶栏 `topBar`（`推广员工具 · 操作审计 / 连接配置 / 外链服务 / 作业建议` + 右上刷新按钮）+ 灰底画布（`background:#f5f5f5`）+ 白卡 `heroCard`（h1 + 诚实描述）+ 白卡概况条 `summaryStrip` + 白卡分布面板 + honest 底注
- 每页 `page.module.css` 新增 `.topBar/.topBarTitle/.topBarRefresh/.heroCard/.panel/.summaryStrip/.panelHead/.panelMeta/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（`linear-gradient(90deg,#ffd100,#f0a500)`），≤900px 单列堆叠

**`/m/permission-audit`（操作审计）：**

- 概况条 `aria-label="审计摘要"`（审计记录 / 权限变更 / 数据导出 / 风险信号）
- 分布面板 `aria-label="操作审计分布"`——类型分布（按真实 kind 经 labels 中文：权限变更/导出/高权限扩展信号/未归属特权操作/追溯记录）、资源类型分布（按真实 resource.type 经 businessLabel）、操作人分布（按真实 actorName），全部由已抓取 `data.records[]` 现场推导，`barWidth(total, item.value)`，空数据「暂无记录」，禁止假 BI
- 保留筛选（全部/权限变更/导出/风险信号）、审计记录 `Table`、证据展开 `Modal`（关联/Trace/资源 ID + detail）与刷新，`data-testid="management-permission-audit"`

**`/m/connectors`（连接配置）：**

- 概况条 `aria-label="连接器概况"`（连接器 / 已授权 / 待授权 / 运行日志）
- 分布面板 `aria-label="连接配置分布"`——连接器平台分布（按真实 code 经 labels 中文）、授权状态分布（按真实 status 经 businessLabel）、运行日志状态分布（跨全部 `logs[]` 经 businessLabel），由真实 `connectors[]` 现场推导，禁止假 BI
- 保留登记授权请求表单（连接器/授权密钥/idempotency-key）、提示 note、连接器卡（密钥摘要/版本/`connector-delivery-boundary` 诚实的投递边界/运行日志），`data-testid="management-connectors"`

**`/m/external-actions`（外链服务）：**

- 概况条 `aria-label="外链服务概况"`（外链动作 / 链接 hand-off / 小程序入口 / 平台入口意图）
- 分布面板 `aria-label="外链服务分布"`——动作类型分布（按真实 action_type 经中文）、平台命名分布（按真实 platform 频次降序）、状态分布（按真实 status 经 businessLabel），由真实 `actions[]` 现场推导，禁止假 BI
- 保留新建表单（编码/名称/类型/平台/目标 URL/小程序）、编辑/保存/归档交互、`external-action-create`/`external-actions-catalog`/`external-action-*` hooks，`data-testid="management-external-actions"`

**`/m/ai-suggestions`（作业建议）：**

- 概况条 `aria-label="作业建议概况"`（建议 / 待处理 / 已采纳 / 待人工执行）
- 分布面板 `aria-label="作业建议分布"`——处理状态分布（按真实 status 经中文）、动作类型分布（按真实 action_type 经 businessLabel）、建议来源模型分布（按真实 model_name 频次降序）、执行状态分布（按真实 execution_status 经 businessLabel），由真实 `items[]` 现场推导，禁止假 BI
- 保留采纳/反馈交互、执行状态 `ai-execution-status`、empty 提示，`data-testid="management-ai-suggestions"`

## Honest boundary

- 四页均保留工具身份 + 诚实边界（`source=local`、分布全部由已抓取档案行现场推导、连接器仅为意图/健康/本地记录、渠道分发仅登记待授权请求不伪造发送、AI 仅解读既有 L0–L2 入口痕迹不编造成交、不接美团/抖音实时投放、不包含本平台收款、非本平台下单）
- 无 schema/DB/API 变更；不复活 consumer_orders / 本平台下单/收单

## Verification

- 新增 `tests/g1-winf84-management-orphan-pages-deep.test.mjs` 5/5（四页黄顶栏+灰底画布+hero+分布 css 全套 + 各页真实数据分布 + honest + 工具状态 + data-testid）
- `g1-winf*.test.mjs` 296/296 全绿（含新增 5；前 291 保持不变）
- 随动更新 g1-winf25（`permission_audit/connectors/ai_suggestions/external_actions` eyebrow 断言 → `topBarTitle` 断言；`ai_suggestions` h1 断言）；g1-winf27/28 相关断言回归通过
- management-web typecheck + build PASS（29 routes 含四页）；`pnpm typecheck` 20/20；`pnpm build` 20/20
- 单测 47 passed（2 pre-existing token 失败照旧：`tokens.vitest.ts`、`storefront-renderer.vitest.ts`，与本改动无关）
- eslint + prettier clean
