# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task every 30m.
- IDE Agent: manual/review; no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task

- branch: `hardening/COMMERCIAL-COMPLETION`
- last_verified: **2026-08-12** — **W∞-103 消费者诚实信号 entry_funnel_events 过滤列修正 提交关闭**（见 CHANGELOG）
  - 修正：`consumer-discovery.service.ts` 两处 `entry_visits_30d` 子查询移除不存在的 `deleted_at` 过滤（`entry_funnel_events` 表无该列，真实执行会报 SQL 错误）；W103 测试断言由全文件贪婪 regex 改按子查询块断言，消除误报并锁定修正
  - **W97~104 关闭批次**（portal_bindings 员工/管理自定义装修 + 工作台产品深度）此前已提交并 push
- committed: **head `2dd8bd5`**（本刀新增 W103 修正提交已 push `origin/hardening/COMMERCIAL-COMPLETION`）
- tests: **`g1-winf*.test.mjs` 372/372** / `pnpm typecheck` **20/20** / `pnpm build` **20/20** / `pnpm test:unit` **49/49**
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
