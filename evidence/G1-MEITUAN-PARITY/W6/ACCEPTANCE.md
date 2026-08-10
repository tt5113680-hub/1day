# G1-W6 省市区代理（MP-01~03, R5）

- slice: `G1-R-CHANNEL-AGENT-GEO`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS**（engineering；非 owner G1 签收）

## What changed

Platform PC 补齐 省市区代理树 · 商户入驻归属，对标美团平台/代理 PC
（`MEITUAN_PC_H5_PARITY_INVENTORY.md` §4 MP-01~03, §5 W6）。

1. **数据层**：迁移 `056_geo_agent_tree.ts`（注册进 migrator 056）
   - `agent_regions` — 地理区划字典（province/city/district，含 `parent_region_id` 层级、`level`）
   - `platform_agents` — 代理商绑定区域（`region_id`、`agent_level`、`parent_agent_id`、`status`）
   - `agent_merchant_affiliations` — 商户入驻归属代理商（`agent_id`、`merchant_tenant_id`、`affiliation_status`）
   - 种子：广东省 → 广州市 → 天河区（+山东省/北京市）演示地理层级（TEST ONLY，诚实标注）
2. **API 层**：`PlatformAgentService` + `PlatformAgentController`
   - `GET /api/v1/platform/agents` — 省市区代理树 + 代理商 + 归属记录 + 可归属商户池（MP-01）
   - `POST /api/v1/platform/agents/regions` — 建立区域（省级无需父级；市级/区县需选父级）
   - `POST /api/v1/platform/agents` — 绑定代理商到区域（含省级/市级/区县级，可选上级代理）
   - `POST /api/v1/platform/agents/:id/affiliate` — 商户入驻归属（MP-02）
   - 全部需 `platform.read`/`platform.manage`；写操作需 `platform.manage`
3. **UI 层**：Platform PC `/p/agents` 省市区代理页（MP-01+MP-02）
   - 建立区域 / 绑定代理商 / 商户入驻归属 三个操作面板
   - 省市区代理树（root→child 递归渲染）+ 商户归属记录；全部 `--od-*` token，无 raw hex
   - 菜单目录 Platform 新增 `agents` → `/p/agents`「省市区代理」（network 分组）
4. **MP-03**：`/ch/dashboard` 代理商经营后台增强——商户队列行新增「归属省市区代理（区域 · 代理商）」一行（`ChannelDashboardService` 关联 `agent_merchant_affiliations`），已有渠道经营台即代理商后台。

## Verification

- `pnpm typecheck` **20/20 PASS**
- `pnpm build` **20/20 PASS**（platform-web 路由含 `/p/agents`）
- `tests/page-p-agents.test.mjs`（node API+DB，L2）**PASS**：登录系统账号读树（含种子广东/广州）；建区域→建省级代理→归属商户→**重复归属 409**；列表 agent 含 merchantCount=1、affiliations 含归属、merchantPool 已排除已归属商户；DB `agent_regions/platform_agents/agent_merchant_affiliations` 计数 1/1/1；无 token 401；非法 level 400
- 回归：`menu-dto.vitest.ts` **17/17 PASS**；`sys-6-network-packs`+`sys-29-admin-nav-groups`+`sys-28-platform-shell-isolation` **7/7 PASS**；`page-p-004-api.test.mjs`+`channel-001-api.test.mjs` **2/2 PASS**；`admin-shell-tokens`+`platform-shell-tokens` **4/4 PASS**
- DB：`oneday_v3_test` 迁移至 `056_geo_agent_tree:Up`

## Honest boundary

- 省市区区域/代理商/商户归属 = **本地试点记录**；未接美团实时代理/入驻/区域数据。
- 建区域/代理商/归属通过 UI 或 API 产生；迁移仅 seed 演示地理层级（TEST ONLY）。
- 本切片覆盖树/开通/归属（MP-01/02）与代理商后台关联行（MP-03 首刀）；深层代理结算/配额/审批续接 W∞ 逐片。
- Not full 美团代理后台 pixel parity；未接真实第三方数据。
- Do not auto-sign `PRODUCT_OWNER_UI_ACCEPTANCE.md`。
- Next: 继续 W∞ 其余 GAP 逐页，直到 owner 签 G1。

## Pre-existing failures not caused by this slice

- `tests/tokens.vitest.ts`、`tests/storefront-renderer.vitest.ts`（design-token `brand-800` 投影）在本次改动前即失败（`@oneday/design-tokens` / storefront 文件，本切片未触碰），与 W6 无关。
