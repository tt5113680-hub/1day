# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-89 四端 PARITY 关断复核收束（toward PARITY，禁止假 BI）：新增可复跑防护护栏 `tests/g1-winf89-four-terminal-parity-closeout.test.mjs`，把四端走完 W 波 densify 的主面统一纳入「美团成熟场景完整对标」关断守卫，把「商用前提 = 四端完整对标」在测试层落成可回归断言，防 densify 回退——Management MPC 22 主面（工作台/门店/商品/客户/会员/订单/评价/营销/分析/员工/角色权限/内容/装修/设置/通知 + 零星面 attribution/entry-funnel/connectors/external-actions/ai/permission-audit/circles）逐一断言 `推广员工具 · <label>` 黄顶栏 + summaryStrip + 诚实边界（非本平台下单/不代替平台成交/非本平台成交/不包含本平台收款/不伪造第三方/不宣称已接入/source=local/保留审批和审计记录），并对 offers/customers/memberships 三页 `page.module.css` 宽度列数 + ≤900px 两列堆叠断言；Employee ME 8 主面 + Consumer MH5 5 主面 + Platform/Channel/Circle 13 主面同类工具身份 + summaryStrip/hero/分布 + 诚实边界断言；`/m/workflows` 仅断言保持 `工作流整合` 定制身份不复刻美团。现有文件零改动（仅新增一个 test 文件），无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf89 6/6；`g1-winf*.test.mjs` 322/322；`pnpm typecheck` 20/20、`pnpm build` 20/20、单测 47 passed（2 个 pre-existing token/storefront-renderer 失败照旧）；新文件 eslint+prettier clean。诚实边界全保留（工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时）。See evidence/G1-MEITUAN-PARITY/WINF89/ACCEPTANCE.md.
- progress: 四端 W∞ 波已全部闭合（Management MPC W∞-45~88 全标对概况条/分布 + W∞-89 关断守卫 Codify 为可回归断言）。下一刀可推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE，均由主人签验），或按主人指示继续逐面密度 densify。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
