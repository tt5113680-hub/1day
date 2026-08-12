# G1-W∞-82 Management `/m/settings` 工具设置真实数据深页 densify（MPC-12，toward PARITY）

- recorded_at: 2026-08-12
- status: **PASS**
- branch: `hardening/COMMERCIAL-COMPLETION`
- product_filter: 统一入口 / 工作流 / 痕迹；不碰钱·销售·本平台下单；不复活 consumer_orders

## Delivered

- `/m/settings`（工具设置 MPC-12）承接 W∞-25/26（眉标/状态口径）+ W∞-43（视觉/IA densify），补上 Management MPC 面唯一仍缺的「真实数据深页分布」缺口：
  - 新增白卡概况条 `aria-label="工具规则概况"`（审批开关 / 默认时限 / 归属分配 / 全平台可见）
  - 新增白卡分布面板 `aria-label="工具规则分布"`——审批开关 / 提醒时限 / 免打扰 / 标签规则 / 归属分配 / 全平台可见引流，全部由**当前已加载真实工具规则档字段**现场推导（`settings.approvals.*`、`settings.reminders.*`、`settings.doNotDisturb.enabled`、`settings.tags.*`、`settings.ownership.allocation`、`platformVisible`），禁止假 BI
  - 宽度百分比 `barWidth(total, item.value)`，空数据「暂无记录」
  - `page.module.css` 新增 `.panel/.summaryStrip/.panelHead/.panelMeta/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（`linear-gradient(90deg,#ffd100,#f0a500)`），≤900px 单列堆叠（与 Management MPC 深页序列共享视觉语言）
  - honest 底注：source=local、当前工具规则档字段现场推导、全平台可见只影响入口曝光、痕迹为观看/访问/跳转、不含支付金额与第三方订单成功、不包含本平台收款、非本平台下单
- 无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单；原交互（提醒/审批/免打扰/标签/归属/品牌表单 + 保存 + 全平台可见引流开关 + 工具链接）全继承

## Verification

- 新增 `tests/g1-winf82-management-settings-deep.test.mjs` 4/4
- `g1-winf*.test.mjs` 286/286 全绿（含新增 4）
- g1-winf26（settings tool-state copy）+ g1-winf43（visual）9/9 回归通过；menu-dto.vitest.ts 17/17
- management-web typecheck + build（29 routes 含 `/m/settings`）PASS
- `pnpm typecheck` 20/20；`pnpm build` 20/20
- 单测 47 passed（2 个 pre-existing token 失败照旧：`tokens.vitest.ts`、`storefront-renderer.vitest.ts`，已验证 stash 后于 clean HEAD 同样失败，与本改动无关）
- eslint + prettier clean

## Honest boundary

- 不复活 consumer_orders / 本平台下单/收单；不含支付金额、销售成交或第三方订单履约状态
