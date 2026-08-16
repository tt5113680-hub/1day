# G1-W∞-141 ACCEPTANCE — Employee 获客分享配对闭环 densify

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-EMPLOYEE-SHARE-PAIRING` / W∞-141（§2 其余 densify · L2 员工「发出分享」↔「打开分享」配对 · 回访，toward PARITY）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §9 `NEXT W∞-139+ §2 其余 densify` + `PRODUCT_DUAL_TRACK_STRATEGY.md` §2.1 L2（员工「发出分享」↔消费者「打开分享」配对）+ §2.2 漏斗（删除→进页→出站，分享发出→被打开→再进漏斗）
- executor: DeepSeek / Plan B（本轮）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；无资金托管；不接美团/抖音实时；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单

## Delivered

员工获客分享 `/e/share`（ME 获客分享码入口）从「仅每码 opens 计数」推进到 **发出↔打开↔进店↔出站↔回访** 可作业配对闭环，全部由已抓取真实 `entry_funnel_events` 档案行现场推导，禁止假 BI。这与「分享配对」L2 与「分享发出→被打开→再进漏斗」闭环对齐。

### 1. API `employee-share.service.ts`
- 新增只读 `pairing(context, id)`（employee scope fail-closed，先 `employee()` 校验 + `employee_share_codes` 按 `tenant+employee` 归属查询，越权 404）：
  - `totals`：`opens`（share_open）、`entryVisits`（visit）、`jumps`（jump）、`jumpConfirms`、`dwells`、`openSessions`（去重会话）、`revisits`（同一会话多次进入，`group by session_id having count(*) > 1`）、`openToVisitRate`、`openToJumpRate`
  - `byDate`（近 30 日逐日 opens/visits/jumps 时间序列）、`shareSentAt`（首条员工 share）、`pairings[]`（最近 12 条 share_open/visit/jump 痕迹：at/surface/device/session 截断）
  - `disclaimer` 诚实底注（仅统计至打开/进店/出站/停留入口痕迹 source=local；回访按同一会话多次进入提醒；不含支付金额与第三方订单履约）
  - 全部只读 `entry_funnel_events`，零 schema/表变更，不写库。
- `employee-share.controller.ts` 新增 `GET api/v1/employee/share-codes/:id/pairing`（`task.read`，fail-closed + x-request-id）。

### 2. UI `apps/employee-web/app/e/share/share-codes.tsx` + `share.module.css`
- 选中任一分享码 → 新增「分享配对明细」面板 `data-testid="share-pairing-panel"`：
  - 白卡概况条 `summaryStrip`（打开/进店/出站/回访）
  - 白卡分布面板「打开后去向分布」（打开→进店、打开→出站、回访 三条黄渐变 bar，`barWidth` 真实推导 + 百分比）
  - 「最近痕迹」列（`data-testid="share-pairing-row"`，打开/进店/出站 三色 mark）
  - 空态「暂无打开记录」 / loading / error 三态
  - honest 底注（`share-pairing-panel` 内 `pairNote`：仅统计至打开/进店/出站/停留入口痕迹 source=local；回访按同一会话再次进入提醒；不含支付金额、不含第三方订单履约、不代表第三方成交、非本平台下单）
- `share.module.css` 新增 `.pairNote/.pairingList/.pairingRow/.pairingMark(.open/.visit/.jump)`，与 `/e/share` 全标对视觉语言一致（summaryStrip/分布复用既有类）。

### 3. 诚实边界（保留）
`source=local`、仅统计至打开/进店/出站/停留等入口痕迹、回访按同一会话多次进入提醒、不含支付金额、不含第三方订单履约、不代表第三方成交、非本平台下单；不接美团/抖音实时；`/m/workflows` CUSTOM；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单。无 schema/DB/migration。

## Evidence commands

- `pnpm --filter @oneday/api typecheck` → clean；`pnpm --filter @oneday/employee-web typecheck` → clean；`pnpm typecheck` → 20/20
- `pnpm build` → 20/20（employee-web 含 `/e/share`）
- `pnpm test:unit` → 49/49
- `node --test --test-concurrency=1 tests/g1-winf141-employee-share-pairing.test.mjs` → **4/4**（3 静态 surface + 1 真实 DB round-trip：employee share code → share/share_open/visit/jump 痕迹落库 → GET pairing 返回 opens=2/entryVisits=2/jumps=1/openToVisitRate/openToJumpRate/revisits≥1/pairings 时间序列 → 越权 other-employee 码 404 拒绝 fail-closed）
- `node --test --test-concurrency=1 tests/g1-winf96-employee-share-parity.test.mjs` → 4/4 回归
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → 482/484（唯一 2 失败 = g1-winf88/89 既有 HEAD 基线，stash 对照证实与本刀无涉）
- `pnpm evidence:check` → 74/74
- 变更文件 eslint（0 errors）+ prettier clean

## Not owner sign-off
工程对标 PASS，不等于主人已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；未宣称已接美团/抖音实时，未宣称额外商用。
