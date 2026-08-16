# G1-W∞-131 ACCEPTANCE — 读模型/缓存版本 READY 断言（§5 收口）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-READY-READ-MODEL-CACHE-VERSION` / W∞-131
- plan: `TENANT_ONE_CLICK_PROVISIONING_SPEC.md` §7 + `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §5
- executor: IDE Agent（本机）
- claim_boundary: 工程 PASS；§5 READY 工程收口；非主人 UI 签验；无 GMV；无储值/支付；不复活 consumer_orders；不宣称全部商用

## Delivered

READY 机器验收补齐读模型/缓存版本断言，并作为 §5 工程收口：

1. migration `078_storefront_read_model_cache` — 预热 published 指纹（bindingId:version:liveVersionId）+ ETag + cache_version
2. `warmStorefrontReadModelCache` 助手；开通发布与 Management publish/rollback 均 upsert
3. 开通时创建 **draft ≠ live** 版本 + preview token；delivery 暴露 published/preview 路径与缓存指纹
4. `PlatformOnboardingService.verify` 新增：
   - `published_read_consistent`
   - `preview_published_distinguishable`
   - `cache_version_consistent`
5. `/p/tenants/new` verification 清单 + 读模型缓存展示

## Evidence

- `node --test tests/g1-winf131-read-model-cache-version.test.mjs` → **2/2**
- page-p-003 + winf125..130 回归 → **16/16**（含本刀）
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49
- `pnpm db:migrate`（test）apply `078_storefront_read_model_cache`

## §5 close-out

W∞-125..131 覆盖 SPEC §5/§7 工程必需项（同 Run 渠道、三场景 QR、Owner 激活、中途 resume、Worker/Outbox、Circle 双审批可见性、读模型/缓存版本）。Phase4 连接器仍待 API/商务前提。

## Honest boundaries

读模型缓存仅为本地 published 版本指纹与 Consumer sync ETag 对齐；不调用美团/抖音；不含支付/GMV/本平台下单。
