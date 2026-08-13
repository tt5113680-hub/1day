# G1-W∞-111 ACCEPTANCE — 门店完整 CRUD + 三类触点二维码（MPC-02）

- recorded_at: 2026-08-13 Asia/Shanghai
- task: `G1-R-STORE-CRUD-QR` / W∞-111
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase2
- claim_boundary: 工程 PASS；非主人 UI 签验；§5 READY 未触碰；不含收款/支付/自营订单

## Delivered

1. migration `066_store_contact_qr_codes` — 租户×门店 商户码/门店码/员工码触点注册表
2. API `ManagementStoreDepth` — `POST/PUT/DELETE /api/v1/management/stores/depth` + `GET .../:id/qr-codes`（`tenant.manage` + 幂等创建 + audit/outbox）
3. Management `/m/stores` — 新建门店、门店资料维护、停用并移除、三类触点二维码（`qrcode` 渲染）
4. 修复：`organization_id` 映射；DELETE 空 body 不带 `content-type: application/json`；无人值守 `Stop-Job -Force` 兼容 PS5.1

## Evidence commands

- `node --test tests/g1-winf111-store-crud-qr.test.mjs` → 5/5
- `node --test tests/management-store-depth.test.mjs` → 1/1（真实 DB）
- `pnpm --filter @oneday/api --filter @oneday/management-web --filter @oneday/database --filter @oneday/contracts typecheck`
- `pnpm --filter @oneday/api build` + `pnpm --filter @oneday/management-web build`

## Honest boundaries

- 二维码 = 扫码分流入口 / 入口痕迹归因
- 不含本平台收款、不建立自营订单、不代第三方成交
- `/m/workflows` CUSTOM；§5 READY deferred
