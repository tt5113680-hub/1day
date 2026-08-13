# G1-W∞-115 ACCEPTANCE — 经营分析行业模板 + 模块热力 + 工具漏斗（MPC-09）

- recorded_at: 2026-08-13 Asia/Shanghai
- task: `G1-R-ANALYTICS-INDUSTRY-MODULE-TOOLFUNNEL` / W∞-115
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase2（§4 P0 MPC-09）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰

## Delivered

把 `/m/analytics`（MPC-09 数据/经营分析）从「逐日日报 + 分布条」推进到可作业闭环三要素——**行业模板 + 模块热力 + 工具漏斗**，全部由真实档案行现场推导（禁止假 BI）：

1. **工具漏斗 API**（`entry-funnel.service.ts` `toolFunnel` + `entry-funnel.controller.ts` `GET /api/v1/management/entry-funnel/tool-funnel?days=N`，`tenant.manage` fail-closed）：真实咨询→客户→任务→完成 4 段折线——
   - `consult` = `consumer_action_events + consumer_action_redirect_events` 窗内事件数（公开入口动作 + 外链跳转确认）
   - `customer` = 窗内新建 status=`active` 的 `customers` 去重数
   - `task` = 上述新建客户中已生成本平台 `tasks` 的去重客户数
   - `done` = 上述客户中 `tasks.status='completed'` 的去重客户数
   - 相邻转化率 `rate`（咨询→客户/客户→任务/任务→完成），源 source=local、不碰第三方成交。
2. **模块热力 API**（`entry-funnel.service.ts` `moduleHeat` + `GET /api/v1/management/entry-funnel/module-heat?days=N`）：真实 `entry_funnel_events` 按 `module_key × event_code` 聚合（L0：观看/访问/跳转/停留/分享；L2：模块曝光/咨询点击/跳转确认），返回 `modules[]{moduleKey,total,cells{eventCode,label,value}}` + `max`（热力强度归一），未命名模块兜底 `(未命名模块)`，仅 L0–L2 入口痕迹。
3. **Management `/m/analytics`**（`page.tsx` + `page.module.css`）：并行拉取 daily-report + tool-funnel + module-heat + summary，新增——
   - **行业模板解读**面板：`role=tab` 餐饮/美业/零售 切换（`industryTemplates`）+ 聚焦模块 `focusModules` 热力条（`byModule` 真实计数）+ 规则引擎解读 `insights`；
   - **模块热力**面板：`heatTable`（模块行 × 事件徽标 `heatEventItem` + 黄渐变 `heatBar` 热力条 `heatIntensity(total/max)` + 合计）；
   - **工具漏斗**面板：`funnelBreakdown`（咨询→客户→任务→完成 4 段 + 单位 + 转化率小标 + 咨询→客户率）。
   `data-testid="management-analytics"` + 窗口/刷新/直达原分布/逐日明细全保留。

## Evidence commands

- `node --test tests/g1-winf115-analytics-industry-module-toolfunnel.test.mjs` → **6/6**（静态扫描：service toolFunnel/moduleHeat、控制器两 GET（tenant.manage）、页面行业模板 tab + 聚焦模块热力 + 模块热力面板 + 工具漏斗面板、诚实边界无伪 BI/mockMetrics/Math.random；真实 DB：建 org/user/membership(tenant.manage)/employee/merchant/store/external_action/customer/task(open+completed)/consumer_action_event/entry_funnel_events → 跨租户 403/404 deny → tool-funnel 4 段（咨询≥1/客户/任务/完成）→ module-heat 含 offer_compare 与 member_entry 且 offer 计数≥2 → disclaimer 口径断言）
- 随动回归：`g1-winf44`（analytics 日报）、`g1-winf81`（analytics/notifications 分布）全部通过
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **420/420**（原 414 + 6）
- 全仓 `node --test tests/*.test.mjs` → **692 pass / 9 fail**（9 失败 = clean HEAD 既有基线：hardening-001/002、page-c-002、page-c-consumer-search、page-m-012、sys-11、sys-22、sys-5-storefront-renderer×2，均为既有集成/e2e 基线与本刀无涉）
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49（12 文件）
- `node tests/evidence-contract.test.mjs` → 74/74；变更文件 eslint + prettier clean

## Honest boundaries

- source=local：行业模板只按已抓取 L0–L2 入口痕迹解读模块曝光与承接，不编造成交、支付或第三方订单结果
- 模块热力仅统计 L0–L2 入口痕迹按模块聚合，不含支付与成交
- 工具漏斗仅聚合本平台入口动作与跟进/任务痕迹（咨询→客户→任务→完成；本窗口新建客户生成任务/完成任务的去重口径），不含支付、成交金额或第三方订单结果
- 不含本平台收款，**非本平台下单**；`/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders / 本平台下单 / 收单

## Next

- **W∞-116** 员工邀请→激活→角色包（MPC-10）、W∞-117 通知已读/忽略/批量 + 设置变更审计（MPC-13/12）——Phase2 收尾后进入 Phase3 SaaS 最强（W∞-118+）。
