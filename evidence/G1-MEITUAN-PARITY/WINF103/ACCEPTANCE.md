# G1-W∞-103 — Consumer discovery honest signals：entry_funnel_events 过滤列修正

- **status:** PASS (not product-owner sign-off)
- **date:** 2026-08-12
- **tests:** `tests/g1-winf103-consumer-discovery-honest-signals.test.mjs` 2/2 + `g1-winf*.test.mjs` 372/372

## Summary

承接 W∞-103（`consumer-discovery.service.ts` join `store_reviews` + 30 日 `entry_funnel_events` 入口 visit/view + `local_pilot` fallback + UI 诚实标签），修正一处**未被注意的 SQL 正确性缺陷**并收紧测试断言：

- **SQL 缺陷修复：** `membership/merchants` 商家的 `entry_visits_30d` 子查询（`discovery` 与 `search` 两处）原带 `and e.deleted_at is null` 过滤，而 `entry_funnel_events` 表（migration `058_entry_funnel`）**没有 `deleted_at` 列**（列结构止于 `occurred_at`/`created_at`），在真实数据库执行该子查询会抛「column e.deleted_at does not exist」，导致附近/搜索的 `entry_visits_30d` 跑不出正确值。已移除该两处不存在的 `deleted_at` 过滤，保留 `e.target_store_id` + `event_code in ('visit','view')` + `occurred_at` 30 天窗口。
- **测试断言修正：** 原 `assert.doesNotMatch(api, /entry_funnel_events e[\s\S]*deleted_at/)` 使用贪婪 `[\s\S]*`，因文件内 `search` 方法后续的 `stores s ... s.deleted_at is null` 等其它表的 `deleted_at` 被错误匹配，造成**误报**（即使修复后仍 fail）。改为**精确到每个 `entry_funnel_events` 子查询块**的断言：用 `matchAll` 抓出每一块 `from entry_funnel_events e ... ) as entry_visits_30d`，逐块断言不含 `deleted_at`；同时断言存在 ≥2 块子查询（discovery + search），确保两处都受保护、防未来有人把不存在的列加回去。

## Verification

- `tests/g1-winf103-consumer-discovery-honest-signals.test.mjs` **2/2**（API 断言 1 + UI 诚实标签 1 全绿）
- 全量回归 `tests/g1-winf*.test.mjs` **372/372**（W43/W89/90/91/92/93/94/95/96/97… 全通过，无随动回归）
- `pnpm typecheck` **20/20**（含 `@oneday/api` 与 `@oneday/consumer-web`）
- 变更文件 `apps/api/src/consumer-discovery.service.ts` + `tests/g1-winf103-*.test.mjs` eslint + prettier clean

诚实边界：`entry_visits_30d` 仅统计观看/访问（`visit`/`view`）入口痕迹，无支付/第三方履约/成交字段；`local_pilot` fallback 带 `ratingSource`/`salesSource` 诚实标注「试用分/试用月售」。不复活 consumer_orders / 本平台下单/收单。工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`，不宣称已接美团实时。
