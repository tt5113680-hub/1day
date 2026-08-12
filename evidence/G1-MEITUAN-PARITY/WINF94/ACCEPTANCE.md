# G1-W∞-94 ACCEPTANCE — Employee 记录跟进 /e/tasks/[id]/follow-up 全标对 topBar+heroCard 收束（ME-02 子作业，toward PARITY）

- slice: `G1-R-EMPLOYEE-FOLLOW-UP-PARITY`
- status: PASS
- date: 2026-08-12 Asia/Shanghai
- executor: Cursor Headless CLI (authorization I)
- branch: `hardening/COMMERCIAL-COMPLETION`
- honest: 工程对标断言；不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；不宣称已接美团实时。

---

## 1. 范围（承接）

四端 W∞ 波本已闭合（Management MPC W∞-45~91 + Employee ME-02 详情 W∞-92 `/e/tasks/[id]` + ME-03 详情 W∞-93 `/e/customers/[id]` 全标对概况条/分布，含关断守卫 W∞-89/90）。本刀发现并修复 **员工记录跟进 `/e/tasks/[id]/follow-up`（ME-02 的子作业，美团商家端人员作业「记录跟进/沟通进展」成熟场景）** 仍引用 W∞-92 命名重构后已删除的 `.header` 样式类，导致该页顶栏为**无样式残留**：

- `follow-up.tsx` 旧 `styles.header` 在共享 `task-detail.module.css` 中（W∞-92 已改为 `.topBar`) **已不存在** → 页头完全无样式；
- 旧 `styles.hero`（灰底 intro）让「先保留原始信息」成为页内零强调的一般块，无法回答美团商家端「进页即知在做什么」的成熟场景信息架构；
- 旧 `StatusBadge 可编辑总结` 在顶部右位，信息密度与层级与美团商家端作业页（顶栏 + hero 说明 + 分区白卡表单）不一致。

本刀把该页收束到与 `/e/tasks/[id]`（W∞-92）、`/e/customers/[id]`（W∞-93）一致的 **topBar + heroCard + 白卡 section 表单 + honest** 全标对视觉层级，复用共享 `task-detail.module.css` 全标对视觉类，零 CSS 新增。

## 2. 变更

### 2.1 `apps/employee-web/app/e/tasks/[id]/follow-up/follow-up.tsx`

- **移除无样式残留**：删除引用已不存在 `.header` 的页头（`styles.header` / `styles.back`），删除旧的 `StatusBadge 可编辑总结` 顶栏右位与 `styles.hero` 灰底 intro。
- **改挂全标对顶栏 + heroCard**：
  - `<header className={styles.topBar}>` + `<span className={styles.topBarTitle}>推广员工具 · 任务跟进</span>`（sticky 黄顶栏 `linear-gradient(180deg,#ffe14d,#ffd100)`，与 `/e/tasks` `/e/tasks/[id]` 视觉一致）+ `<button className={styles.topBarRefresh}>返回</button>`（`history.back()`）。
  - `<section className={styles.heroCard} aria-label="记录本次进展">`：`<h1>记录本任务进展</h1>` + 诚实描述「先保留原始动作、文字与语音转写；总结可编辑，原始记录将与任务一同保存。」
- **保留全部既有交互与状态**：动作选型（call/visit/message/other）、原始文字/语音转写、可编辑总结、创建下一任务（标题+时间）、历史跟进列表（`items.map`）、保存跟进（幂等 POST `/follow-ups`）、loading/forbidden/error 三态（`正在准备跟进记录`/`无法记录跟进`/`跟进记录暂不可用` + 重新加载）与成功/失败反馈提示。
- **新增 honest 底注**：`跟进记录与原始档案保存于推广员工具的任务痕迹(source=local)。动作、文字与语音转写用于整理跟进过程，不代履约美团/抖音订单，非本平台下单，不含第三方订单履约与支付金额。`
- **新增 `data-testid="employee-follow-up"`**。
- 移除不再使用的 `StatusBadge` 导入（保持 import 干净、eslint clean）。
- **无 `经营` 字样、无页面级 `AdminPageHeader`/`Card`。** 不复活 consumer_orders / 本平台下单/收单。

### 2.2 `apps/employee-web/app/e/tasks/[id]/task-detail.module.css`（共享，W∞-92 已全标对）

本刀零 CSS 变更：`.topBar/.topBarTitle/.topBarRefresh/.heroCard/.heroCard h1/.heroCard p/.section/.card/.evidence/.feedback/.empty/.honest/.footer/.centered` 全部由 W∞-92 就位，本页直接复用（灰底画布 `#f5f5f5` + 白卡 + 黄顶栏）。旧 `.hero` muted 块样式仍在文件中，但本页不再引用页头，仅由 `/e/tasks/[id]` 的截止时间块使用，不残留第二套页头。

## 3. 无 schema / 无 DB / 无 API

全部为前端 chrome/copy 收束，数据仍走既有 `/api/v1/employee/tasks/{id}/follow-ups`。不复活 consumer_orders / 本平台下单/收单。

## 4. 验证证据

- 自测：`tests/g1-winf94-employee-follow-up-parity.test.mjs` **4/4**（① 收敛到共享 `.topBar/.topBarTitle/.topBarRefresh`、不再引用 `.header/.back`、CSS 无 `.header`、保留 `推广员工具 · 任务跟进`；② `data-testid="employee-follow-up"` + `.heroCard` + `记录本任务进展` + 诚实边界 source=local/不代履约美团抖音订单/非本平台下单/不含第三方订单履约与支付金额、无 `本平台收款`、`page` 灰底 `#f5f5f5`；③ 全部原交互 copy 与三态 scope 保留、无 `ONEDAY /`；④ 无假 BI metric/mock）。
- 相关回归：`tests/g1-winf30-oneday-eyebrow-copy.test.mjs`（empFollowUp 断言 `推广员工具 ·` 且无 `ONEDAY /`）通过。
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **341/341**（原 337 + 新增 4）。
- `pnpm typecheck` → **20/20**（employee-web 实跑，改动文件 cache miss 重新校验）。
- `pnpm build` → **20/20**（employee-web 含 `/e/tasks/[id]/follow-up` 动态路由）。
- `pnpm test:unit` → 47 passed；2 个 pre-existing token/storefront-renderer 失败照旧（clean HEAD 同样失败，未新增）。
- 变更 TS / 新 test `eslint` + `prettier` 全 clean。

## 5. 诚实边界

- 跟进是推广员工具工作流（整理动作/语言/总结 + 下一任务），不代履约美团/抖音订单、非本平台下单、不含第三方订单履约与支付金额。
- 无 `经营` 字样、无本平台收款；不复活 consumer_orders / 本平台下单/收单。
- 工程对标断言，不构成 owner 验收签字；不宣称已接美团实时。
