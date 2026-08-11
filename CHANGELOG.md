# Changelog

## 2026-08-11

- **G1-W∞-23** Management entry/trace page heading alignment (`G1-R-TOOL-PATH-EXPERIENCE`): 把四个管理端店务店务原生页头/状态语裁定档到推广员工具入口/档案身份——`/m/offers` 页头+loading/forbidden `商品管理→商品/套餐入口`（对齐导航与 W∞-19 眉标）、`/m/stores` `门店管理→门店入口`、`/m/marketing` `营销中心→营销活动`（对齐导航）；`/m/reviews` 导航+页头+状态 `评价管理→评价档案`（`packages/contracts/src/menu.ts` label 同步，同 `订单痕迹` 档案语义）。四页诚实无销售边界全保留（不在此售卖下单、不代替平台下单/支付、不接第三方评价流、不伪造第三方评分、不接美团/抖音实时投放、非本平台成交）。Text/copy+导航 label，无 schema/DB/API 变更，不复活本平台下单/收单。新增 `tests/g1-winf23-nav-heading-alignment.test.mjs` 5/5，随动更新 `tests/e2e/management-stores.spec.ts` forbidden 断言（`无权查看门店管理→无权访问门店入口`）。typecheck+build 20/20、`g1-winf*.test.mjs` 30/30、menu 相关 `.test.mjs` 11/11、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。证据 `evidence/G1-MEITUAN-PARITY/WINF23/ACCEPTANCE.md`。Not owner sign-off.
- **G1-W∞-22** Management orders-page trace framing (`G1-R-TOOL-PATH-EXPERIENCE`): 把 `apps/management-web/app/m/orders/page.tsx` 从旧式店务货架「订单中心」语裁定档到推广员工具「订单痕迹」身份——标题 `订单中心→订单痕迹`、eyebrow `推广员工具 · 订单档案→推广员工具 · 订单痕迹`（与 W∞-21 菜单 label `订单痕迹` 对齐），loading/forbidden/error/empty 文案同步；汇总条把原生收单/履约度量改为诚实档案口径（`订单数→档案记录数`、`已支付/核销→状态为有效的记录`、`本列表金额→记录金额参考`、`门店→涉及门店`），并补强诚实边界（不包含本平台收款、不代表第三方订单履约、非本平台下单、不接美团实时订单、不伪造第三方成交、source=local）。Text/copy-only，无 schema/DB/API 变更，不复活本平台下单/收单。新增 `tests/g1-winf22-order-trace.test.mjs` 3/3，随动更新 `tests/g1-winf17-workbench-commerce.test.mjs`（eyebrow `订单档案→订单痕迹`）。typecheck+build 20/20、`g1-winf*.test.mjs` 25/25、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。证据 `evidence/G1-MEITUAN-PARITY/WINF22/ACCEPTANCE.md`。Not owner sign-off.
- **G1-W∞-21** Tool-path experience parity (`G1-R-TOOL-PATH-EXPERIENCE`): ① 管理端彻底去「商家中心」货架经营痕迹——`ManagementShell` sidebar `product="推广员工具"`（含 loading/forbidden 文案）、工作台 hero `推广员工具 · 管理工作台`、快捷入口 desc `入口页装修`/`工具设置`，product-switcher 标签 `推广员工具`；② `MANAGEMENT_MENU_CATALOG` 六项改挂入口/痕迹/工作流语义（门店管理→门店入口、商品管理→商品/套餐入口、订单中心→订单痕迹、店铺装修→入口页装修、商家设置→工具设置、经营建议→作业建议）；③ 消费者第三方命名一致性补漏：service/profile/process/group-buy/menu/会员/历史入口 `美团/抖音/扫呗` 显式（沿用 W∞-20）；④ 商圈仪表「订单」→「入口转化」、`/c/entry` 落地方案「成交在美团/抖音/扫呗等外部平台完成」。Honest no-native-checkout boundary 全保留，无 schema/DB/API 变更。typecheck+build 20/20、`g1-winf*.test.mjs` 19/19、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint clean。附带动向：W∞-12/10 断言与 SYS-26 跟随新文案更新；`recovery-report.json` 被运行中后台轮询改动已 revert 未纳入。证据 `evidence/G1-MEITUAN-PARITY/WINF21/ACCEPTANCE.md`。Not owner sign-off.
- **G1-W∞-20** Third-party platform-naming consistency (`G1-R-TOOL-PATH-EXPERIENCE`): shared `@oneday/storefront-renderer` adds `storefrontPlatformName`/`storefrontPlatformMarkClass` + 扫呗 glyph（`扫`）+ `--od-sf-platform-saabei` mark token; `/c/stores` group-buy/menu `platformName` and badges render 扫呗/外链 explicitly; `/c/services` `PlatformOffer.platformType` widened to include `'saabei'` + `platformLabel` names 扫呗. Honest no-native-checkout boundary retained everywhere. Copy/renderer-only, no schema/DB. typecheck+build 20/20, `g1-winf*.test.mjs` 18/18, unit 47 passed (2 documented pre-existing token failures unchanged). Evidence: `evidence/G1-MEITUAN-PARITY/WINF20/ACCEPTANCE.md`. Not owner sign-off.
- **G1-W∞-19** Management tool-path gap normalization (`G1-R-TOOL-PATH-GAPS`): retired last「美团商家端 PC」eyebrows on `/m/offers`（→ 推广员工具 · 商品/套餐入口）and `/m/stores`（→ 推广员工具 · 门店入口）for consistent promotion-tool identity; honest no-sales boundary. Text-only; no native checkout. Evidence: `evidence/G1-MEITUAN-PARITY/WINF19/ACCEPTANCE.md`. Not owner sign-off.
- **G1-W∞-18** Admin dashboards + consumer profile densify (`G1-R-ADMIN-DASHBOARDS`): Management /m/dashboard 商家中心 + Platform /p//bc dashboards + Consumer /c/profile tool identity + no-deal disclaimer. Evidence: evidence/G1-MEITUAN-PARITY/WINF18/ACCEPTANCE.md.
- **G1-W∞-3** External hand-off confirm densify (MH5-12): `/c/actions` platform preview + honest no-deal disclaimer + scene-derived funnel surface. Evidence: evidence/G1-MEITUAN-PARITY/WINF3/ACCEPTANCE.md.
- **TOOL-PHASE-6** L2 completeness: one-code visit emit, circle invite/apply emit, employee share↔open funnel events + summary sharePairing. Evidence: evidence/TOOL-PHASE-6/ACCEPTANCE.md.
- **TOOL-PHASE-5** Saved DIY funnel views (`060_entry_funnel_saved_views` + `/m/entry-funnel` save/load/delete). Evidence: evidence/TOOL-PHASE-5/ACCEPTANCE.md.
- **TOOL-PHASE-4** DIY entry-funnel query + interpret-only insights on /m/entry-funnel (no deal fabrication). Evidence: evidence/TOOL-PHASE-4/ACCEPTANCE.md.


