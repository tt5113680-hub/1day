# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task every 30m.
- IDE Agent: manual/review; no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task

- branch: `hardening/COMMERCIAL-COMPLETION`
- last_verified: **2026-08-12** — **W∞-104 员工 H5 + 管理 PC 自定义装修 PASS**（portal_bindings 全链路）
  - **W99~103** 工作台产品深度（见 CHANGELOG）
  - **W104** `portal_bindings` + page-builder 员工/管理发布预览 + workbench/dashboard layout 渲染 + seed + g1-winf104 7/7
- committed: **head `16ea7f7`**（W97~104 关闭批次已提交并 push `origin/hardening/COMMERCIAL-COMPLETION`；此前该批次已验证但未提交）
- tests: **`g1-winf*.test.mjs` 372/372**（含 W43 page-builder 复制断言随 W104 收敛）/ `pnpm typecheck` + `pnpm build` **20/20** / `pnpm test:unit` **49/49**
- next_wave: **主人 UI 验收** — 含 `/m/page-builder` 员工/管理端装修与预览
- blocker: **none (engineering)** — **human gate open**

## Owner — tomorrow 验收清单

1. Hub **http://127.0.0.1:3299/**（端口见 `LOCAL_HUMAN_PILOT_RUNBOOK.md`）
2. **管理端** `/` 早会 KPI（无 GMV）→ 深页 `/m/orders|reviews|notifications|analytics` KPI 条与工作台同源
3. **员工端** `/e/workbench` → 深页 `/e/share|nurture|leads|memberships` KPI 条同源
4. **平台/渠道/商圈** `/p/dashboard` `/ch/dashboard`（renewal/onboarding 队列）`/bc/dashboard` `/p/outbox` 运营 KPI 条
5. **消费者** `/c/discovery` + `/c/search`：评分「档案评价/试用分」、人气「30日入口/试用月售」诚实标注
6. **装修** `/m/page-builder`：消费者数字门店 + **员工 H5 工作台** + **管理 PC 首页** 模板发布/预览（员工 `/e/workbench?preview=`、管理 `/?preview=`）
7. Walk `PRODUCT_OWNER_UI_ACCEPTANCE.md`（6 items PASS/HOLD）
8. Sign product owner name + date — **agent must not sign**

### New-window paste

```text
继续
```
