# G1-W∞-93 ACCEPTANCE — Employee 员工客户详情 /e/customers/[id] 全标对概况条 + 真实数据分布 densify（ME-03 详情，toward PARITY）

- slice: `G1-R-EMPLOYEE-CUSTOMER-DETAIL-DEEP`
- status: PASS
- date: 2026-08-12 Asia/Shanghai
- executor: Cursor Headless CLI (authorization I)
- branch: `hardening/COMMERCIAL-COMPLETION`
- honest: 工程对标断言；不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；不宣称已接美团实时。

---

## 1. 范围（承接）

W∞-65 员工客户目录 `/e/customers` 真实数据深页密度 + W∞-91 管理面客户跟进明细 `/m/customers/[id]` 全标对概况条 + W∞-92 员工任务详情 `/e/tasks/[id]` 全标对概况条，本刀把 ME-03 的**员工客户详情 `/e/customers/[id]`**（美团商家端人员作业客户内页成熟场景）从旧「header + 渐变 hero(白卡灰底) + 一般 section」收束到员工面与美团商家端一致的 **topBar + heroCard + 概况条 `summaryStrip` + 分布面板 + honest** 三层级全标对视觉层级（与 `/e/tasks` 任务详情 W∞-92、`/e/customers` 收件箱 W∞-65 一致的白卡语言）。

## 2. 变更

### 2.1 `apps/employee-web/app/e/customers/[id]/customer-detail.tsx`

- 移除旧 `.header` 眉标（W∞-92 命名重构后该样式已不存在，旧页实为无样式残留），新增工具函数 `barWidth(total, value)`（宽度百分比）与 `countBy(items)`（真实档案行计数 + 频次降序）。
- 复用共享 `task-detail.module.css` 的全标对视觉类（`.topBar/.topBarTitle/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/... /.barEmpty/.panelHead/.panelMeta/.honest/.page/.section/.sectionHead/.customer/.evidence/.card/.footer/.centered`）。
- 全部由已抓取真实 `Detail` 档案行现场推导，禁止假 BI：
  - 白卡概况条 `aria-label="客户详情概况"`（4 列）：
    - 来源记录 `data.sources.length`
    - 归属记录 `data.ownerships.length`
    - 客户标签 `data.tags.length`
    - 相关任务 `data.tasks.length`
  - 白卡分布面板 `aria-label="客户详情分布"`：
    - 来源类型分布 `data.sources[].source_role`（经 businessLabel）
    - 归属角色分布 `data.ownerships[].ownershipRole`（当前员工标记 `我 · <角色>`）
    - 相关任务状态分布 `data.tasks[].status`（经 businessLabel）
    - 时间线动态分布 `data.timeline[].kind`（任务动态 / 客户动态）
  - 宽度百分比 `barWidth(total, item.value)`，空数据「暂无记录」。
- honest 底注：源 source=local，本页概况与分布全部由已抓取客户详情真实档案行现场推导，仅记录来源、归属、任务与入口痕迹，不含第三方订单履约与支付金额，非本平台下单，不代表第三方成交。
- 眉标从旧无样式 `推广员工具 · 我的客户` 收敛为 `推广员工具 · 客户详情`（与 `/e/customers` 收件箱 `推广员工具 · 客户目录` 的「工具身份 · <页面>」命名一致）。
- 保留全部状态（loading `正在加载客户详情` / forbidden `无法查看此客户` / error `客户详情暂不可用` + 重新加载）与全部交互（`返回` back、客户摘要身份、来源与归属、客户标签 `# <label>`、我的相关任务→`/e/tasks/[id]` 查看、时间线、客户目录/返回工作台深链）。**无 `经营` 字样、无页面级 `AdminPageHeader`/`Card`。**
- `data-testid="employee-customer-detail"`。

### 2.2 `apps/employee-web/app/e/tasks/[id]/task-detail.module.css`（共享，W∞-92 已全标对）

- 本刀零 CSS 变更：`.topBar`（sticky 黄顶栏 `linear-gradient(180deg,#ffe14d,#ffd100)`）+ `.page` 灰底画布 `background:#f5f5f5` + `.summaryStrip`（黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)` + `rgb(255 209 0 / 35%)` + `repeat(4)` + `≤580px` 两列）+ `.bars/.barRow/.barTrack/.barFill`（灰底白卡 + 黄渐变色条 `linear-gradient(90deg,#ffd100,#f0a500)` + `≤580px` 条宽压缩）+ `.honest` 全部由 W∞-92 就位，本页直接复用。

## 3. 无 schema / 无 DB / 无 API

全部由既有 `/api/v1/employee/customers/:id` 已加载的 `Detail` 真实字段现场推导。不复活 consumer_orders / 本平台下单/收单。

## 4. 验证证据

- 自测：`tests/g1-winf93-employee-customer-detail-deep.test.mjs` 5/5（黄顶栏+灰画布+data-testid / summaryStrip+分布面板 `barWidth`+`countBy`+四类分布 / 真实数据推导严禁假 BI / 诚实边界 / 全状态与全交互保留）。
- 相关回归：`tests/g1-winf30-oneday-eyebrow-copy.test.mjs`（employee customer-detail 断言 `推广员工具 ·` 且无 `ONEDAY /`）通过。
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **337/337**（原 332 + 新增 5）。
- `pnpm typecheck` → **20/20**；`pnpm build` → **20/20**（employee-web 含 `/e/customers/[id]` 动态路由）。
- `pnpm test:unit` → 47 passed；2 个 pre-existing token/storefront-renderer 失败照旧（clean HEAD 同样失败）。
- 变更 TS / 新 test `eslint` + `prettier` 全 clean。

## 5. 诚实边界

- 分布全部由已抓取客户详情档案行现场推导（source=local），不伪造第三方评分/成交（禁止假 BI）。
- 仅记录来源、归属、任务与入口痕迹；不含第三方订单履约与支付金额、非本平台下单、不代表第三方成交。
- 员工客户关系为推广员工具工作流（归属/协作），非管店/销售竞品。
- 工程对标断言，不构成 owner 验收签字。
