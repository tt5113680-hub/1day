# G1-W∞-133 ACCEPTANCE — 会员到期提醒进通知中心（§2 会员 densify）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-MEMBER-RENEWAL-NOTIFICATION` / W∞-133
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2 会员「到期提醒」作业闭环 + MPC-13 通知中心
- executor: IDE Agent（接管收口；半成品来自 unattended）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；不复活 consumer_orders；不宣称全部商用

## Delivered

把会员到期/已过期/长期无活跃信号物化进管理通知中心，形成可筛选、可处置的 renewal 桶：

1. `ManagementNotificationService.materialize` 新增 `renewal` 类别：
   - `member_expiry`：临期 3 天 / 长期无活跃 90 天 / 从未活跃且入会≥120 天
   - `member_expired`：`expires_at < now()`
2. `counts.renewal` 现场计数；`deepLink` 允许 `/m/memberships`
3. `/m/notifications`：概况条 + 筛选 + 分布 + honest 文案含「会员到期/异常」
4. 早会 KPI 注记同步

## Evidence

- `node --test tests/g1-winf133-member-renewal-notification.test.mjs` → **1/1**
- `tests/management-notifications.test.mjs` + `g1-winf117` → **2/2**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49

## Honest boundaries

到期提醒仅为本地会员档案信号；不接美团/抖音；不含支付/储值/GMV/本平台下单。
