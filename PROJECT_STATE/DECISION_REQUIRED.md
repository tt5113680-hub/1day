# DECISION_REQUIRED

## Resolved (2026-08-10 — owner authorized Cursor Agent takeover)

| Decision                   | Resolution                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Code executor              | Cursor Agent replaces Codex                                                                        |
| Batch gates                | Batch 3 PASS; proceed Batch 4 clean-tenant rehearsal only                                          |
| Thousand-enterprise faces  | Template + module whitelist + brand config; no arbitrary low-code                                  |
| Design bar                 | Five enterprise-class standards (IA, design system, config-driven, closed-loop, honest boundaries) |
| Consumer bottom navigation | **Fixed five tabs during transition**; data-driven channels deferred post–Batch 4 PASS             |

## Full autonomous authorization A–H (2026-08-10 — owner: 以上问题全部授权)

| Id  | Authorization                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | After Batch 4 PASS, automatically continue into Storefront module-renderer unification (remove hard-coded Banner/shortcuts; modules-driven), then matrix gap close-out. Still no page-level patches or arbitrary low-code.                  |
| B   | Auto-commit after each verified sub-gate (code, evidence, PROJECT_STATE, CHANGELOG).                                                                                                                                                        |
| C   | Push branch `hardening/COMMERCIAL-COMPLETION` to `origin` allowed (`-u` on first push). No force-push; do not rewrite `main`.                                                                                                               |
| D   | May start/restart Docker Postgres, local API/four webs/Worker, migrate/seed only on isolated test/rehearsal DBs, install project deps. Must not touch `D:\1DAY_V2` or delete Docker volumes/databases.                                      |
| E   | May run full format/lint/typecheck/build/test/Playwright/evidence and write `evidence/BATCH-4/` etc.                                                                                                                                        |
| F   | On undocumented product details: follow `COMMERCIAL_PRODUCT_BLUEPRINT`, `HIGH_FIDELITY_TEMPLATE_SYSTEM`, `COMMERCIAL_ACCEPTANCE_MATRIX`. BLOCKED only for external commercial claims, public production go-live, or product-freeze changes. |
| G   | Tencent Cloud / public HTTPS / production secrets: **out of scope this phase**.                                                                                                                                                             |
| H   | Operator keeps machine awake and Cursor open with Agent auto-run where possible; agent does not wait for interactive approval between authorized gates.                                                                                     |
| I   | **Local unattended construction (2026-08-10 — owner: 本地跑，不要人工):** Cursor Headless CLI via `scripts/local-unattended-construction.ps1` + scheduled task or daemon is the sole write executor during unattended windows. IDE Agent must not write in parallel. Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`. |

## Resolved (2026-08-10 — local unattended)

| Decision              | Resolution                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| Local unattended mode | Headless CLI + Windows Task Scheduler / daemon; no IDE window chaining     |
| Human gates           | G1 local full test + G2 cloud inventory only; not per construction turn    |

## Resolved (2026-08-11 — system identity: 团购推广员工具)

| Decision | Resolution |
| -------- | ---------- |
| Who we are | **各大团购平台的推广员** + 自有 **统一入口分流管理平台**；以 **工具** 身份出现。 |
| Only do | **统一入口**、**统一整合生态**、**统一工作流管理**。 |
| Never do | **不碰钱、不碰销售、不碰管理**；其它用第三方；与美团/抖音等只助力不竞争。 |
| 自营 | 第三方；首选 **扫呗小程序 + 收银软件**（入口/外链，非本平台收单）。 |
| 附近范围 | **全平台**中已开通且选择 **全平台可见引流** 的租户商家。 |
| 商圈 | **单独页面**；租户双身份（建/管自己的商圈 + 消费者看附近商圈）；经理邀约；商家可申请加入。 |
| 可抓痕迹 | **L0+L1+L2 同批交付**（观看/访问/跳转/停留/分享 + 来源/入口面/模块位/跳转平台/会话/粗地理/回访 + 滚动深度/模块曝光/分享配对/商圈邀约申请/跳转确认率等）。分析=模块命名+行业模板/自助/AI。**不抓成交金额。** 见策略 §2（2026-08-11 12:04）。 |
| 微站/官网/C 端首页 | **同一个首页**，仅 UI 模板与功能样式不同。 |
| Detail | `PRODUCT_DUAL_TRACK_STRATEGY.md`（2026-08-11 11:48）。 |

## Resolved (2026-08-11 — commercial Meituan full-parity premise)

Owner reconfirmed (2026-08-11 ~21:47): **完整对标是商用前提，不是可选 polish。**

| Surface | Learning source | Bar |
| ------- | --------------- | --- |
| Consumer H5 | 美团 App 到店浏览 | **完整对标** |
| Employee H5 | 美团商家端人员作业 | **完整对标** |
| Management/Owner PC | 美团商家端 PC | **完整对标** |
| Platform/Channel/Circle PC | 美团平台/代理后台 | **完整对标** |
| `/m/workflows` | — | **唯一例外：ONEDAY 定制，不做美团** |

Rules:

1. Cannot claim 商用 / G1 complete until four surfaces reach inventory `PARITY` (or `CUSTOM` for workflows only).
2. Tool-identity copy waves (W∞-*) are necessary but **not sufficient** for the commercial bar.
3. Agent must continue visual + IA densify toward Meituan mature scenes; do not reframe the bar as 「文案收尾即可」.
4. Still: 不做美团产品本体；不碰钱/销售/本平台下单；底盘仍是 ONEDAY.

## Resolved (2026-08-10 — dual-track IA; identity superseded 11:48 where conflicting)

| Decision | Resolution |
| -------- | ---------- |
| Chassis / UI habit | 保留 ONEDAY 底盘；入口/LBS/店页/商圈页套用成熟交互习惯。 |
| Channel / onboarding | 代理层级 + 省市区开通归属。 |
| Chrome color | 美团黄默认（熟悉度）；可换肤。 |
| G1 status | 按工具身份与入口/痕迹完整度验收；不自动代签。 |

## Open (will BLOCKED)

| Decision                                      | Default if blocked                                                 |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Product-owner Consumer UI visual sign-off     | Does not block Batch 4 technical PASS; blocks external pilot claim |
| Public HTTPS pilot on Tencent Cloud           | STOP until owner **explicitly lifts G** and supplies cloud inventory (see `PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md`) |
| Change PRODUCT_FREEZE / claim SaaS commercial | STOP — need explicit owner decision                                |

## Owner intent (2026-08-10, not yet formal G lift)

Owner directed Phase-1 goal = **usable commercial closed loop for real customer trial**, including public HTTPS and promotion-grade visual baseline; non-essential deferred to v2.  
Cloud account/domain/cert may have been shared in prior chats — **nothing is in this repo** (correct). Agent must collect checklist in `PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md` §2 and must **not** start public deploy until owner replies with explicit **「授权公网 HTTPS / 腾讯云试点」** plus missing inventory.

## Owner cooperation protocol (2026-08-10)

- Agent must warn at **≥90%** chat usage/context pressure and provide a new-window paste prompt. Do not stop early around ~40%.
- Agent must front-load all owner cooperation questions at session start / before long runs.
- Owner keeps machine awake, Cursor open, and Agent Auto-run enabled during autonomous work (authorization H).

## Resolved (2026-08-12 — Meituan depth plan owner adjustments)

Owner accepted IDE depth plan with these hard overrides (see `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md`):

| Item | Resolution |
| ---- | ---------- |
| §2 可深度建设 | **必须达到目标深度**（作业闭环，不得停在壳/分布条） |
| §3 底座+产品深度 | **目标 100%**（Blueprint / 各端产品深度拉满） |
| §4 对标深度模型 | **继续做到 100%**（列表→筛→详→操作→审计） |
| §5 开通 READY 工程 | **ACTIVE — 主人 2026-08-15「开始第五节」**；W∞-125/126/127 PASS；NEXT W∞-128 mid-run resume |
| §6 多租户 SaaS | **补到最强**（配额拦截/会话即时失效/审计导出/Outbox/scope/同步） |
| §7 分阶段路线 | **必须落地**；Phase 1 跳过 1.1 READY，从 W∞-107 起切 |
| §8–10 | 按方案（测试策略/指标/对应关系）；指标按 100% 拉满 |
| 执行器 | 与 **DeepSeek Plan B** 无人值守配合；IDE 不并行写入 |

## Resolved (2026-08-15 — cost guard + prefer local LLM)

| Decision | Resolution |
| -------- | ---------- |
| J1 成本硬闸门 | **所有同类无人值守项目必须默认具备**：无授权切片 / 活跃 BLOCKED → **零 API 调用**；禁止 cold-start 复确认烧费；阻塞检测不得被文末历史 RESOLVED 误清。本仓已落地于 `scripts/unattended-scheduler.ps1` 等。 |
| J2 执行器优先序 | **优先本地大模型**（Ollama / LM Studio / 本机 OpenAI 兼容 endpoint）作为以后无人值守默认；云端 DeepSeek 等按量 API 仅备用且须主人明确打开。Cursor 云额度不作 24h 主执行器。 |
| J3 本仓当前 | Construction/Daemon 计划任务保持 **Disabled**；`DEEPSEEK_API_KEY` 已注释止损；恢复前须主人授权真实切片 + 选定本地或云端执行器。 |

## Current blockers

- **COST STOP ACTIVE（2026-08-15）** — 空转烧费事故后已停 DeepSeek；见 `OWNER_ALERT_UNATTENDED.md`。§5 READY 已由主人「开始第五节」解锁（首刀 W∞-125）。Human G1 UI sign-off still open.
