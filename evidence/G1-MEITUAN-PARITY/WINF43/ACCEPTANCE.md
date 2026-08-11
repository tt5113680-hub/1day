# G1-W∞-43 Management 员工·权限 / 入口页装修·营销内容·工具设置 视觉/IA densify toward Meituan merchant PC (MPC-10/11/12)

- slice: `G1-R-MANAGEMENT-SETTING-PEOPLE-CONTENT-VISUAL`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; MPC-10/11/12 PARTIAL→toward PARITY)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

`/m/organization-employees`（员工管理，MPC-10）+ `/m/roles-permissions`（角色权限，MPC-10）+ `/m/content`（营销内容，MPC-11）+ `/m/page-builder`（入口页装修，MPC-11）+ `/m/settings`（工具设置，MPC-12）由旧 `AdminPageHeader` + `Card` 品牌渐变改为美团商家端 PC 视觉/IA 密度：

- **黄顶栏** `topBar`：顶栏承载既有 eyebrow（`推广员工具 · 员工管理` / `· 角色权限` / `· 营销内容` / `· 入口页装修` / `· 工具设置`）+ 右上「刷新」。
- **灰底白卡** 画布（`background:#f5f5f5`）+ **heroCard** 白卡（`h1` 标题 + 诚实描述）。
- **概况条** `summaryStrip`（数据列表页：员工管理=组织/商户/在岗员工/待接受邀请；角色权限=角色模板/受影响成员/权限项/高风险权限；营销内容=内容/已审批/已投放门店/可投放门店；入口页装修=门店模板/已发布数字门店/模块契约/同渲染器预览）。设置页为表单配置页不套概况条。
- **白卡面板**（`.panel` / `.create` / `.contentCard` 等）层级组织；移除五个页面级 `AdminPageHeader` / `Card` / `eyebrow=` 依赖（视觉 densify，与 W∞-35/38/39/40/41/42 盘统一）。
- 保留全部工具身份与诚实边界（不另造第二套 API、高风险权限二次确认、渠道无授权不伪造发送、共用一套 Storefront 绑定、不碰销售成交、不含支付金额与第三方订单成功）。
- 保留全部 e2e hooks 与关键交互（`management-organization-employees` / `management-roles-permissions` / `management-content` / `management-page-builder` / `management-settings` data-testid、办理离职、查看与变更、创建草稿、进入装修、保存工具设置、默认时限等）。
- 保留 `title`/loading/forbidden/error/empty 全状态语裁定档（W∞-21/24/25/26/27/28/29/30 工具身份收尾全继承）。

无 schema/DB/API 变更；纯前端视觉/IA densify；不碰钱/销售/管店；不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/organization-employees/page.tsx + page.module.css`
- `apps/management-web/app/m/roles-permissions/page.tsx + page.module.css`
- `apps/management-web/app/m/content/page.tsx + page.module.css`
- `apps/management-web/app/m/page-builder/page.tsx + page.module.css`
- `apps/management-web/app/m/settings/page.tsx + page.module.css`
- `tests/g1-winf43-management-setting-people-content-visual.test.mjs`（新增 5/5，验证五页盘）
- `tests/g1-winf25-management-tool-eyebrow-alignment.test.mjs`（随动：org/roles/content/builder/settings 去 `eyebrow=` 断言）
- `tests/g1-winf26-settings-tool-state-copy.test.mjs`（随动：settings `eyebrow=` prop → `topBarTitle` + `<h1>` 断言）

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf43*.test.mjs tests/g1-winf25*.test.mjs tests/g1-winf26*.test.mjs  # 14/14
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                                                   # 120/120
pnpm --filter @oneday/management-web typecheck && build                                                    # PASS (28 routes)
pnpm build                                                                                                 # 20/20
npx vitest run                                                                                             # 47 passed（2 个 pre-existing token 失败照旧）
npx eslint <changed files>                                                                                 # clean
npx prettier --check <changed files>                                                                       # clean
```

## Gates

- typecheck PASS；build PASS（management-web 28 routes，含 `/m/organization-employees`/`/m/roles-permissions`/`/m/content`/`/m/page-builder`/`/m/settings`）；`pnpm build` 20/20。
- `g1-winf43` 5/5；`g1-winf*.test.mjs` 120/120。
- 单测 47 passed（2 个 pre-existing token 失败照旧）；eslint + prettier clean。
- 不碰钱/销售/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
