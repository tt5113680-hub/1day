# G1-W∞-80 Management `/m/stores` 门店入口真实数据深页 densify（MPC-02，toward PARITY）

- recorded_at: 2026-08-12
- status: **PASS**
- branch: `hardening/COMMERCIAL-COMPLETION`
- product_filter: 统一入口 / 工作流 / 痕迹；不碰钱·销售·本平台下单；不复活 consumer_orders

## Delivered

- `/m/stores`（门店管理 MPC-02）承接 W∞-19/23（工具身份）+ W∞-38（视觉/IA densify），补上「真实数据深页」缺口：
  - 新增白卡分布面板 `aria-label="门店入口分布"`——营业状态 / 负责人指派 / 启用平台入口 / 服务覆盖 / 近30日入口打开 / 待跟进负载，全部由真实 `stores[]` 档案行现场推导（禁止假 BI）
  - 宽度百分比 `barWidth(total, item.value)`，空数据「暂无记录」
  - `page.module.css` 新增 `.panelHead/.panelMeta/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条（`linear-gradient(90deg,#ffd100,#f0a500)`），≤900px 单列堆叠（与 Management MPC 深页序列共享视觉语言）
  - honest 底注：source=local、第三方入口仅记录跳转、不包含本平台收款、非本平台下单
- 无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单；原交互（保存门店资料/指派负责人/第三方入口增编）全继承

## Verification

- 新增 `tests/g1-winf80-management-stores-deep.test.mjs` 4/4
- 随动更新 `tests/g1-winf38-management-stores-visual.test.mjs`（honest 边界断言 `本平台下单` → `非本平台下单`，对齐 W∞-47 offers 先例）
- `g1-winf*.test.mjs` 277/277 全绿
- management-web typecheck + build（29 routes 含 `/m/stores`）PASS
- `pnpm typecheck` 20/20；`pnpm build` 20/20
- eslint + prettier clean
- 注：完整 `node --test tests/*.test.mjs` 中 8 项失败（hardening-001/002、page-c-002-api、page-c-consumer-search、sys-11、sys-22、sys-5×2）为 HEAD 既有的 token/CSS 与本地运行态断言，与本次 `/m/stores` 改动无关（已验证 stash 后于 clean HEAD 同样失败）
