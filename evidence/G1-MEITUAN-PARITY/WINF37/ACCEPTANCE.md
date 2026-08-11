# G1-W∞-37 Channel + Circle dashboard visual/IA densify toward Meituan agent/circle PC (MP-03/MP-04)

- slice: `G1-R-CHANNEL-CIRCLE-DASHBOARD` densify（商用前提：完整对标）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering densify; MP-03/MP-04 toward PARITY; not owner G1 sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

### Channel `/ch/dashboard` (MP-03)

| Change | Habit |
| ------ | ----- |
| Yellow `topBar` | 推广员工具 · 渠道代理 + 代理/开通/刷新 |
| Gray canvas + white panels | agent PC density |
| `functionIcon` grid | 代理/开通/渠道/租户 |
| Custom metrics | 商户/开通/活跃/跟进信号 |
| Merchant queue cards | filters preserved |

### Circle `/bc/dashboard` (MP-04)

| Change | Habit |
| ------ | ----- |
| Yellow `topBar` | 推广员工具 · 商圈联盟 + 刷新 |
| Icon shortcuts | 商圈/渠道/租户/代理 |
| Custom metrics | 商圈/商户/行为/入口转化 |
| Circle detail cards | `<dt>入口转化</dt>` preserved |

## Boundaries preserved

- Channel: 不碰钱、不碰销售履约；无本平台成交漏斗
- Circle: 已确认入口转化 / 非本平台下单；无「已确认订单」

## Verify

```text
node --test tests/g1-winf37-channel-circle-dashboard-visual.test.mjs
node --test tests/g1-winf6-channel-agent.test.mjs
node --test tests/g1-winf18-admin-dashboards.test.mjs
pnpm --filter @oneday/platform-web typecheck && build
```