- **TOOL-PHASE-3** L2 module_impression + industry templates (restaurant/beauty/retail) on /m/entry-funnel. Evidence: evidence/TOOL-PHASE-3/ACCEPTANCE.md.


- **TOOL-PHASE-2** 商圈单独页双身份：/c/circles + /m/circles + invite/apply + geo/public_visible. Evidence: evidence/TOOL-PHASE-2/ACCEPTANCE.md.


- **TOOL-PHASE-1** Consumer funnel client emit (visit/dwell/jump/share) + Management /m/entry-funnel module-named board + settings「全平台可见引流」. Evidence: evidence/TOOL-PHASE-1/ACCEPTANCE.md.


- **G1-W∞-2** Consumer H5 搜索 (`G1-R-MEITUAN-H5-SEARCH`, MH5-02). `GET /api/v1/consumer/search`（租户 fail-closed 按名检索已发布商户）+ Consumer H5 `/c/search` 美团 App 搜索面（结果卡含 local_pilot 评分/月售/距离，进店深链）；`/c/discovery` 搜索壳接为可点击入口。Typecheck 20/20 + build 20/20（consumer 路由新增 `/c/search`）+ `page-c-consumer-search` L2 + `page-c-002` 回归 PASS. Evidence: `evidence/G1-MEITUAN-PARITY/WINF2/ACCEPTANCE.md`. Not owner sign-off.
- **G1-W4** Employee H5 -> 美团商家 App 工作台 (`G1-R-MEITUAN-EMPLOYEE-WORKBENCH`). Workbench 今日经营概览条 + 常用功能宫格（订单待办/顾客/会员核销/获客线索/门店/消息），全部真实 workbench 数据 + 既有路由深链。Evidence: `evidence/G1-MEITUAN-PARITY/W4/ACCEPTANCE.md`.
- **G1-W2** Consumer H5 -> 美团 App nearby + merchant header (`G1-R-MEITUAN-H5-NEARBY-STORE`). Evidence: `evidence/G1-MEITUAN-PARITY/W2/ACCEPTANCE.md`.
- **G1-W1** Meituan merchant PC nav + 商家中心 workbench (`G1-R-MEITUAN-PC-NAV-HOME`). Evidence: `evidence/G1-MEITUAN-PARITY/W1/ACCEPTANCE.md`.
- Product bar locked: Consumer H5->美团 App; Employee H5->美团商家 App; Management PC->美团商家 PC; Platform PC->美团平台/代理 PC.
- Consumer discovery: nearby/好评/人气 sort chips + local_pilot rating/salesHint.
- Pilot logins prefilled (management/employee/platform).

- **G1-W3** Management PC store/goods Meituan IA densify. Evidence: evidence/G1-MEITUAN-PARITY/W3/

- **TOOL-PHASE-0** Entry funnel L0+L1+L2 (entry_funnel_events) + platform_visible_traffic + nearby visibility + saabei platform type. Abandoned consumer_orders WIP (no-sales identity). Evidence: evidence/TOOL-PHASE-0/ACCEPTANCE.md.
